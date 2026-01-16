"use client";

import React, { useState, useEffect } from "react";
import { Card, Button } from "@arenax/ui";
import { supabase } from "@arenax/database";
import { useRouter } from "next/navigation";

interface Venue {
    id: string;
    name: string;
    address: string;
    image_url?: string;
    facilities: string[];
    district?: string;
    opening_time?: string;
    closing_time?: string;
    latitude?: number;
    longitude?: number;
}

interface Court {
    id: string;
    name: string;
    sport_type: string;
    price_per_hour: number;
}

interface WizardState {
    selectedSport: string | null;
    matchType: string | null;
    selectedVenue: Venue | null;
    selectedCourt: Court | null;
    date: string;
    startTime: string;
    endTime: string;
    price: number;
    maxPlayers: number;
    searchQuery: string;
    matchFormat: string | null;
    teamName: string;
    teamLogo?: string;
    winningMode: string | null;
    teamRoster: string[];
    selectedTeamId?: string;
}

interface Friend {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url?: string;
    position?: string;
}

export const CreateMatchWizard = ({ userId, onClose }: { userId: string, onClose?: () => void }) => {
    const router = useRouter();
    const [state, setState] = useState<WizardState>({
        selectedSport: null,
        matchType: null,
        selectedVenue: null,
        selectedCourt: null,
        date: "",
        startTime: "",
        endTime: "",
        price: 0,
        maxPlayers: 10,
        searchQuery: "",
        matchFormat: null,
        teamName: "",
        teamLogo: "",
        winningMode: null,
        teamRoster: [],
        selectedTeamId: ""
    });

    const [nearbyMode, setNearbyMode] = useState(false);
    const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);

    const [friends, setFriends] = useState<Friend[]>([]);

    const [userTeam, setUserTeam] = useState<any>(null);

    useEffect(() => {
        const fetchTeamData = async () => {
            // 1. Fetch user's team
            const { data: membership, error: teamError } = await supabase
                .from('team_members')
                .select('team_id, teams(*)')
                .eq('user_id', userId)
                .maybeSingle();

            if (membership) {
                const teamData = membership.teams as any;
                setUserTeam(teamData);

                // 2. Fetch team members for roster
                const { data: members, error: membersError } = await supabase
                    .from('team_members')
                    .select('user_id')
                    .eq('team_id', membership.team_id);

                if (members) {
                    const memberIds = members.map(m => m.user_id);
                    setState(prev => ({
                        ...prev,
                        selectedTeamId: membership.team_id,
                        teamName: teamData.name,
                        teamLogo: teamData.logo_url,
                        teamRoster: memberIds
                    }));
                }
            }
        };

        const fetchFriends = async () => {
            const { data, error } = await supabase
                .from('friends')
                .select(`
                    friend_id,
                    profiles:friend_id (
                        id, first_name, last_name, avatar_url, position
                    )
                `)
                .eq('user_id', userId)
                .eq('status', 'accepted');

            if (data) {
                setFriends(data.map((item: any) => item.profiles));
            }
        };

        fetchTeamData();
        fetchFriends();
    }, [userId]);

    const [venues, setVenues] = useState<Venue[]>([]);
    const [loading, setLoading] = useState(false);

    // Fetch venues on mount
    useEffect(() => {
        const fetchVenues = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from('venues')
                .select('*');

            if (data) setVenues(data);
            if (error) console.error("Error fetching venues:", error);
            setLoading(false);
        };
        fetchVenues();
    }, []);

    const handleVenueSelect = (venue: Venue) => {
        setState(prev => ({ ...prev, selectedVenue: venue }));
    };

    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371e3; // Earth's radius in meters
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lon2 - lon1) * Math.PI / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c;
    };

    const handleFindNearby = () => {
        if (!navigator.geolocation) {
            alert("Geolocation is not supported by your browser");
            return;
        }

        setLoading(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setUserLocation({
                    lat: position.coords.latitude,
                    lon: position.coords.longitude
                });
                setNearbyMode(true);
                setLoading(false);
            },
            (error) => {
                console.error("Error getting location:", error);
                alert("Failed to get location: " + error.message);
                setLoading(false);
            }
        );
    };

    const filteredVenues = venues
        .filter(venue =>
            venue.name.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
            venue.address.toLowerCase().includes(state.searchQuery.toLowerCase())
        )
        .sort((a, b) => {
            if (nearbyMode && userLocation && a.latitude && a.longitude && b.latitude && b.longitude) {
                const distA = calculateDistance(userLocation.lat, userLocation.lon, a.latitude, a.longitude);
                const distB = calculateDistance(userLocation.lat, userLocation.lon, b.latitude, b.longitude);
                return distA - distB;
            }
            return 0;
        });


    const [courts, setCourts] = useState<Court[]>([]);
    const [loadingCourts, setLoadingCourts] = useState(false);

    useEffect(() => {
        if (state.selectedVenue) {
            const fetchCourts = async () => {
                setLoadingCourts(true);
                const { data, error } = await supabase
                    .from('courts')
                    .select('*')
                    .eq('venue_id', state.selectedVenue!.id);

                if (data) setCourts(data);
                if (error) console.error("Error fetching courts:", error);
                setLoadingCourts(false);
            };
            fetchCourts();
        }
    }, [state.selectedVenue]);

    const [bookedSlots, setBookedSlots] = useState<string[]>([]);
    const [loadingSlots, setLoadingSlots] = useState(false);

    useEffect(() => {
        if (state.selectedCourt && state.date) {
            const fetchBookings = async () => {
                setLoadingSlots(true);
                const { data, error } = await supabase
                    .from('bookings')
                    .select('start_time, end_time')
                    .eq('court_id', state.selectedCourt!.id)
                    .eq('date', state.date)
                    .neq('status', 'cancelled');

                if (data) {
                    const slots: string[] = [];
                    data.forEach((booking: any) => {
                        const start = parseInt(booking.start_time.split(':')[0]);
                        const end = parseInt(booking.end_time.split(':')[0]);
                        for (let i = start; i < end; i++) {
                            slots.push(`${i.toString().padStart(2, '0')}:00`);
                        }
                    });
                    setBookedSlots(slots);
                }
                if (error) console.error("Error fetching bookings:", error);
                setLoadingSlots(false);
            };
            fetchBookings();
        }
    }, [state.selectedCourt, state.date]);

    const generateTimeBlocks = () => {
        if (!state.selectedVenue?.opening_time || !state.selectedVenue?.closing_time) return [];

        const start = parseInt(state.selectedVenue.opening_time.split(':')[0]);
        const end = parseInt(state.selectedVenue.closing_time.split(':')[0]);
        const blocks = [];

        for (let i = start; i < end; i++) {
            const timeLabel = `${i.toString().padStart(2, '0')}:00`;
            const nextLabel = `${(i + 1).toString().padStart(2, '0')}:00`;
            blocks.push({
                id: timeLabel,
                label: `${timeLabel} - ${nextLabel}`,
                start: timeLabel,
                end: nextLabel,
                isBooked: bookedSlots.includes(timeLabel)
            });
        }
        return blocks;
    };

    const handleBlockSelect = (block: any) => {
        if (block.isBooked) return;

        if (!state.startTime || !state.endTime) {
            setState(prev => ({
                ...prev,
                startTime: block.start,
                endTime: block.end
            }));
            return;
        }

        const currentStart = parseInt(state.startTime.split(':')[0]);
        const currentEnd = parseInt(state.endTime.split(':')[0]);
        const blockStart = parseInt(block.start.split(':')[0]);
        const blockEnd = parseInt(block.end.split(':')[0]);

        // Check for adjacency to extend selection
        if (blockStart === currentEnd) {
            // Extend forward (e.g. [9-10] + [10-11] -> [9-11])
            setState(prev => ({
                ...prev,
                endTime: block.end
            }));
        } else if (blockEnd === currentStart) {
            // Extend backward (e.g. [10-11] + [9-10] -> [9-11])
            setState(prev => ({
                ...prev,
                startTime: block.start
            }));
        } else {
            // Not adjacent, reset selection to new block
            setState(prev => ({
                ...prev,
                startTime: block.start,
                endTime: block.end
            }));
        }
    };

    const isBlockSelected = (block: any) => {
        if (!state.startTime || !state.endTime) return false;
        const blockStart = parseInt(block.start.split(':')[0]);
        const selectedStart = parseInt(state.startTime.split(':')[0]);
        const selectedEnd = parseInt(state.endTime.split(':')[0]);

        return blockStart >= selectedStart && blockStart < selectedEnd;
    };
    const calculatePrices = () => {
        if (!state.selectedCourt || !state.startTime || !state.endTime || !state.maxPlayers) {
            return { totalCost: 0, pricePerPlayer: 0, upfrontPrice: 0, winPrice: 0, lossPrice: 0 };
        }

        const [startH, startM] = state.startTime.split(':').map(Number);
        const [endH, endM] = state.endTime.split(':').map(Number);

        let durationHours = (endH + endM / 60) - (startH + startM / 60);
        if (durationHours <= 0) durationHours += 24;

        const totalCost = durationHours * state.selectedCourt.price_per_hour;
        const basePrice = totalCost / state.maxPlayers;

        let upfrontPrice = basePrice;
        let winPrice = basePrice;
        let lossPrice = basePrice;

        if (state.winningMode === "Loser Pays All") {
            winPrice = 0;
            lossPrice = basePrice * 2;
        } else if (state.winningMode === "Winner 30% / Loser 70%") {
            winPrice = basePrice * 0.6;
            lossPrice = basePrice * 1.4;
        } else if (state.winningMode === "Winner 20% / Loser 80%") {
            winPrice = basePrice * 0.4;
            lossPrice = basePrice * 1.6;
        }

        return {
            totalCost: Math.round(totalCost * 100) / 100,
            pricePerPlayer: Math.round(basePrice * 100) / 100,
            upfrontPrice: Math.round(upfrontPrice * 100) / 100,
            winPrice: Math.round(winPrice * 100) / 100,
            lossPrice: Math.round(lossPrice * 100) / 100
        };
    };


    const handleCreateMatch = async () => {
        if (!state.selectedVenue || !state.selectedCourt) return;

        try {
            setLoading(true);

            // 1. Create Match
            const { data: matchData, error: matchError } = await supabase
                .from('matches')
                .insert({
                    creator_id: userId,
                    venue_id: state.selectedVenue.id,
                    court_id: state.selectedCourt.id,
                    sport: state.selectedSport,
                    match_type: state.matchType,
                    date: state.date,
                    start_time: state.startTime,
                    end_time: state.endTime,
                    price_per_player: calculatePrices().pricePerPlayer,
                    max_players: state.maxPlayers,
                    status: 'open',
                    match_format: state.matchFormat,
                    team_name: state.teamName,
                    winning_mode: state.winningMode,
                    team_roster: state.teamRoster
                })
                .select()
                .single();

            if (matchError) throw matchError;

            // 2. Create Booking
            const { error: bookingError } = await supabase
                .from('bookings')
                .insert({
                    court_id: state.selectedCourt.id,
                    venue_id: state.selectedVenue.id,
                    user_id: userId,
                    date: state.date,
                    start_time: state.startTime,
                    end_time: state.endTime,
                    status: 'confirmed',
                    match_id: matchData.id
                });

            if (bookingError) throw bookingError;

            // Send push notification to venue owner
            fetch('/api/notifications/new-booking', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    venueId: state.selectedVenue.id,
                    matchId: matchData.id,
                    date: state.date,
                    startTime: state.startTime,
                    endTime: state.endTime
                })
            }).catch(err => console.error("Error sending new booking notification:", err));

            alert("Match and Booking created successfully!");

            if (onClose) onClose();
            router.push(`/${userId}/matches`);

        } catch (error: any) {
            console.error("Error creating match:", error);
            alert(`Error: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };



    return (
        <div className="create-match-form-premium">
            <div className="form-header">
                <h1>Create New Match</h1>
                <p>Fill in the details below to host your match</p>
            </div>

            <div className="form-sections-container">
                {/* Section 1: Sport Selection */}
                <section className="form-section">
                    <div className="section-header">
                        <div className="section-number">1</div>
                        <div className="section-title">
                            <h2>Select Sport</h2>
                            <p>What are you playing today?</p>
                        </div>
                    </div>

                    <div className="selection-grid">
                        {["Football", "Futsal"].map(sport => (
                            <div
                                key={sport}
                                className={`market-card ${state.selectedSport === sport ? "selected" : ""}`}
                                onClick={() => setState(prev => ({ ...prev, selectedSport: sport, selectedCourt: null }))}
                            >
                                <div className="card-header">
                                    <div className="header-avatar">
                                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <circle cx="12" cy="12" r="10"></circle>
                                            <path d="M12 2a10 10 0 0 1 10 10 10 10 0 0 1-10 10 10 10 0 0 1-10-10 10 10 0 0 1 10-10z"></path>
                                            <path d="M12 2v20"></path>
                                            <path d="M2 12h20"></path>
                                        </svg>
                                    </div>
                                    <div className="header-info">
                                        <h3>{sport}</h3>
                                        <div className="type-badge primary">SPORT</div>
                                    </div>
                                </div>
                                <button className="card-action-btn">
                                    <span className="desktop-text">{state.selectedSport === sport ? "Selected" : `Select ${sport}`}</span>
                                    <span className="mobile-text">{state.selectedSport === sport ? "Selected" : "Select"}</span>
                                </button>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Section 2: Match Type Selection */}
                {state.selectedSport && (
                    <section className="form-section animate-in">
                        <div className="section-header">
                            <div className="section-number">2</div>
                            <div className="section-title">
                                <h2>Match Type</h2>
                                <p>Choose the type of match</p>
                            </div>
                        </div>

                        <div className="selection-grid">
                            {["Open Match", "Friendlies"].map(type => (
                                <div
                                    key={type}
                                    className={`market-card ${state.matchType === type ? "selected" : ""}`}
                                    onClick={() => setState(prev => ({ ...prev, matchType: type }))}
                                >
                                    <div className="card-header">
                                        <div className="header-info">
                                            <h3>{type}</h3>
                                            <div className="type-badge primary">TYPE</div>
                                        </div>
                                    </div>
                                    <button className="card-action-btn">
                                        {state.matchType === type ? "Selected" : "Select"}
                                    </button>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Section 2.5: Match Format (Friendlies Only) */}
                {state.matchType === "Friendlies" && (
                    <section className="form-section animate-in">
                        <div className="section-header">
                            <div className="section-number">2.5</div>
                            <div className="section-title">
                                <h2>Match Format</h2>
                                <p>Select the team size</p>
                            </div>
                        </div>

                        <div className="selection-grid">
                            {state.selectedSport === "Futsal" ? (
                                <div
                                    className={`market-card ${state.matchFormat === "5vs5" ? "selected" : ""}`}
                                    onClick={() => setState(prev => ({ ...prev, matchFormat: "5vs5", maxPlayers: 10 }))}
                                >
                                    <div className="card-header">
                                        <div className="header-info">
                                            <h3>5 vs 5</h3>
                                            <div className="type-badge primary">FORMAT</div>
                                        </div>
                                    </div>
                                    <button className="card-action-btn">
                                        {state.matchFormat === "5vs5" ? "Selected" : "Select 5vs5"}
                                    </button>
                                </div>
                            ) : (
                                ["7vs7", "9vs9", "11vs11"].map(format => (
                                    <div
                                        key={format}
                                        className={`market-card ${state.matchFormat === format ? "selected" : ""}`}
                                        onClick={() => {
                                            const totalPlayers = format === "7vs7" ? 14 : format === "9vs9" ? 18 : 22;
                                            setState(prev => ({ ...prev, matchFormat: format, maxPlayers: totalPlayers }));
                                        }}
                                    >
                                        <div className="card-header">
                                            <div className="header-info">
                                                <h3>{format}</h3>
                                                <div className="type-badge primary">FORMAT</div>
                                            </div>
                                        </div>
                                        <button className="card-action-btn">
                                            <span className="desktop-text">{state.matchFormat === format ? "Selected" : `Select ${format}`}</span>
                                            <span className="mobile-text">{state.matchFormat === format ? "Selected" : "Select"}</span>
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </section>
                )}

                {/* Section 3: Venue Selection */}
                {state.matchType && (
                    <section className="form-section animate-in">
                        <div className="section-header">
                            <div className="section-number">3</div>
                            <div className="section-title">
                                <h2>Select Venue</h2>
                                <p>Choose a location for your match</p>
                            </div>
                        </div>

                        <div className="search-section">
                            <div className="search-box-wrapper">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="11" cy="11" r="8"></circle>
                                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                                </svg>
                                <input
                                    type="text"
                                    placeholder="Search by venue name or location..."
                                    value={state.searchQuery}
                                    onChange={(e) => setState(prev => ({ ...prev, searchQuery: e.target.value }))}
                                />
                            </div>
                            <Button
                                variant="secondary"
                                className={`nearby-btn ${nearbyMode ? 'active' : ''}`}
                                onClick={handleFindNearby}
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
                                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                                    <circle cx="12" cy="10" r="3"></circle>
                                </svg>
                                {nearbyMode ? "Nearby Active" : "Find Nearby Venue"}
                            </Button>
                        </div>

                        <div className="selection-grid complex-grid custom-scrollbar">
                            {loading ? (
                                <div className="loading-state">
                                    <div className="spinner"></div>
                                    <span>Loading venues...</span>
                                </div>
                            ) : filteredVenues.length === 0 ? (
                                <div className="empty-state">
                                    <p>No venues found matching "{state.searchQuery}"</p>
                                </div>
                            ) : (
                                filteredVenues.map(venue => (
                                    <div
                                        key={venue.id}
                                        className={`market-card ${state.selectedVenue?.id === venue.id ? "selected" : ""}`}
                                        onClick={() => setState(prev => ({ ...prev, selectedVenue: venue }))}
                                    >
                                        <div className="card-header">
                                            <div className="header-avatar">
                                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                                                    <polyline points="9 22 9 12 15 12 15 22"></polyline>
                                                </svg>
                                            </div>
                                            <div className="header-info">
                                                <h3>{venue.name}</h3>
                                                <div className="type-badge primary">
                                                    VENUE <span>• {venue.district || "Location"}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="stats-grid">
                                            <div className="stat-box">
                                                <div className="label">RATING</div>
                                                <div className="value highlight">
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                                                    </svg>
                                                    4.8
                                                </div>
                                            </div>
                                            <div className="stat-box">
                                                <div className="label">PRICE RANGE</div>
                                                <div className="value">RM 50-120</div>
                                            </div>
                                            <div className="stat-box">
                                                <div className="label">LOCATION</div>
                                                <div className="value">
                                                    {nearbyMode && userLocation && venue.latitude && venue.longitude ? (
                                                        <span className="distance-badge">
                                                            {Math.round(calculateDistance(userLocation.lat, userLocation.lon, venue.latitude, venue.longitude) / 100) / 10}km
                                                        </span>
                                                    ) : (
                                                        venue.district || "Nearby"
                                                    )}
                                                </div>
                                            </div>
                                            <div className="stat-box">
                                                <div className="label">TREND</div>
                                                <div className="value highlight">+2.4%</div>
                                            </div>
                                        </div>

                                        <button className="card-action-btn">
                                            {state.selectedVenue?.id === venue.id ? "Selected" : "Select Venue"}
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </section>
                )}

                {/* Section 4: Court Selection */}
                {state.selectedVenue && (
                    <section className="form-section animate-in">
                        <div className="section-header">
                            <div className="section-number">4</div>
                            <div className="section-title">
                                <h2>Select Court</h2>
                                <p>Available courts at {state.selectedVenue.name}</p>
                            </div>
                        </div>

                        <div className="selection-grid complex-grid custom-scrollbar">
                            {loadingCourts ? (
                                <div className="loading-state">
                                    <div className="spinner"></div>
                                    <span>Loading courts...</span>
                                </div>
                            ) : courts.filter(c => c.sport_type === state.selectedSport).length === 0 ? (
                                <div className="empty-state">
                                    <p>No {state.selectedSport} courts available at this venue.</p>
                                </div>
                            ) : (
                                courts.filter(c => c.sport_type === state.selectedSport).map(court => (
                                    <div
                                        key={court.id}
                                        className={`market-card ${state.selectedCourt?.id === court.id ? "selected" : ""}`}
                                        onClick={() => setState(prev => ({ ...prev, selectedCourt: court }))}
                                    >
                                        <div className="card-header">
                                            <div className="header-avatar">
                                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <rect x="2" y="2" width="20" height="20" rx="2" ry="2"></rect>
                                                    <line x1="12" y1="2" x2="12" y2="22"></line>
                                                    <line x1="2" y1="12" x2="22" y2="12"></line>
                                                </svg>
                                            </div>
                                            <div className="header-info">
                                                <h3>{court.name}</h3>
                                                <div className="type-badge primary">
                                                    COURT <span>• {court.sport_type}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="stats-grid">
                                            <div className="stat-box">
                                                <div className="label">PRICE</div>
                                                <div className="value highlight">RM {court.price_per_hour}/hr</div>
                                            </div>
                                            <div className="stat-box">
                                                <div className="label">SURFACE</div>
                                                <div className="value">Synthetic</div>
                                            </div>
                                            <div className="stat-box">
                                                <div className="label">LIGHTING</div>
                                                <div className="value">Premium</div>
                                            </div>
                                            <div className="stat-box">
                                                <div className="label">TREND</div>
                                                <div className="value highlight">+4.1%</div>
                                            </div>
                                        </div>

                                        <button className="card-action-btn">
                                            {state.selectedCourt?.id === court.id ? "Selected" : "Select Court"}
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </section>
                )}

                {/* Section 5: Schedule & Details */}
                {state.selectedCourt && (
                    <section className="form-section animate-in">
                        <div className="section-header">
                            <div className="section-number">5</div>
                            <div className="section-title">
                                <h2>Schedule & Details</h2>
                                <p>When do you want to play?</p>
                            </div>
                        </div>

                        <div className="form-container">
                            <div className="form-group">
                                <label>Date</label>
                                <div className="input-wrapper">
                                    <input
                                        type="date"
                                        value={state.date}
                                        onChange={(e) => setState(prev => ({ ...prev, date: e.target.value }))}
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Select Time Slots</label>
                                <div className="time-slots-grid custom-scrollbar">
                                    {generateTimeBlocks().map(block => (
                                        <div
                                            key={block.id}
                                            className={`time-slot-card ${isBlockSelected(block) ? 'selected' : ''} ${block.isBooked ? 'booked' : ''}`}
                                            onClick={() => handleBlockSelect(block)}
                                        >
                                            <div className="slot-time">{block.start}</div>
                                            <div className="slot-status">
                                                {block.isBooked ? 'Booked' : isBlockSelected(block) ? 'Selected' : 'Available'}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <p className="text-xs text-muted mt-2" style={{ textAlign: 'right', color: 'var(--primary)' }}>
                                    {state.startTime && state.endTime ? `Selected: ${state.startTime} - ${state.endTime}` : 'Select a time range'}
                                </p>
                            </div>

                            <div className="form-group">
                                <label>Max Players</label>
                                <div className="input-wrapper">
                                    <input
                                        type="number"
                                        min="2"
                                        max="30"
                                        value={state.maxPlayers}
                                        onChange={(e) => setState(prev => ({ ...prev, maxPlayers: parseInt(e.target.value) }))}
                                    />
                                </div>
                            </div>
                        </div>
                    </section>
                )}

                {/* Section 6: Team Details (Friendlies Only) */}
                {state.matchType === "Friendlies" && state.selectedCourt && state.date && (
                    <section className="form-section animate-in">
                        <div className="section-header">
                            <div className="section-number">6</div>
                            <div className="section-title">
                                <h2>Team Details</h2>
                                <p>Setup your team</p>
                            </div>
                        </div>

                        <div className="form-container">
                            <div className="form-group">
                                <label>Team Name</label>
                                <div className="team-input-container">
                                    {state.teamLogo && (
                                        <div className="team-logo-preview-small">
                                            <img src={state.teamLogo} alt="Logo" />
                                        </div>
                                    )}
                                    <div className="input-wrapper">
                                        <input
                                            type="text"
                                            placeholder="Enter your team name"
                                            value={state.teamName}
                                            onChange={(e) => setState(prev => ({ ...prev, teamName: e.target.value, selectedTeamId: "" }))}
                                        />
                                    </div>
                                </div>
                                {userTeam && state.selectedTeamId !== userTeam.id && (
                                    <Button
                                        variant="secondary"
                                        className="mt-2"
                                        onClick={() => setState(prev => ({
                                            ...prev,
                                            selectedTeamId: userTeam.id,
                                            teamName: userTeam.name,
                                            teamLogo: userTeam.logo_url
                                        }))}
                                    >
                                        Use My Team: {userTeam.name}
                                    </Button>
                                )}
                            </div>

                            <div className="form-group">
                                <label>Add Friends to Roster ({state.teamRoster.length} selected)</label>
                                <p className="text-xs text-muted mb-2">
                                    Need {state.matchFormat ? parseInt(state.matchFormat) : 0} players + 3 subs
                                </p>
                                <div className="friends-selection-grid custom-scrollbar" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                    {friends.map(friend => (
                                        <div
                                            key={friend.id}
                                            className={`friend-select-card ${state.teamRoster.includes(friend.id) ? 'selected' : ''}`}
                                            onClick={() => {
                                                setState(prev => {
                                                    const newRoster = prev.teamRoster.includes(friend.id)
                                                        ? prev.teamRoster.filter(id => id !== friend.id)
                                                        : [...prev.teamRoster, friend.id];
                                                    return { ...prev, teamRoster: newRoster };
                                                });
                                            }}
                                        >
                                            <div className="friend-avatar">
                                                {friend.avatar_url ? (
                                                    <img src={friend.avatar_url} alt={friend.first_name} />
                                                ) : (
                                                    <div className="avatar-placeholder">{friend.first_name[0]}</div>
                                                )}
                                            </div>
                                            <div className="friend-info">
                                                <span>{friend.first_name} {friend.last_name}</span>
                                                <span className="text-xs text-muted">{friend.position || 'Player'}</span>
                                            </div>
                                            <div className="checkbox">
                                                {state.teamRoster.includes(friend.id) && (
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                                        <polyline points="20 6 9 17 4 12"></polyline>
                                                    </svg>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </section>
                )}

                {/* Section 7: Winning Mode (Friendlies Only) */}
                {state.matchType === "Friendlies" && state.teamName && (
                    <section className="form-section animate-in">
                        <div className="section-header">
                            <div className="section-number">7</div>
                            <div className="section-title">
                                <h2>Winning Mode</h2>
                                <p>Set the stakes</p>
                            </div>
                        </div>

                        <div className="selection-grid">
                            {["Pay 50/50", "Loser Pays All", "Winner 30% / Loser 70%", "Winner 20% / Loser 80%"].map(mode => (
                                <div
                                    key={mode}
                                    className={`market-card ${state.winningMode === mode ? "selected" : ""}`}
                                    onClick={() => setState(prev => ({ ...prev, winningMode: mode }))}
                                >
                                    <div className="card-header">
                                        <div className="header-info">
                                            <h3>{mode}</h3>
                                            <div className="type-badge primary">STAKES</div>
                                        </div>
                                    </div>
                                    <button className="card-action-btn">
                                        {state.winningMode === mode ? "Selected" : "Select"}
                                    </button>
                                </div>
                            ))}
                        </div>

                        {state.winningMode && state.winningMode !== "Pay 50/50" && (
                            <div className="winning-mode-notice animate-in">
                                <div className="notice-icon">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="12" cy="12" r="10"></circle>
                                        <line x1="12" y1="16" x2="12" y2="12"></line>
                                        <line x1="12" y1="8" x2="12.01" y2="8"></line>
                                    </svg>
                                </div>
                                <div className="notice-content">
                                    <p><strong>Nota Penting:</strong> Untuk pilihan selain 50/50, anda perlu membayar harga penuh terlebih dahulu. Jika anda menang, bayaran tersebut akan dikembalikan semula ke dalam wallet anda.</p>
                                </div>
                            </div>
                        )}
                    </section>
                )}

                {/* Submit Section */}
                {state.selectedCourt && state.date && state.startTime && state.endTime && (
                    <div className="submit-section animate-in">
                        <div className="price-summary">
                            <div className="price-item">
                                <span className="label">Total Court Fee</span>
                                <span className="value secondary">RM {calculatePrices().totalCost.toFixed(2)}</span>
                            </div>
                            {state.winningMode && state.winningMode !== "Pay 50/50" ? (
                                <>
                                    <div className="price-item">
                                        <span className="label">Upfront Price</span>
                                        <span className="value">RM {calculatePrices().upfrontPrice.toFixed(2)}</span>
                                    </div>
                                    <div className="price-grid-mini">
                                        <div className="price-item">
                                            <span className="label">Win Price</span>
                                            <span className="value mini success">RM {calculatePrices().winPrice.toFixed(2)}</span>
                                        </div>
                                        <div className="price-item">
                                            <span className="label">Loss Price</span>
                                            <span className="value mini danger">RM {calculatePrices().lossPrice.toFixed(2)}</span>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="price-item">
                                    <span className="label">Price per Player</span>
                                    <span className="value">RM {calculatePrices().pricePerPlayer.toFixed(2)}</span>
                                </div>
                            )}
                        </div>
                        <Button
                            variant="primary"
                            onClick={handleCreateMatch}
                            disabled={loading}
                            className="submit-btn"
                        >
                            {loading ? "Creating..." : "Create Match Now"}
                        </Button>
                    </div>
                )}
            </div>

            <style jsx>{`
                .create-match-form-premium {
                    max-width: 1000px;
                    margin: 0 auto;
                    padding: 1.5rem 1rem;
                    color: var(--text);
                }

                .form-header {
                    margin-bottom: 2.5rem;
                    text-align: left;
                }

                .form-header h1 {
                    font-family: var(--font-outfit), sans-serif;
                    font-size: 3.5rem;
                    font-weight: 900;
                    margin-bottom: 0.5rem;
                    letter-spacing: -0.04em;
                    background: linear-gradient(180deg, #ffffff 20%, #888888 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));
                }

                .form-header p {
                    font-size: 1rem;
                    color: var(--text-muted);
                }

                .form-sections-container {
                    display: flex;
                    flex-direction: column;
                    gap: 3rem;
                }

                .form-section {
                    background: rgba(255, 255, 255, 0.02);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    border-radius: 32px;
                    padding: 2rem;
                    backdrop-filter: blur(20px);
                }

                .section-header {
                    display: flex;
                    gap: 1.25rem;
                    margin-bottom: 2rem;
                    align-items: center;
                }

                .section-number {
                    width: 36px;
                    height: 36px;
                    background: var(--primary);
                    color: #000;
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1.1rem;
                    font-weight: 900;
                    box-shadow: 0 0 20px var(--primary-glow);
                    flex-shrink: 0;
                }

                .section-title h2 {
                    font-size: 1.5rem;
                    font-weight: 800;
                    margin-bottom: 0.25rem;
                }

                .section-title p {
                    font-size: 0.9rem;
                    color: var(--text-muted);
                }

                .search-section {
                    display: flex;
                    gap: 1rem;
                    margin-bottom: 2rem;
                }

                .search-box-wrapper {
                    flex: 1;
                    display: flex;
                    align-items: center;
                    background: rgba(255, 255, 255, 0.03);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 16px;
                    padding: 0.85rem 1.25rem;
                    gap: 0.75rem;
                    transition: all 0.3s ease;
                }

                .nearby-btn {
                    white-space: nowrap;
                    height: 54px;
                    border-radius: 14px !important;
                    display: flex;
                    align-items: center;
                    padding: 0 1.5rem !important;
                }

                .nearby-btn.active {
                    background: rgba(0, 158, 96, 0.1) !important;
                    color: var(--primary) !important;
                    border: 1px solid var(--primary) !important;
                }

                .distance-badge {
                    color: var(--primary);
                    font-weight: 700;
                }

                @media (max-width: 768px) {
                    .search-section {
                        flex-direction: column;
                    }
                    .nearby-btn {
                        width: 100%;
                    }
                }

                .search-box-wrapper:focus-within {
                    border-color: var(--primary);
                    background: rgba(255, 255, 255, 0.05);
                    box-shadow: 0 0 20px rgba(57, 255, 20, 0.1);
                }

                .search-box-wrapper input {
                    background: none;
                    border: none;
                    color: #fff;
                    width: 100%;
                    outline: none;
                    font-size: 1rem;
                }

                .selection-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
                    gap: 1.5rem;
                    margin-top: 0.5rem;
                }

                @media (max-width: 768px) {
                    .selection-grid {
                        grid-template-columns: 1fr 1fr;
                        gap: 0.25rem;
                    }
                }

                .market-card {
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 24px;
                    padding: 1.5rem;
                    cursor: pointer;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    position: relative;
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                    gap: 1.5rem;
                }

                @media (max-width: 768px) {
                    .complex-grid {
                        grid-template-columns: 1fr !important;
                    }
                }

                .time-slots-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
                    gap: 0.75rem;
                    max-height: 300px;
                    overflow-y: auto;
                    padding: 0.5rem;
                    background: rgba(0, 0, 0, 0.2);
                    border-radius: 12px;
                    margin-top: 0.5rem;
                }

                .time-slot-card {
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 8px;
                    padding: 0.75rem;
                    text-align: center;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }

                .time-slot-card:hover:not(.booked) {
                    background: rgba(255, 255, 255, 0.1);
                    transform: translateY(-2px);
                }

                .time-slot-card.selected {
                    background: var(--primary);
                    color: #000;
                    border-color: var(--primary);
                    box-shadow: 0 0 15px var(--primary-glow);
                }

                .time-slot-card.booked {
                    opacity: 0.5;
                    cursor: not-allowed;
                    background: rgba(255, 0, 0, 0.1);
                    border-color: rgba(255, 0, 0, 0.2);
                }

                .slot-time {
                    font-weight: 700;
                    font-size: 1rem;
                    margin-bottom: 0.25rem;
                }

                .slot-status {
                    font-size: 0.7rem;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                    background: rgba(255, 255, 255, 0.03);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    border-radius: 24px;
                    padding: 1.5rem;
                    display: flex;
                    flex-direction: column;
                    gap: 1.5rem;
                    transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
                    cursor: pointer;
                    position: relative;
                }

                .market-card:hover {
                    transform: translateY(-6px);
                    background: rgba(255, 255, 255, 0.05);
                    border-color: rgba(255, 255, 255, 0.1);
                }

                .market-card.selected {
                    border-color: var(--primary);
                    background: rgba(0, 158, 96, 0.05);
                    box-shadow: 0 0 30px rgba(0, 158, 96, 0.1);
                }

                .card-header {
                    display: flex;
                    gap: 1rem;
                    align-items: center;
                }

                .header-avatar {
                    width: 48px;
                    height: 48px;
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 14px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: var(--primary);
                    flex-shrink: 0;
                }

                .header-info h3 {
                    font-size: 1.1rem;
                    font-weight: 800;
                    margin-bottom: 0.15rem;
                }

                .type-badge {
                    font-size: 0.7rem;
                    font-weight: 900;
                    letter-spacing: 0.05em;
                    color: var(--primary);
                }

                .card-action-btn .mobile-text {
                    display: none;
                }

                @media (max-width: 768px) {
                    .card-action-btn .desktop-text {
                        display: none;
                    }
                    .card-action-btn .mobile-text {
                        display: inline;
                    }
                    .market-card {
                        padding: 0.75rem;
                        gap: 0.75rem;
                        border-radius: 16px;
                    }
                    .header-avatar {
                        width: 28px;
                        height: 28px;
                        border-radius: 8px;
                    }
                    .header-avatar svg {
                        width: 18px;
                        height: 18px;
                    }
                    .header-info h3 {
                        font-size: 0.85rem;
                        letter-spacing: -0.01em;
                    }
                    .type-badge {
                        font-size: 0.6rem;
                    }
                    .card-action-btn {
                        padding: 0.4rem;
                        font-size: 0.75rem;
                        border-radius: 8px;
                    }
                }

                .type-badge span {
                    color: var(--text-muted);
                }

                .stats-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 0.75rem;
                }

                .stat-box {
                    background: rgba(255, 255, 255, 0.02);
                    padding: 0.75rem;
                    border-radius: 12px;
                    display: flex;
                    flex-direction: column;
                    gap: 0.25rem;
                }

                .winning-mode-notice {
                    margin-top: 1.5rem;
                    padding: 1.25rem;
                    background: rgba(0, 158, 96, 0.05);
                    border: 1px solid rgba(0, 158, 96, 0.2);
                    border-radius: 16px;
                    display: flex;
                    gap: 1rem;
                    align-items: flex-start;
                }

                .notice-icon {
                    color: var(--primary);
                    flex-shrink: 0;
                    margin-top: 2px;
                }

                .notice-content p {
                    font-size: 0.9rem;
                    color: var(--text-muted);
                    line-height: 1.5;
                    margin: 0;
                }

                .notice-content strong {
                    color: var(--primary);
                }

                .stat-box .label {
                    font-size: 0.6rem;
                    font-weight: 900;
                    color: var(--text-muted);
                    text-transform: uppercase;
                }

                .stat-box .value {
                    font-size: 0.9rem;
                    font-weight: 800;
                }

                .stat-box .value.highlight {
                    color: var(--primary);
                }

                .card-action-btn {
                    width: 100%;
                    padding: 0.75rem;
                    border-radius: 12px;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    background: rgba(255, 255, 255, 0.05);
                    color: #fff;
                    font-weight: 800;
                    font-size: 0.9rem;
                    transition: all 0.3s ease;
                }

                .market-card.selected .card-action-btn {
                    background: var(--primary);
                    color: #000;
                    border-color: var(--primary);
                }

                .form-container {
                    display: flex;
                    flex-direction: column;
                    gap: 1.5rem;
                    max-width: 500px;
                }

                .form-group {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }

                .form-group label {
                    font-size: 0.8rem;
                    font-weight: 800;
                    color: var(--text-muted);
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }

                .input-wrapper {
                    background: rgba(255, 255, 255, 0.03);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 12px;
                    padding: 0.85rem 1rem;
                }

                .input-wrapper input {
                    background: none;
                    border: none;
                    color: #fff;
                    width: 100%;
                    outline: none;
                    font-size: 1rem;
                    font-family: inherit;
                }

                .form-row {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 1.5rem;
                }

                @media (max-width: 768px) {
                    .form-row {
                        grid-template-columns: 1fr;
                        gap: 1rem;
                    }
                }

                .submit-section {
                    margin-top: 2rem;
                    padding: 2.5rem;
                    background: linear-gradient(135deg, rgba(0, 158, 96, 0.1) 0%, transparent 100%);
                    border: 1px solid rgba(0, 158, 96, 0.2);
                    border-radius: 32px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .price-summary {
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                }

                .price-item {
                    display: flex;
                    flex-direction: column;
                    gap: 0.25rem;
                }

                .price-summary .label {
                    font-size: 0.9rem;
                    color: var(--text-muted);
                    font-weight: 600;
                }

                .price-summary .value {
                    font-size: 2rem;
                    font-weight: 900;
                    color: var(--primary);
                    text-shadow: 0 0 20px var(--primary-glow);
                }

                .price-summary .value.secondary {
                    font-size: 1.25rem;
                    color: #fff;
                    text-shadow: none;
                    opacity: 0.8;
                }

                .price-grid-mini {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 1rem;
                    background: rgba(255, 255, 255, 0.03);
                    padding: 0.75rem;
                    border-radius: 12px;
                    border: 1px solid rgba(255, 255, 255, 0.05);
                }

                .price-summary .value.mini {
                    font-size: 1.25rem;
                }

                .price-summary .value.success {
                    color: var(--primary);
                }

                .price-summary .value.danger {
                    color: #ff4d4d;
                    text-shadow: 0 0 20px rgba(255, 77, 77, 0.2);
                }

                .submit-btn {
                    padding: 1rem 2.5rem !important;
                    font-size: 1.1rem !important;
                    height: auto !important;
                }

                .animate-in {
                    animation: slideUp 0.6s cubic-bezier(0.23, 1, 0.32, 1) forwards;
                }

                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 10px;
                }

                @media (max-width: 768px) {
                    .create-match-form-premium {
                        padding: 1rem 0;
                    }
                    .form-header h1 { 
                        font-size: 2.2rem; 
                        letter-spacing: -0.02em;
                    }
                    .form-header p {
                        font-size: 0.9rem;
                    }
                    .form-section { 
                        padding: 1.25rem 0; 
                        border-radius: 24px;
                    }
                    .section-header {
                        gap: 0.75rem;
                        margin-bottom: 1.5rem;
                    }
                    .section-title h2 {
                        font-size: 1.25rem;
                    }
                    .selection-grid {
                        gap: 0.25rem;
                    }
                    .submit-section { 
                        flex-direction: column; 
                        gap: 1.5rem; 
                        text-align: center; 
                        padding: 1.5rem; 
                        border-radius: 24px;
                    }
                    .form-row { grid-template-columns: 1fr; }
                    .price-summary .value { font-size: 1.75rem; }
                    .price-summary .value.secondary { font-size: 1.1rem; }
                    .price-summary { gap: 0.75rem; }
                    .form-container {
                        max-width: 100%;
                    }
                }

                .friends-selection-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                    gap: 1rem;
                }

                .friend-select-card {
                    background: rgba(255, 255, 255, 0.03);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 12px;
                    padding: 0.75rem;
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }

                .friend-select-card:hover {
                    background: rgba(255, 255, 255, 0.05);
                }

                .friend-select-card.selected {
                    background: rgba(0, 158, 96, 0.1);
                    border-color: var(--primary);
                }

                .friend-avatar {
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    overflow: hidden;
                    background: #000;
                }
                
                .friend-avatar img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }

                .friend-avatar .avatar-placeholder {
                    width: 100%;
                    height: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #fff;
                    font-weight: 700;
                    font-size: 0.8rem;
                }

                .friend-info {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                }

                .friend-info span {
                    font-size: 0.9rem;
                    font-weight: 600;
                    color: #fff;
                }

                .friend-info .text-muted {
                    color: var(--text-muted);
                    font-size: 0.75rem;
                }

                .checkbox {
                    width: 20px;
                    height: 20px;
                    border-radius: 6px;
                    border: 2px solid rgba(255, 255, 255, 0.2);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: var(--primary);
                }

                .friend-select-card.selected .checkbox {
                    border-color: var(--primary);
                    background: rgba(0, 158, 96, 0.2);
                }

                .match-type-tabs {
                    display: flex;
                    gap: 3rem;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                    margin-bottom: 2rem;
                    padding-left: 1rem;
                }

                .tab-item {
                    padding: 1rem 0;
                    font-size: 1.2rem;
                    font-weight: 800;
                    color: var(--text-muted);
                    cursor: pointer;
                    position: relative;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    transition: all 0.3s ease;
                }

                .tab-item:hover {
                    color: #fff;
                }

                .tab-item.active {
                    color: var(--primary);
                    text-shadow: 0 0 15px var(--primary-glow);
                }

                .tab-item.active::after {
                    content: '';
                    position: absolute;
                    bottom: -1px;
                    left: 0;
                    width: 100%;
                    height: 4px;
                    background: var(--primary);
                    box-shadow: 0 -2px 10px var(--primary-glow);
                    border-radius: 4px 4px 0 0;
                }

                .time-slots-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
                    gap: 0.75rem;
                    max-height: 300px;
                    overflow-y: auto;
                    padding: 0.5rem;
                    background: rgba(0, 0, 0, 0.2);
                    border-radius: 12px;
                    margin-top: 0.5rem;
                }

                .time-slot-card {
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 8px;
                    padding: 0.75rem;
                    text-align: center;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }

                .time-slot-card:hover:not(.booked) {
                    background: rgba(255, 255, 255, 0.1);
                    transform: translateY(-2px);
                }

                .time-slot-card.selected {
                    background: var(--primary);
                    color: #000;
                    border-color: var(--primary);
                    box-shadow: 0 0 15px var(--primary-glow);
                }

                .time-slot-card.booked {
                    opacity: 0.5;
                    cursor: not-allowed;
                    background: rgba(255, 0, 0, 0.1);
                    border-color: rgba(255, 0, 0, 0.2);
                }

                .slot-time {
                    font-weight: 700;
                    font-size: 1rem;
                    margin-bottom: 0.25rem;
                }

                .slot-status {
                    font-size: 0.7rem;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }

                .team-input-container {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                }

                .team-logo-preview-small {
                    width: 40px;
                    height: 40px;
                    border-radius: 8px;
                    overflow: hidden;
                    border: 1px solid var(--primary);
                }

                .team-logo-preview-small img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }

                .mt-2 {
                    margin-top: 0.5rem;
                }
            `}</style>
        </div >
    );
};
