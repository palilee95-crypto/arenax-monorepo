"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Card, Button } from "@arenax/ui";
import { supabase } from "@arenax/database";

interface PlayerProfile {
    id: string;
    first_name: string;
    last_name: string;
    role: string;
    skill_level: string;
    position: string;
    avatar_url?: string;
    hero_url?: string;
    district?: string;
    reliability_score?: number;
}

export default function FindSquadPage() {
    const { userId } = useParams();
    const [searchQuery, setSearchQuery] = useState("");
    const [activeTab, setActiveTab] = useState<"players" | "teams">("players");
    const [players, setPlayers] = useState<PlayerProfile[]>([]);
    const [teams, setTeams] = useState<any[]>([]);
    const [friends, setFriends] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [myTeamId, setMyTeamId] = useState<string | null>(null);
    const [myRequests, setMyRequests] = useState<Record<string, string>>({});

    const [friendStatuses, setFriendStatuses] = useState<Record<string, string>>({});

    const fetchFriendStatuses = async () => {
        const { data, error } = await supabase
            .from('friends')
            .select('user_id, friend_id, status')
            .or(`user_id.eq.${userId},friend_id.eq.${userId}`);

        if (data) {
            const statuses: Record<string, string> = {};
            data.forEach(record => {
                const otherId = record.user_id === userId ? record.friend_id : record.user_id;
                if (record.status === 'accepted') {
                    statuses[otherId] = 'accepted';
                } else if (record.status === 'pending') {
                    statuses[otherId] = record.user_id === userId ? 'requested' : 'pending_approval';
                }
            });
            setFriendStatuses(statuses);
        }
    };

    const fetchPlayers = async () => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('role', 'player')
                .neq('id', userId)
                .order('first_name', { ascending: true });

            if (error) {
                console.error("[FindSquad] Error fetching players:", error);
                throw error;
            }

            console.log("[FindSquad] Players fetched:", data?.length, "Sample player image lengths:", data?.slice(0, 3).map((p: any) => ({
                id: p.id,
                avatar_len: p.avatar_url?.length || 0,
                hero_len: p.hero_url?.length || 0
            })));

            const playersWithScore = (data || []).map((p: any) => ({
                ...p,
                reliability_score: Math.floor(Math.random() * (100 - 85 + 1)) + 85
            }));

            setPlayers(playersWithScore);
        } catch (error) {
            console.error("Error fetching players:", error);
        }
    };

    const fetchTeams = async () => {
        try {
            const { data, error } = await supabase
                .from('teams')
                .select('*, team_members(count)')
                .order('name', { ascending: true });

            if (error) throw error;
            setTeams(data || []);

            // Fetch my membership and requests
            const [membershipRes, requestsRes] = await Promise.all([
                supabase.from('team_members').select('team_id').eq('user_id', userId),
                supabase.from('team_requests').select('team_id, status').eq('user_id', userId)
            ]);

            if (membershipRes.data && membershipRes.data.length > 0) {
                setMyTeamId(membershipRes.data[0].team_id);
            }

            if (requestsRes.data) {
                const reqs: Record<string, string> = {};
                requestsRes.data.forEach(r => {
                    reqs[r.team_id] = r.status;
                });
                setMyRequests(reqs);
            }
        } catch (error) {
            console.error("Error fetching teams:", error);
        }
    };

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            await Promise.all([
                fetchFriendStatuses(),
                fetchPlayers(),
                fetchTeams()
            ]);
            setLoading(false);
        };
        fetchData();
    }, [userId]);

    const handleAddFriend = async (friendId: string) => {
        setActionLoading(friendId);
        try {
            const { error } = await supabase
                .from('friends')
                .insert({
                    user_id: userId,
                    friend_id: friendId,
                    status: 'pending'
                });

            if (error) throw error;
            setFriendStatuses(prev => ({ ...prev, [friendId]: 'requested' }));

            // Send push notification
            fetch('/api/notifications/friend-request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ senderId: userId, receiverId: friendId })
            }).catch(err => console.error("Error sending friend request notification:", err));

        } catch (error: any) {
            alert("Error adding friend: " + error.message);
        } finally {
            setActionLoading(null);
        }
    };

    const handleRemoveFriend = async (friendId: string) => {
        setActionLoading(friendId);
        try {
            const { error } = await supabase
                .from('friends')
                .delete()
                .eq('user_id', userId)
                .eq('friend_id', friendId);

            if (error) throw error;
            if (error) throw error;

            // Also try deleting the reverse record just in case
            await supabase
                .from('friends')
                .delete()
                .eq('user_id', friendId)
                .eq('friend_id', userId);

            setFriendStatuses(prev => {
                const newStatuses = { ...prev };
                delete newStatuses[friendId];
                return newStatuses;
            });
        } catch (error: any) {
            alert("Error removing friend: " + error.message);
        } finally {
            setActionLoading(null);
        }
    };

    const handleJoinTeam = async (teamId: string) => {
        setActionLoading(teamId);
        try {
            // Get actual authenticated user to avoid RLS mismatch
            const { data: { user }, error: userError } = await supabase.auth.getUser();

            if (userError || !user) {
                throw new Error("You must be logged in to join a team.");
            }

            const activeUserId = user.id;

            // 1. Create the team request
            const { error: requestError } = await supabase
                .from('team_requests')
                .insert({
                    team_id: teamId,
                    user_id: activeUserId,
                    status: 'pending'
                });

            if (requestError) {
                console.error("[JoinTeam] RLS or DB Error:", requestError);
                throw requestError;
            }

            // 2. Fetch team details (captain) to notify
            const { data: teamData } = await supabase
                .from('teams')
                .select('name, creator_id')
                .eq('id', teamId)
                .single();

            if (teamData && teamData.creator_id) {
                // 3. Fetch requester name
                const { data: userData } = await supabase
                    .from('profiles')
                    .select('first_name, last_name')
                    .eq('id', activeUserId)
                    .single();

                const requesterName = userData ? `${userData.first_name} ${userData.last_name}` : 'A player';

                // 4. Create notification for the captain
                await supabase
                    .from('notifications')
                    .insert({
                        user_id: teamData.creator_id,
                        type: 'team_request',
                        title: 'New Team Request',
                        message: `${requesterName} wants to join your team ${teamData.name}.`,
                        link: `/${teamData.creator_id}/myteam`
                    });
            }

            setMyRequests(prev => ({ ...prev, [teamId]: 'pending' }));
        } catch (error: any) {
            alert("Error joining team: " + error.message);
        } finally {
            setActionLoading(null);
        }
    };

    const [selectedPlayer, setSelectedPlayer] = useState<PlayerProfile | null>(null);

    const filteredPlayers = players.filter(p =>
        `${p.first_name} ${p.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.district?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.position?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const PlayerProfileModal = ({ player, onClose }: { player: PlayerProfile, onClose: () => void }) => {
        return (
            <div className="modal-overlay" onClick={onClose}>
                <div className="profile-modal-content mobile-style" onClick={e => e.stopPropagation()}>
                    <button className="close-modal-top" onClick={onClose}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M19 12H5M12 19l-7-7 7-7" />
                        </svg>
                    </button>

                    <button className="share-modal-top">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
                            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                        </svg>
                    </button>

                    <div className="modal-hero-bg">
                        <img src={player.hero_url || "https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&q=80&w=1000"} alt="Background" className="bg-image" />
                        <div className="bg-overlay"></div>
                    </div>

                    <div className="modal-body-content">
                        <div className="player-avatar-box">
                            <div className="avatar-container">
                                <img src={player.avatar_url || "https://ui-avatars.com/api/?name=" + player.first_name} alt={player.first_name} />
                            </div>
                            <div className="club-logo-badge">
                                <img src="https://upload.wikimedia.org/wikipedia/en/thumb/5/56/Real_Madrid_CF.svg/1200px-Real_Madrid_CF.svg.png" alt="Club" />
                            </div>
                        </div>

                        <h1 className="player-display-name">
                            {player.first_name.toUpperCase()} {player.last_name.toUpperCase()}
                        </h1>

                        <div className="player-meta-info">
                            <span className="flag-icon">🇲🇾</span>
                            <span className="location-text">{player.district || "MALAYSIA"}</span>
                        </div>

                        <div className="player-stats-grid">
                            <div className="stat-item">
                                <div className="stat-label">POSITION</div>
                                <div className="stat-value">{(player.position || "N/A").toUpperCase()}</div>
                            </div>
                            <div className="stat-item">
                                <div className="stat-label">SKILL</div>
                                <div className="stat-value">{(player.skill_level || "N/A").toUpperCase()}</div>
                            </div>
                            <div className="stat-item">
                                <div className="stat-label">MATCHES</div>
                                <div className="stat-value">24</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const filteredTeams = teams.filter(t =>
        t.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="find-player-container">
            <header className="page-header">
                <div className="header-content">
                    <h1>Find Squad</h1>
                    <p>Connect with other players and discover teams to join.</p>
                </div>
            </header>

            <div className="search-section">
                <div className="search-box">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                    <input
                        type="text"
                        placeholder={activeTab === 'players' ? "Search by name, position, or location..." : "Search teams by name..."}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className="tabs-container">
                    <button
                        className={`tab-btn ${activeTab === 'players' ? 'active' : ''}`}
                        onClick={() => setActiveTab('players')}
                    >
                        Players
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'teams' ? 'active' : ''}`}
                        onClick={() => setActiveTab('teams')}
                    >
                        Teams
                    </button>
                </div>
            </div>

            <div className="players-grid">
                {loading ? (
                    <div className="loading-state">Syncing squad data...</div>
                ) : activeTab === 'players' ? (
                    filteredPlayers.length === 0 ? (
                        <div className="empty-state">No players found.</div>
                    ) : (
                        filteredPlayers.map(player => {
                            const status = friendStatuses[player.id];
                            const isFriend = status === 'accepted';
                            const isRequested = status === 'requested';
                            const isPendingApproval = status === 'pending_approval';
                            const reliability = player.reliability_score || 100;
                            const reliabilityColor = reliability >= 80 ? 'green' : reliability >= 50 ? 'yellow' : 'red';

                            return (
                                <div
                                    key={player.id}
                                    className="player-card-custom"
                                >
                                    <div className="card-background">
                                        <img src={player.hero_url || "https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&q=80&w=1000"} alt="Background" />
                                        <div className="card-overlay"></div>
                                    </div>
                                    <div className="player-card-content">
                                        <div className="top-left-tags">
                                            <span className="tag position">{player.position}</span>
                                            <span className="tag skill">{player.skill_level}</span>
                                        </div>

                                        <div className={`top-right-reliability ${reliabilityColor}`}>
                                            <span className="score-num">{reliability}</span>
                                            <span className="score-label">RELIABILITY</span>
                                        </div>

                                        <div className="card-footer-glass">
                                            <div className="player-name-stack">
                                                <span className="first-name">{player.first_name.toUpperCase()}</span>
                                                <span className="last-name">{player.last_name.toUpperCase()}</span>
                                            </div>

                                            <div className="player-avatar-small">
                                                {player.avatar_url ? (
                                                    <img src={player.avatar_url} alt={player.first_name} />
                                                ) : (
                                                    <div className="avatar-placeholder-small">
                                                        {player.first_name[0]}{player.last_name[0]}
                                                    </div>
                                                )}
                                            </div>

                                            <Button
                                                variant={isFriend ? "secondary" : "primary"}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (isFriend || isRequested) {
                                                        handleRemoveFriend(player.id);
                                                    } else if (isPendingApproval) {
                                                        window.location.href = `/${userId}/friends`;
                                                    } else {
                                                        handleAddFriend(player.id);
                                                    }
                                                }}
                                                disabled={actionLoading === player.id}
                                                className={`action-btn-small ${isFriend ? "secondary" : "primary"}`}
                                            >
                                                {actionLoading === player.id ? "..." :
                                                    isFriend ? "Remove" :
                                                        isRequested ? "Sent" :
                                                            isPendingApproval ? "Respond" : "Add Friend"}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )
                ) : (
                    filteredTeams.length === 0 ? (
                        <div className="empty-state">No teams found.</div>
                    ) : (
                        filteredTeams.map(team => (
                            <div key={team.id} className="team-card-custom">
                                <div className="team-card-bg">
                                    <img src={team.logo_url || "https://via.placeholder.com/150"} alt={team.name} />
                                    <div className="team-card-overlay"></div>
                                </div>
                                <div className="team-card-content">
                                    <div className="team-card-header">
                                        <span className="team-card-tag">OFFICIAL TEAM</span>
                                        <div className="team-member-count">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>
                                            {team.team_members?.[0]?.count || 0}
                                        </div>
                                    </div>
                                    <div className="team-card-footer">
                                        <div className="team-name-info">
                                            <h3>{team.name}</h3>
                                            <p>EST. {new Date(team.created_at).getFullYear()}</p>
                                        </div>
                                        <div className="join-action-wrapper">
                                            <Button
                                                variant={myTeamId === team.id ? "secondary" : "primary"}
                                                size="sm"
                                                className="join-btn"
                                                onClick={() => {
                                                    if (!myTeamId && !myRequests[team.id]) {
                                                        handleJoinTeam(team.id);
                                                    }
                                                }}
                                                disabled={actionLoading === team.id || !!myTeamId || !!myRequests[team.id]}
                                            >
                                                {actionLoading === team.id ? "..." :
                                                    myTeamId === team.id ? "Member" :
                                                        myRequests[team.id] === 'pending' ? "Requested" :
                                                            myRequests[team.id] === 'rejected' ? "Rejected" : "Join Team"}
                                            </Button>
                                            {myTeamId && myTeamId !== team.id && (
                                                <span className="join-restriction">Already in a team</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )
                )}
            </div>

            {
                selectedPlayer && (
                    <PlayerProfileModal
                        player={selectedPlayer}
                        onClose={() => setSelectedPlayer(null)}
                    />
                )
            }

            <style jsx>{`
                .find-player-container {
                    padding: 2rem;
                    max-width: 1200px;
                    margin: 0 auto;
                }
                .page-header {
                    margin-bottom: 2rem;
                }
                .page-header h1 {
                    font-family: var(--font-outfit), sans-serif;
                    font-size: 3.5rem;
                    font-weight: 900;
                    margin-bottom: 0.5rem;
                    line-height: 1;
                    letter-spacing: -0.04em;
                    background: linear-gradient(180deg, #ffffff 20%, #888888 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));
                }
                .page-header p {
                    color: var(--text-muted);
                }
                .search-section {
                    margin-bottom: 3rem;
                }
                .search-box {
                    display: flex;
                    align-items: center;
                    background: rgba(255, 255, 255, 0.03);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 16px;
                    padding: 0.85rem 1.25rem;
                    gap: 0.75rem;
                    max-width: 600px;
                }
                .search-box input {
                    background: none;
                    border: none;
                    color: #fff;
                    width: 100%;
                    outline: none;
                    font-size: 1rem;
                }
                .players-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, 300px);
                    gap: 2rem;
                    justify-content: center;
                    width: 100%;
                }

                .player-card-custom {
                    transition: all 0.3s ease;
                    position: relative;
                    overflow: hidden;
                    height: 450px !important;
                    width: 320px !important;
                    display: flex;
                    flex-direction: column;
                    border-radius: 32px;
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                }
                
                .player-card-custom:hover {
                    transform: translateY(-10px);
                    border-color: var(--primary);
                    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4), 0 0 20px rgba(0, 158, 96, 0.1);
                }
                .card-background {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    z-index: 1;
                }
                .card-background img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    object-position: center 20%;
                }
                .card-overlay {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: transparent;
                }
                .player-card-content {
                    position: relative;
                    z-index: 2;
                    display: flex;
                    flex-direction: column;
                    padding: 1.5rem;
                    height: 100%;
                }
                .top-left-tags {
                    position: absolute;
                    top: 1.5rem;
                    left: 1.5rem;
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }
                .top-right-reliability {
                    position: absolute;
                    top: 1.5rem;
                    right: 1.5rem;
                    background: rgba(0, 0, 0, 0.6);
                    backdrop-filter: blur(10px);
                    padding: 0.5rem 1rem;
                    border-radius: 12px;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    min-width: 80px;
                }
                .score-num {
                    font-size: 1.5rem;
                    font-weight: 900;
                    line-height: 1;
                }
                .top-right-reliability.green .score-num {
                    color: #00ff88;
                }
                .top-right-reliability.yellow .score-num {
                    color: #ffcc00;
                }
                .top-right-reliability.red .score-num {
                    color: #ff4444;
                }
                .score-label {
                    font-size: 0.6rem;
                    font-weight: 800;
                    color: rgba(255, 255, 255, 0.5);
                    letter-spacing: 1px;
                    margin-top: 2px;
                }
                .card-footer-glass {
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    background: linear-gradient(90deg, rgba(0, 158, 96, 0.2) 0%, rgba(255, 255, 255, 0.05) 50%);
                    backdrop-filter: blur(25px);
                    border-top: 1px solid rgba(255, 255, 255, 0.1);
                    padding: 1.5rem;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border-bottom-left-radius: 32px;
                    border-bottom-right-radius: 32px;
                }

                .join-action-wrapper {
                    display: flex;
                    flex-direction: column;
                    align-items: flex-end;
                    gap: 0.5rem;
                }

                .join-restriction {
                    font-size: 0.65rem;
                    color: rgba(255, 255, 255, 0.3);
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }
                .player-name-stack {
                    display: flex;
                    flex-direction: column;
                    text-align: left;
                    flex: 1;
                }
                .first-name {
                    font-size: 0.85rem;
                    font-weight: 600;
                    color: rgba(255, 255, 255, 0.5);
                    line-height: 1.2;
                    letter-spacing: 0.05em;
                }
                .last-name {
                    font-size: 1.8rem;
                    font-weight: 900;
                    color: #fff;
                    line-height: 1;
                    font-family: var(--font-outfit), sans-serif;
                    letter-spacing: -0.02em;
                }
                .player-avatar-small {
                    width: 56px;
                    height: 56px;
                    border-radius: 50%;
                    overflow: hidden;
                    border: 2px solid var(--primary);
                    box-shadow: 0 0 20px rgba(0, 158, 96, 0.4);
                    margin: 0 1rem;
                    flex-shrink: 0;
                }
                .player-avatar-small img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }
                .avatar-placeholder-small {
                    width: 100%;
                    height: 100%;
                    background: #111;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1.1rem;
                    font-weight: 800;
                    color: #fff;
                }
                
                /* Button Overrides */
                .action-btn-small {
                    height: 44px !important;
                    padding: 0 1.5rem !important;
                    font-size: 0.9rem !important;
                    font-weight: 800 !important;
                    border-radius: 14px !important;
                    text-transform: none !important;
                    letter-spacing: 0 !important;
                    background: rgba(255, 255, 255, 0.1) !important;
                    border: 1px solid rgba(255, 255, 255, 0.1) !important;
                    color: #fff !important;
                }
                
                .action-btn-small:hover {
                    background: rgba(255, 255, 255, 0.2) !important;
                }
                
                .tag {
                    font-size: 0.65rem;
                    font-weight: 800;
                    padding: 0.35rem 0.85rem;
                    border-radius: 6px;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    width: fit-content;
                }
                .tag.position {
                    background: var(--primary);
                    color: #000;
                    box-shadow: 0 0 15px rgba(0, 158, 96, 0.4);
                }
                .tag.skill {
                    background: rgba(255, 255, 255, 0.1);
                    color: #fff;
                    backdrop-filter: blur(5px);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                }

                .loading-state, .empty-state {
                    grid-column: 1 / -1;
                    text-align: center;
                    padding: 3rem;
                    color: var(--text-muted);
                }

                /* Modal Styles - Mobile Style */
                .modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.9);
                    backdrop-filter: blur(15px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                    padding: 1rem;
                }

                .profile-modal-content.mobile-style {
                    background: #000;
                    width: 100%;
                    max-width: 450px;
                    height: 85vh;
                    border-radius: 40px;
                    position: relative;
                    overflow: hidden;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    display: flex;
                    flex-direction: column;
                    box-shadow: 0 30px 60px rgba(0,0,0,0.8);
                }

                .close-modal-top, .share-modal-top {
                    position: absolute;
                    top: 2rem;
                    width: 44px;
                    height: 44px;
                    border-radius: 50%;
                    background: rgba(255, 255, 255, 0.1);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    color: #fff;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    z-index: 20;
                    transition: all 0.2s ease;
                }

                .close-modal-top { left: 2rem; }
                .share-modal-top { right: 2rem; }

                .close-modal-top:hover, .share-modal-top:hover {
                    background: rgba(255, 255, 255, 0.2);
                    transform: scale(1.1);
                }

                .modal-hero-bg {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    z-index: 1;
                }

                .bg-image {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    opacity: 0.6;
                }

                .bg-overlay {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: linear-gradient(to bottom, 
                        rgba(0,0,0,0.2) 0%,
                        rgba(0,0,0,0.5) 40%,
                        rgba(0,0,0,0.95) 80%,
                        #000 100%
                    );
                }

                .modal-body-content {
                    position: relative;
                    z-index: 10;
                    margin-top: auto;
                    padding: 3rem 2rem;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    text-align: center;
                }

                .player-avatar-box {
                    position: relative;
                    margin-bottom: 2rem;
                }

                .avatar-container {
                    width: 180px;
                    height: 220px;
                    background: #111;
                    border-radius: 40px;
                    overflow: hidden;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    box-shadow: 0 20px 40px rgba(0,0,0,0.5);
                }

                .avatar-container img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }

                .club-logo-badge {
                    position: absolute;
                    top: -10px;
                    right: -10px;
                    width: 60px;
                    height: 60px;
                    background: #fff;
                    border-radius: 50%;
                    padding: 8px;
                    box-shadow: 0 10px 20px rgba(0,0,0,0.3);
                    border: 2px solid #000;
                }

                .club-logo-badge img {
                    width: 100%;
                    height: 100%;
                    object-fit: contain;
                }

                .player-display-name {
                    font-size: 2.5rem;
                    font-weight: 900;
                    color: #fff;
                    margin-bottom: 0.5rem;
                    letter-spacing: -1px;
                    line-height: 1;
                }

                .player-meta-info {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    margin-bottom: 3rem;
                }

                .flag-icon { font-size: 1.2rem; }
                .location-text {
                    font-size: 1rem;
                    font-weight: 700;
                    color: rgba(255, 255, 255, 0.6);
                    letter-spacing: 1px;
                    text-transform: uppercase;
                }

                .player-stats-grid {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 1rem;
                    width: 100%;
                }

                .stat-item {
                    background: rgba(255, 255, 255, 0.05);
                    backdrop-filter: blur(10px);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 24px;
                    padding: 1.25rem 0.5rem;
                }

                .stat-label {
                    font-size: 0.6rem;
                    font-weight: 800;
                    color: rgba(255, 255, 255, 0.4);
                    margin-bottom: 0.5rem;
                    letter-spacing: 1px;
                }

                .stat-value {
                    font-size: 1.1rem;
                    font-weight: 900;
                    color: #fff;
                }

                .reliability-badge {
                    position: absolute;
                    top: 1rem;
                    right: 1rem;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    z-index: 10;
                    background: rgba(0, 0, 0, 0.4);
                    backdrop-filter: blur(8px);
                    padding: 0.4rem 0.8rem;
                    border-radius: 100px;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    box-shadow: 0 4px 10px rgba(0,0,0,0.2);
                }

                .score-ring {
                    position: relative;
                    width: 24px;
                    height: 24px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .mini-chart {
                    width: 100%;
                    height: 100%;
                    transform: rotate(0deg);
                }

                .mini-bg {
                    fill: none;
                    stroke: rgba(255, 255, 255, 0.1);
                    stroke-width: 4;
                }

                .mini-circle {
                    fill: none;
                    stroke: #009e60;
                    stroke-width: 4;
                    stroke-linecap: round;
                    filter: drop-shadow(0 0 4px rgba(0, 158, 96, 0.5));
                }

                .mini-score {
                    display: none; /* Hide number inside small ring */
                }

                .mini-label {
                    font-size: 0.75rem;
                    font-weight: 800;
                    color: #fff;
                    letter-spacing: 0.5px;
                }

                /* Tabs Styles */
                .tabs-container {
                    display: flex;
                    gap: 1rem;
                    margin-top: 1.5rem;
                }

                .tab-btn {
                    background: rgba(255, 255, 255, 0.03);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    color: rgba(255, 255, 255, 0.5);
                    padding: 0.6rem 1.5rem;
                    border-radius: 12px;
                    font-size: 0.9rem;
                    font-weight: 700;
                    cursor: pointer;
                    transition: all 0.3s ease;
                }

                .tab-btn:hover {
                    background: rgba(255, 255, 255, 0.08);
                    color: #fff;
                }

                .tab-btn.active {
                    background: var(--primary);
                    border-color: var(--primary);
                    color: #000;
                    box-shadow: 0 0 20px rgba(0, 158, 96, 0.3);
                }

                /* Team Card Styles */
                .team-card-custom {
                    position: relative;
                    height: 240px;
                    width: 300px;
                    border-radius: 32px;
                    overflow: hidden;
                    background: rgba(255, 255, 255, 0.02);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
                    display: flex;
                    flex-direction: column;
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
                    margin: 0 auto;
                }

                .team-card-custom:hover {
                    transform: translateY(-12px) scale(1.02);
                    border-color: var(--primary);
                    background: rgba(255, 255, 255, 0.04);
                    box-shadow: 0 30px 60px rgba(0, 0, 0, 0.5), 0 0 20px rgba(0, 158, 96, 0.2);
                }

                .team-card-bg {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    z-index: 1;
                    overflow: hidden;
                }

                .team-card-bg img {
                    width: 100%;
                    height: 100%;
                    object-fit: contain;
                    opacity: 0.3;
                    filter: blur(5px) saturate(1.5);
                    transition: all 0.8s ease;
                    padding: 2rem;
                }

                .team-card-custom:hover .team-card-bg img {
                    opacity: 0.25;
                    transform: scale(1.2);
                }

                .team-card-overlay {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: radial-gradient(circle at top right, rgba(0, 158, 96, 0.15), transparent 70%),
                                linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.8) 100%);
                }

                .team-card-content {
                    position: relative;
                    z-index: 2;
                    padding: 2rem;
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                }

                .team-card-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .team-card-tag {
                    font-size: 0.65rem;
                    font-weight: 800;
                    color: var(--primary);
                    letter-spacing: 1.5px;
                    background: rgba(0, 158, 96, 0.1);
                    padding: 0.4rem 0.8rem;
                    border-radius: 100px;
                    border: 1px solid rgba(0, 158, 96, 0.2);
                    text-transform: uppercase;
                }

                .team-member-count {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    font-size: 0.85rem;
                    font-weight: 800;
                    color: #fff;
                    background: rgba(255, 255, 255, 0.05);
                    backdrop-filter: blur(10px);
                    padding: 0.4rem 0.9rem;
                    border-radius: 14px;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                }

                .team-card-footer {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-end;
                    gap: 1rem;
                }

                .team-name-info {
                    flex: 1;
                }

                .team-name-info h3 {
                    font-size: 1.8rem;
                    font-weight: 900;
                    color: #fff;
                    margin: 0;
                    font-family: var(--font-outfit), sans-serif;
                    letter-spacing: -0.04em;
                    line-height: 1;
                    text-transform: uppercase;
                    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
                }

                .team-name-info p {
                    font-size: 0.85rem;
                    color: rgba(255, 255, 255, 0.4);
                    margin: 0.5rem 0 0 0;
                    font-weight: 700;
                    letter-spacing: 0.5px;
                }

                .join-btn {
                    height: 50px !important;
                    padding: 0 1.8rem !important;
                    font-size: 0.95rem !important;
                    font-weight: 900 !important;
                    border-radius: 16px !important;
                    background: var(--primary) !important;
                    color: #000 !important;
                    box-shadow: 0 10px 20px rgba(0, 158, 96, 0.2) !important;
                    transition: all 0.3s ease !important;
                    flex-shrink: 0;
                }

                .join-btn:hover {
                    transform: scale(1.05);
                    box-shadow: 0 15px 30px rgba(0, 158, 96, 0.4) !important;
                }
            `}</style>
        </div >
    );
}
