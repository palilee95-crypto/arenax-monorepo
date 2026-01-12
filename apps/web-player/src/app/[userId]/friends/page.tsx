"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Card, Button } from "@arenax/ui";
import { supabase } from "@arenax/database";

interface FriendProfile {
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

export default function FriendsPage() {
    const { userId } = useParams();
    const [friends, setFriends] = useState<FriendProfile[]>([]);
    const [friendRequests, setFriendRequests] = useState<FriendProfile[]>([]);
    const [sentRequests, setSentRequests] = useState<FriendProfile[]>([]);
    const [activeTab, setActiveTab] = useState<'friends' | 'requests'>('friends');
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [selectedPlayer, setSelectedPlayer] = useState<FriendProfile | null>(null);
    const [error, setError] = useState<string | null>(null);

    const fetchFriends = async () => {
        console.log("[FriendsPage] Fetching friends for userId:", userId);
        setLoading(true);
        setError(null);
        try {
            if (!userId) {
                console.error("[FriendsPage] No userId found in params");
                return;
            }
            // Fetch accepted friends (bidirectional)
            const { data: friendsData, error: friendsError } = await supabase
                .from('friends')
                .select(`
                    user_id,
                    friend_id,
                    status,
                    friend_profile:profiles!friend_id (
                        id, first_name, last_name, avatar_url, hero_url, role, skill_level, position, district
                    ),
                    user_profile:profiles!user_id (
                        id, first_name, last_name, avatar_url, hero_url, role, skill_level, position, district
                    )
                `)
                .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
                .eq('status', 'accepted');

            if (friendsError) throw friendsError;

            // Fetch pending requests (where I am the friend_id)
            const { data: requestsData, error: requestsError } = await supabase
                .from('friends')
                .select(`
                    user_id,
                    status,
                    user_profile:profiles!user_id (
                        id, first_name, last_name, avatar_url, hero_url, role, skill_level, position, district
                    )
                `)
                .eq('friend_id', userId)
                .eq('status', 'pending');

            if (requestsError) throw requestsError;

            // Fetch sent requests (where I am the user_id and status is pending)
            const { data: sentData, error: sentError } = await supabase
                .from('friends')
                .select(`
                    friend_id,
                    status,
                    friend_profile:profiles!friend_id (
                        id, first_name, last_name, avatar_url, hero_url, role, skill_level, position, district
                    )
                `)
                .eq('user_id', userId)
                .eq('status', 'pending');

            if (sentError) throw sentError;

            if (friendsData) {
                const friendsList = friendsData.map((item: any) => {
                    const profile = item.user_id === userId ? item.friend_profile : item.user_profile;
                    return {
                        ...profile,
                        reliability_score: Math.floor(Math.random() * (100 - 85 + 1)) + 85
                    };
                }).filter(Boolean);
                setFriends(friendsList);
            }

            if (requestsData) {
                const requestsList = requestsData.map((item: any) => ({
                    ...item.user_profile,
                    reliability_score: Math.floor(Math.random() * (100 - 85 + 1)) + 85
                })).filter(Boolean);
                setFriendRequests(requestsList);
            }

            if (sentData) {
                const sentList = sentData.map((item: any) => ({
                    ...item.friend_profile,
                    reliability_score: Math.floor(Math.random() * (100 - 85 + 1)) + 85
                })).filter(Boolean);
                setSentRequests(sentList);
            }
        } catch (err: any) {
            console.error("[FriendsPage] Error fetching friends:", err);
            setError(err.message || "An unexpected error occurred");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFriends();
    }, [userId]);

    const handleRemoveFriend = async (friendId: string) => {
        if (!confirm("Are you sure you want to remove this friend?")) return;

        setActionLoading(friendId);
        try {
            // Delete the relationship regardless of direction
            const { error } = await supabase
                .from('friends')
                .delete()
                .or(`and(user_id.eq.${userId},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${userId})`);

            if (error) throw error;
            setFriends(prev => prev.filter(f => f.id !== friendId));
        } catch (error: any) {
            alert("Error removing friend: " + error.message);
        } finally {
            setActionLoading(null);
        }
    };

    const handleAcceptRequest = async (friendId: string) => {
        setActionLoading(friendId);
        try {
            const { error } = await supabase
                .from('friends')
                .update({ status: 'accepted' })
                .eq('user_id', friendId) // The sender
                .eq('friend_id', userId); // Me

            if (error) throw error;

            // Move from requests to friends
            const friend = friendRequests.find(f => f.id === friendId);
            if (friend) {
                setFriendRequests(prev => prev.filter(f => f.id !== friendId));
                setFriends(prev => [...prev, friend]);
            }
        } catch (error: any) {
            alert("Error accepting request: " + error.message);
        } finally {
            setActionLoading(null);
        }
    };

    const handleDeclineRequest = async (friendId: string) => {
        setActionLoading(friendId);
        try {
            const { error } = await supabase
                .from('friends')
                .delete()
                .eq('user_id', friendId)
                .eq('friend_id', userId);

            if (error) throw error;
            setFriendRequests(prev => prev.filter(f => f.id !== friendId));
        } catch (error: any) {
            alert("Error declining request: " + error.message);
        } finally {
            setActionLoading(null);
        }
    };

    const PlayerProfileModal = ({ player, onClose }: { player: FriendProfile, onClose: () => void }) => {
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

    return (
        <div className="friends-page">
            <div className="page-header">
                <h1>My Friends</h1>
                <p>Manage your network and view player profiles</p>
            </div>

            {error && (
                <div className="error-banner">
                    <p>Error: {error}</p>
                    <Button variant="secondary" onClick={fetchFriends}>Retry</Button>
                </div>
            )}

            <div className="friends-tabs">
                <button
                    className={`tab-btn ${activeTab === 'friends' ? 'active' : ''}`}
                    onClick={() => setActiveTab('friends')}
                >
                    Friends ({friends.length})
                </button>
                <button
                    className={`tab-btn ${activeTab === 'requests' ? 'active' : ''}`}
                    onClick={() => setActiveTab('requests')}
                >
                    Requests {(friendRequests.length > 0) && <span className="badge">{friendRequests.length}</span>}
                </button>
            </div>

            {activeTab === 'friends' ? (
                loading ? (
                    <div className="loading-state">Loading friends...</div>
                ) : friends.length === 0 ? (
                    <Card variant="glass" className="empty-friends">
                        <div className="empty-content">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                <circle cx="9" cy="7" r="4"></circle>
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                            </svg>
                            <h3>No friends yet</h3>
                            <p>Start adding players to your network to see them here.</p>
                            <Button variant="primary" onClick={() => window.location.href = `/${userId}/find-player`}>
                                Find Players
                            </Button>
                        </div>
                    </Card>
                ) : (
                    <div className="friends-grid">
                        {friends.map(friend => {
                            const reliability = friend.reliability_score || 100;
                            const reliabilityColor = reliability >= 80 ? 'green' : reliability >= 50 ? 'yellow' : 'red';
                            return (
                                <div
                                    key={friend.id}
                                    className="player-card-custom clickable"
                                    onClick={() => setSelectedPlayer(friend)}
                                >
                                    <div className="card-background">
                                        <img src={friend.hero_url || "https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&q=80&w=1000"} alt="Background" />
                                        <div className="card-overlay"></div>
                                    </div>
                                    <div className="player-card-content">
                                        <div className="top-left-tags">
                                            <span className="tag position">{friend.position}</span>
                                            <span className="tag skill">{friend.skill_level}</span>
                                        </div>

                                        <div className={`top-right-reliability ${reliabilityColor}`}>
                                            <span className="score-num">{reliability}</span>
                                            <span className="score-label">RELIABILITY</span>
                                        </div>

                                        <div className="card-footer-glass">
                                            <div className="player-name-stack">
                                                <span className="first-name">{friend.first_name.toUpperCase()}</span>
                                                <span className="last-name">{friend.last_name.toUpperCase()}</span>
                                            </div>

                                            <div className="player-avatar-small">
                                                {friend.avatar_url ? (
                                                    <img src={friend.avatar_url} alt={friend.first_name} />
                                                ) : (
                                                    <div className="avatar-placeholder-small">
                                                        {friend.first_name[0]}{friend.last_name[0]}
                                                    </div>
                                                )}
                                            </div>

                                            <Button
                                                variant="secondary"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleRemoveFriend(friend.id);
                                                }}
                                                disabled={actionLoading === friend.id}
                                                className="action-btn-small secondary"
                                            >
                                                {actionLoading === friend.id ? "..." : "Remove"}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )
            ) : (
                <div className="requests-view">
                    {/* Received Requests */}
                    <div className="requests-section">
                        <h2>Received Requests ({friendRequests.length})</h2>
                        {friendRequests.length === 0 ? (
                            <p className="empty-text">No pending requests received.</p>
                        ) : (
                            <div className="friends-grid">
                                {friendRequests.map(request => {
                                    const reliability = request.reliability_score || 100;
                                    const reliabilityColor = reliability >= 80 ? 'green' : reliability >= 50 ? 'yellow' : 'red';
                                    return (
                                        <div key={request.id} className="player-card-custom">
                                            <div className="card-background">
                                                <img src={request.hero_url || "https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&q=80&w=1000"} alt="Background" />
                                                <div className="card-overlay"></div>
                                            </div>
                                            <div className="player-card-content">
                                                <div className="top-left-tags">
                                                    <span className="tag position">{request.position}</span>
                                                    <span className="tag skill">{request.skill_level}</span>
                                                </div>
                                                <div className={`top-right-reliability ${reliabilityColor}`}>
                                                    <span className="score-num">{reliability}</span>
                                                    <span className="score-label">RELIABILITY</span>
                                                </div>
                                                <div className="card-footer-glass">
                                                    <div className="player-name-stack">
                                                        <span className="first-name">{request.first_name.toUpperCase()}</span>
                                                        <span className="last-name">{request.last_name.toUpperCase()}</span>
                                                    </div>
                                                    <div className="player-avatar-small">
                                                        {request.avatar_url ? (
                                                            <img src={request.avatar_url} alt={request.first_name} />
                                                        ) : (
                                                            <div className="avatar-placeholder-small">
                                                                {request.first_name[0]}{request.last_name[0]}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="action-buttons-group">
                                                        <Button
                                                            variant="primary"
                                                            onClick={() => handleAcceptRequest(request.id)}
                                                            disabled={actionLoading === request.id}
                                                            className="action-btn-small primary"
                                                        >
                                                            Accept
                                                        </Button>
                                                        <Button
                                                            variant="secondary"
                                                            onClick={() => handleDeclineRequest(request.id)}
                                                            disabled={actionLoading === request.id}
                                                            className="action-btn-small secondary"
                                                        >
                                                            Decline
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Sent Requests */}
                    <div className="requests-section">
                        <h2>Sent Requests ({sentRequests.length})</h2>
                        {sentRequests.length === 0 ? (
                            <p className="empty-text">You haven't sent any requests yet.</p>
                        ) : (
                            <div className="friends-grid">
                                {sentRequests.map(request => {
                                    const reliability = request.reliability_score || 100;
                                    const reliabilityColor = reliability >= 80 ? 'green' : reliability >= 50 ? 'yellow' : 'red';
                                    return (
                                        <div key={request.id} className="player-card-custom">
                                            <div className="card-background">
                                                <img src={request.hero_url || "https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&q=80&w=1000"} alt="Background" />
                                                <div className="card-overlay"></div>
                                            </div>
                                            <div className="player-card-content">
                                                <div className="top-left-tags">
                                                    <span className="tag position">{request.position}</span>
                                                    <span className="tag skill">{request.skill_level}</span>
                                                </div>
                                                <div className={`top-right-reliability ${reliabilityColor}`}>
                                                    <span className="score-num">{reliability}</span>
                                                    <span className="score-label">RELIABILITY</span>
                                                </div>
                                                <div className="card-footer-glass">
                                                    <div className="player-name-stack">
                                                        <span className="first-name">{request.first_name.toUpperCase()}</span>
                                                        <span className="last-name">{request.last_name.toUpperCase()}</span>
                                                    </div>
                                                    <div className="player-avatar-small">
                                                        {request.avatar_url ? (
                                                            <img src={request.avatar_url} alt={request.first_name} />
                                                        ) : (
                                                            <div className="avatar-placeholder-small">
                                                                {request.first_name[0]}{request.last_name[0]}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <Button
                                                        variant="secondary"
                                                        onClick={() => handleDeclineRequest(request.id)}
                                                        disabled={actionLoading === request.id}
                                                        className="action-btn-small secondary"
                                                    >
                                                        Cancel
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {selectedPlayer && (
                <PlayerProfileModal
                    player={selectedPlayer}
                    onClose={() => setSelectedPlayer(null)}
                />
            )}

            <style jsx>{`
                .friends-page {
                    padding: 2rem;
                    max-width: 1200px;
                    margin: 0 auto;
                }

                .page-header {
                    margin-bottom: 3rem;
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
                    font-size: 1.1rem;
                }

                .requests-section {
                    margin-bottom: 3rem;
                }

                .requests-section h2 {
                    font-size: 1.5rem;
                    color: #fff;
                    margin-bottom: 1.5rem;
                    font-family: var(--font-outfit), sans-serif;
                }

                .friends-tabs {
                    display: flex;
                    gap: 1rem;
                    margin-bottom: 2rem;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                    padding-bottom: 1rem;
                }

                .tab-btn {
                    background: transparent;
                    border: none;
                    color: var(--text-muted);
                    font-size: 1.1rem;
                    font-weight: 600;
                    cursor: pointer;
                    padding: 0.5rem 1rem;
                    position: relative;
                    transition: all 0.2s ease;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }

                .tab-btn.active {
                    color: var(--primary);
                }

                .tab-btn.active::after {
                    content: '';
                    position: absolute;
                    bottom: -1rem;
                    left: 0;
                    right: 0;
                    height: 2px;
                    background: var(--primary);
                    box-shadow: 0 0 10px var(--primary);
                }

                .badge {
                    background: var(--primary);
                    color: #000;
                    font-size: 0.75rem;
                    padding: 2px 8px;
                    border-radius: 10px;
                    font-weight: 800;
                }

                .empty-text {
                    color: var(--text-muted);
                    text-align: center;
                    padding: 2rem;
                    background: rgba(255, 255, 255, 0.02);
                    border-radius: 16px;
                    border: 1px dashed rgba(255, 255, 255, 0.1);
                }

                .loading-state {
                    text-align: center;
                    padding: 4rem;
                    color: var(--text-muted);
                }

                .empty-friends {
                    padding: 4rem;
                    text-align: center;
                }

                .empty-content {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 1.5rem;
                }

                .empty-content svg {
                    color: var(--text-muted);
                    opacity: 0.5;
                }

                .empty-content h3 {
                    font-size: 1.5rem;
                    color: #fff;
                }

                .empty-content p {
                    color: var(--text-muted);
                    margin-bottom: 1rem;
                }

                .friends-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, 320px);
                    gap: 2rem;
                    justify-content: center;
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
                    cursor: pointer;
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

                .action-buttons-group {
                    display: flex;
                    gap: 0.5rem;
                    width: 100%;
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

                .error-banner {
                    background: rgba(255, 68, 68, 0.1);
                    border: 1px solid rgba(255, 68, 68, 0.2);
                    padding: 1rem;
                    border-radius: 12px;
                    margin-bottom: 2rem;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    color: #ff4444;
                }
            `}</style>
        </div>
    );
}
