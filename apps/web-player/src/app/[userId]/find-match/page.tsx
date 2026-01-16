"use client";

import React, { useState, useEffect } from "react";
import { Card, Button } from "@arenax/ui";
import { supabase, Match } from "@arenax/database";
import { useRouter, useParams } from "next/navigation";
import { useCreateMatch } from "../../../contexts/CreateMatchContext";


export default function FindMatchPage() {
    const router = useRouter();
    const params = useParams();
    const userId = params.userId as string;
    const [matches, setMatches] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<string>("All");
    const [searchQuery, setSearchQuery] = useState("");
    const [joiningId, setJoiningId] = useState<string | null>(null);
    const { openCreateMatchModal } = useCreateMatch();

    const fetchMatches = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('matches')
                .select(`
                    *,
                    venues (name, district),
                    courts (name)
                `)
                .eq('status', 'open')
                .order('date', { ascending: true });

            if (error) throw error;
            setMatches(data || []);
        } catch (error) {
            console.error("Error fetching matches:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMatches();
    }, []);

    const handleJoinMatch = async (matchId: string) => {
        setJoiningId(matchId);
        try {
            // 1. Check if already joined
            const { data: existing, error: checkError } = await supabase
                .from('match_players')
                .select('id')
                .eq('match_id', matchId)
                .eq('player_id', userId)
                .maybeSingle();

            if (checkError) throw checkError;
            if (existing) {
                alert("You have already joined this match!");
                return;
            }

            // 2. Join Match
            const { error: joinError } = await supabase
                .from('match_players')
                .insert({
                    match_id: matchId,
                    player_id: userId
                });

            if (joinError) throw joinError;

            // 3. Increment player count
            const match = matches.find(m => m.id === matchId);
            const { error: updateError } = await supabase
                .from('matches')
                .update({
                    current_players: (match.current_players || 0) + 1,
                    status: (match.current_players + 1) >= match.max_players ? 'full' : 'open'
                })
                .eq('id', matchId);

            if (updateError) throw updateError;

            // 4. Send Notification to Creator
            try {
                await fetch('/api/notifications/match-join', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ matchId, joinerId: userId })
                });
            } catch (notiError) {
                console.error("Failed to send join notification:", notiError);
            }

            alert("Successfully joined the match!");
            fetchMatches(); // Refresh list
        } catch (error: any) {
            console.error("Error joining match:", error);
            alert("Failed to join match: " + error.message);
        } finally {
            setJoiningId(null);
        }
    };

    const filteredMatches = matches.filter(m => {
        const matchesSport = filter === "All" || m.sport === filter;
        const matchesSearch = m.venues?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            m.venues?.district?.toLowerCase().includes(searchQuery.toLowerCase());

        // Filter out expired matches
        const now = new Date();
        const matchEnd = new Date(`${m.date}T${m.end_time}`);
        const isExpired = now > matchEnd;

        return matchesSport && matchesSearch && !isExpired;
    });

    return (
        <div className="matches-container">
            <header className="page-header">
                <div className="header-content">
                    <h1>Find Your Next Match</h1>
                    <p>Browse available matches and join the action.</p>
                </div>
                <div className="header-actions">
                    <Button variant="primary" onClick={openCreateMatchModal}>Create Match</Button>
                </div>
            </header>

            <div className="filters-section">
                <div className="filter-chips">
                    {["All", "Futsal", "Football"].map(sport => (
                        <button
                            key={sport}
                            className={`filter-chip ${filter === sport ? 'active' : ''}`}
                            onClick={() => setFilter(sport)}
                        >
                            {sport}
                        </button>
                    ))}
                </div>
                <div className="search-box">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                    <input
                        type="text"
                        placeholder="Search by venue or location..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            <div className="matches-grid">
                {loading ? (
                    <div className="loading-state">Loading matches...</div>
                ) : filteredMatches.length === 0 ? (
                    <div className="empty-state">No matches found.</div>
                ) : (
                    filteredMatches.map(match => (
                        <Card key={match.id} className="match-card" variant="glass">
                            <div className="match-card-header">
                                <div className={`sport-tag ${match.sport.toLowerCase()}`}>
                                    {match.sport}
                                </div>
                                <div className="match-price">
                                    RM {Number(match.price_per_player).toFixed(2)} <span>/ player</span>
                                </div>
                            </div>

                            <div className="match-card-body">
                                <h3 className="venue-name">
                                    {match.match_type === 'Friendlies' && match.team_name
                                        ? `${match.team_name} vs ???`
                                        : match.venues?.name}
                                </h3>
                                <div className="venue-location">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                                        <circle cx="12" cy="10" r="3"></circle>
                                    </svg>
                                    {match.venues?.district}
                                </div>
                                <div className="match-info">
                                    <div className="info-item">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                            <line x1="16" y1="2" x2="16" y2="6"></line>
                                            <line x1="8" y1="2" x2="8" y2="6"></line>
                                            <line x1="3" y1="10" x2="21" y2="10"></line>
                                        </svg>
                                        {new Date(match.date).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </div>
                                    <div className="info-item">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <circle cx="12" cy="12" r="10"></circle>
                                            <polyline points="12 6 12 12 16 14"></polyline>
                                        </svg>
                                        {match.start_time.substring(0, 5)} - {match.end_time.substring(0, 5)}
                                    </div>
                                </div>

                                <div className="player-count">
                                    <div className="count-bar">
                                        <div
                                            className="count-progress"
                                            style={{ width: `${((match.current_players || 0) / match.max_players) * 100}%` }}
                                        ></div>
                                    </div>
                                    <div className="count-text">
                                        {match.current_players || 0} / {match.max_players} Players Joined
                                    </div>
                                </div>
                            </div>

                            <div className="match-card-footer">
                                <Button
                                    variant="primary"
                                    style={{ width: '100%' }}
                                    disabled={joiningId === match.id || match.current_players >= match.max_players}
                                    onClick={() => handleJoinMatch(match.id)}
                                >
                                    {joiningId === match.id ? "Joining..." : match.current_players >= match.max_players ? "Full" : "Join Match"}
                                </Button>
                            </div>
                        </Card>
                    ))
                )}
            </div>

            <style jsx>{`
                .matches-container {
                    display: flex;
                    flex-direction: column;
                    gap: var(--space-lg);
                }
                .page-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .page-header h1 {
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
                .page-header p {
                    color: var(--text-muted);
                }
                .filters-section {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: var(--space-md);
                    background: var(--surface);
                    padding: 1rem;
                    border-radius: var(--radius-md);
                    border: 1px solid var(--glass-border);
                }
                .filter-chips {
                    display: flex;
                    gap: 0.75rem;
                }
                .filter-chip {
                    padding: 0.6rem 1.2rem;
                    border-radius: 30px;
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid var(--glass-border);
                    color: var(--text-muted);
                    font-weight: 600;
                    font-size: 0.9rem;
                    transition: var(--transition);
                }
                .filter-chip:hover {
                    background: var(--surface-hover);
                    color: var(--text);
                }
                .filter-chip.active {
                    background: var(--primary);
                    color: #000;
                    border-color: var(--primary);
                    box-shadow: 0 0 15px var(--primary-glow);
                }
                .search-box {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    background: rgba(0, 0, 0, 0.2);
                    padding: 0.6rem 1rem;
                    border-radius: var(--radius-sm);
                    border: 1px solid var(--glass-border);
                    width: 300px;
                }
                .search-box input {
                    background: none;
                    border: none;
                    color: var(--text);
                    outline: none;
                    width: 100%;
                }
                .matches-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
                    gap: var(--space-md);
                }
                .match-card {
                    display: flex;
                    flex-direction: column;
                    height: 100%;
                }
                .match-card-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 1.5rem;
                }
                .sport-tag {
                    padding: 0.4rem 0.8rem;
                    border-radius: 6px;
                    font-size: 0.75rem;
                    font-weight: 800;
                    text-transform: uppercase;
                }
                .sport-tag.futsal { background: rgba(0, 158, 96, 0.1); color: var(--primary); }
                .sport-tag.football { background: rgba(0, 112, 66, 0.1); color: var(--secondary); }
                
                .match-price {
                    font-size: 1.1rem;
                    font-weight: 700;
                    color: #fff;
                }
                .match-price span {
                    font-size: 0.8rem;
                    color: var(--text-muted);
                    font-weight: 400;
                }
                .venue-name {
                    font-size: 1.25rem;
                    margin-bottom: 0.25rem;
                    color: #fff;
                }
                .venue-location {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    font-size: 0.85rem;
                    color: var(--primary);
                    margin-bottom: 1.25rem;
                    font-weight: 600;
                }
                .match-info {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                    margin-bottom: 1.5rem;
                }
                .info-item {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    font-size: 0.9rem;
                    color: var(--text-muted);
                }
                .player-count {
                    margin-top: auto;
                }
                .count-bar {
                    height: 6px;
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 3px;
                    overflow: hidden;
                    margin-bottom: 0.5rem;
                }
                .count-progress {
                    height: 100%;
                    background: linear-gradient(to right, var(--primary), var(--secondary));
                    border-radius: 3px;
                }
                .count-text {
                    font-size: 0.8rem;
                    color: var(--text-muted);
                    text-align: right;
                }
                .match-card-footer {
                    margin-top: 1.5rem;
                }

                @media (max-width: 768px) {
                    .matches-container {
                        padding: 1rem 0.5rem;
                        gap: 1.5rem;
                    }
                    .page-header {
                        flex-direction: column;
                        align-items: flex-start;
                        gap: 1.5rem;
                    }
                    .page-header h1 {
                        font-size: 2.2rem;
                    }
                    .header-actions {
                        width: 100%;
                    }
                    .header-actions :global(button) {
                        width: 100%;
                    }
                    .filters-section {
                        flex-direction: column;
                        align-items: stretch;
                        padding: 0.75rem;
                        gap: 1rem;
                    }
                    .filter-chips {
                        overflow-x: auto;
                        padding-bottom: 0.25rem;
                        -webkit-overflow-scrolling: touch;
                    }
                    .filter-chip {
                        padding: 0.5rem 1rem;
                        font-size: 0.8rem;
                        white-space: nowrap;
                    }
                    .search-box {
                        width: 100%;
                    }
                    .matches-grid {
                        grid-template-columns: 1fr;
                        gap: 1rem;
                    }
                    .match-card {
                        padding: 1.25rem !important;
                    }
                }
            `}</style>
        </div>
    );
}
