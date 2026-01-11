"use client";

import React, { useState, useEffect } from "react";
import { Card, Button } from "@arenax/ui";
import { supabase } from "@arenax/database";
import { useParams, useRouter } from "next/navigation";

export default function MyTeamPage() {
    const params = useParams();
    const router = useRouter();
    const userId = params.userId as string;
    const [team, setTeam] = useState<any>(null);
    const [members, setMembers] = useState<any[]>([]);
    const [friends, setFriends] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [teamName, setTeamName] = useState("");
    const [logoUrl, setLogoUrl] = useState("");
    const [userRole, setUserRole] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState("");
    const [editLogo, setEditLogo] = useState("");
    const [updating, setUpdating] = useState(false);
    const [requests, setRequests] = useState<any[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // 1. Fetch user's team membership first (sequential dependency)
                const { data: membership, error: membershipError } = await supabase
                    .from('team_members')
                    .select('team_id, role, teams(id, name, logo_url, created_at)')
                    .eq('user_id', userId)
                    .maybeSingle();

                if (membershipError) {
                    console.error("Membership fetch error:", membershipError);
                    throw membershipError;
                }

                if (membership) {
                    const teamData = Array.isArray(membership.teams) ? membership.teams[0] : membership.teams;
                    setTeam(teamData);
                    setUserRole(membership.role);
                    setEditName(teamData?.name || "");
                    setEditLogo(teamData?.logo_url || "");

                    // 2. Fetch members and friends in parallel
                    const [membersRes, friendsRes] = await Promise.all([
                        supabase
                            .from('team_members')
                            .select('id, role, user_id, profiles(first_name, last_name, avatar_url, position)')
                            .eq('team_id', membership.team_id),
                        supabase
                            .from('friends')
                            .select('friend_id, profiles:friend_id(id, first_name, last_name, avatar_url)')
                            .eq('user_id', userId)
                            .eq('status', 'accepted')
                    ]);

                    if (membersRes.error) console.error("Members fetch error:", membersRes.error);
                    if (friendsRes.error) console.error("Friends fetch error:", friendsRes.error);

                    if (membersRes.data) {
                        setMembers(membersRes.data);

                        const memberIds = membersRes.data.map(m => m.user_id);
                        if (friendsRes.data) {
                            setFriends(friendsRes.data
                                .map((f: any) => f.profiles)
                                .filter((p: any) => p && !memberIds.includes(p.id))
                            );
                        }
                    }

                    // 3. Fetch join requests if captain
                    if (membership.role === 'captain') {
                        const { data: requestsData } = await supabase
                            .from('team_requests')
                            .select('id, user_id, status, profiles:user_id(first_name, last_name, avatar_url, position)')
                            .eq('team_id', membership.team_id)
                            .eq('status', 'pending');

                        if (requestsData) setRequests(requestsData);
                    }
                }
            } catch (error) {
                console.error("Error fetching team data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [userId]);

    const handleCreateTeam = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!teamName) return;

        setCreating(true);
        try {
            const { data: newTeam, error: teamError } = await supabase
                .from('teams')
                .insert({
                    name: teamName,
                    logo_url: logoUrl,
                    creator_id: userId
                })
                .select()
                .single();

            if (teamError) throw teamError;

            const { error: memberError } = await supabase
                .from('team_members')
                .insert({
                    team_id: newTeam.id,
                    user_id: userId,
                    role: 'captain'
                });

            if (memberError) throw memberError;

            window.location.reload();
        } catch (error: any) {
            alert("Error creating team: " + error.message);
        } finally {
            setCreating(false);
        }
    };

    const handleInviteFriend = async (friendId: string) => {
        try {
            const { error } = await supabase
                .from('team_members')
                .insert({
                    team_id: team.id,
                    user_id: friendId,
                    role: 'member'
                });

            if (error) throw error;

            const invitedFriend = friends.find(f => f.id === friendId);
            setMembers(prev => [...prev, { user_id: friendId, profiles: invitedFriend, role: 'member' }]);
            setFriends(prev => prev.filter(f => f.id !== friendId));

            alert("Friend invited to team!");
        } catch (error: any) {
            alert("Error inviting friend: " + error.message);
        }
    };

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setLogoUrl(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleEditLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setEditLogo(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleUpdateTeam = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editName) return;

        setUpdating(true);
        try {
            const { data, error } = await supabase
                .from('teams')
                .update({
                    name: editName,
                    logo_url: editLogo
                })
                .eq('id', team.id)
                .select();

            if (error) throw error;

            if (data && data.length > 0) {
                setTeam(data[0]);
                setIsEditing(false);
            }
        } catch (error: any) {
            console.error("Error updating team:", error);
        } finally {
            setUpdating(false);
        }
    };

    const handleAcceptRequest = async (requestId: string, requestUserId: string) => {
        try {
            // 1. Add to team_members
            const { error: memberError } = await supabase
                .from('team_members')
                .insert({
                    team_id: team.id,
                    user_id: requestUserId,
                    role: 'member'
                });

            if (memberError) throw memberError;

            // 2. Update request status
            const { error: requestError } = await supabase
                .from('team_requests')
                .update({ status: 'accepted' })
                .eq('id', requestId);

            if (requestError) throw requestError;

            // 3. Update local state
            const acceptedRequest = requests.find(r => r.id === requestId);
            if (acceptedRequest) {
                setMembers(prev => [...prev, {
                    id: Math.random().toString(), // temporary id
                    user_id: requestUserId,
                    role: 'member',
                    profiles: acceptedRequest.profiles
                }]);
            }
            setRequests(prev => prev.filter(r => r.id !== requestId));

            alert("Player accepted to team!");
        } catch (error: any) {
            alert("Error accepting request: " + error.message);
        }
    };

    const handleRejectRequest = async (requestId: string) => {
        try {
            const { error } = await supabase
                .from('team_requests')
                .update({ status: 'rejected' })
                .eq('id', requestId);

            if (error) throw error;

            setRequests(prev => prev.filter(r => r.id !== requestId));
            alert("Request rejected.");
        } catch (error: any) {
            alert("Error rejecting request: " + error.message);
        }
    };

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loader"></div>
                <p>Syncing squad data...</p>
                <style jsx>{`
                    .loading-container {
                        height: 60vh;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        gap: 1.5rem;
                        color: rgba(255, 255, 255, 0.5);
                        font-family: var(--font-inter), sans-serif;
                    }
                    .loader {
                        width: 40px;
                        height: 40px;
                        border: 2px solid rgba(255, 255, 255, 0.05);
                        border-top-color: var(--primary);
                        border-radius: 50%;
                        animation: spin 1s linear infinite;
                    }
                    @keyframes spin {
                        to { transform: rotate(360deg); }
                    }
                `}</style>
            </div>
        );
    }

    return (
        <div className="myteam-container">
            <header className="page-header">
                <div className="header-content">
                    <h1>My Team</h1>
                    <p className="subtitle">{team ? "Manage your squad and invite friends." : "Create your own team and dominate the field."}</p>
                </div>
            </header>

            {!team ? (
                <div className="create-team-wrapper animate-in">
                    <Card variant="glass" className="create-team-card">
                        <form onSubmit={handleCreateTeam}>
                            <div className="logo-upload-section">
                                <div className="logo-preview-wrapper">
                                    <div className="logo-preview">
                                        {logoUrl ? (
                                            <img src={logoUrl} alt="Team Logo" />
                                        ) : (
                                            <div className="logo-placeholder">
                                                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                                                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                                    <circle cx="8.5" cy="8.5" r="1.5"></circle>
                                                    <polyline points="21 15 16 10 5 21"></polyline>
                                                </svg>
                                            </div>
                                        )}
                                    </div>
                                    <div className="logo-glow"></div>
                                </div>
                                <div className="upload-actions">
                                    <label className="upload-btn">
                                        <span>Upload Logo</span>
                                        <input type="file" accept="image/*" onChange={handleLogoUpload} hidden />
                                    </label>
                                    <p className="upload-hint">Square images work best (400x400px)</p>
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Team Name</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Red Dragons FC"
                                    value={teamName}
                                    onChange={(e) => setTeamName(e.target.value)}
                                    required
                                />
                            </div>

                            <Button variant="primary" fullWidth type="submit" disabled={creating} size="lg">
                                {creating ? "Initializing Team..." : "Create Team"}
                            </Button>
                        </form>
                    </Card>
                </div>
            ) : (
                <div className="team-dashboard">
                    <div className="team-hero-section animate-in">
                        <div className="hero-glow-bg"></div>
                        <div className="team-hero-card">
                            <div className="hero-logo-side">
                                <img src={team.logo_url || "https://via.placeholder.com/150"} alt={team.name} />
                                <div className="logo-overlay"></div>
                            </div>
                            <div className="hero-info-side">
                                <div className="team-text-info">
                                    <div className="team-title-row">
                                        <span className="team-tag">OFFICIAL TEAM</span>
                                        {userRole === 'captain' && (
                                            <button
                                                className="edit-team-btn"
                                                onClick={() => setIsEditing(true)}
                                            >
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                                </svg>
                                                <span>Edit Team</span>
                                            </button>
                                        )}
                                    </div>
                                    <h2>{team.name}</h2>
                                    <div className="team-meta">
                                        <span className="meta-item">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                                            EST. {new Date(team.created_at).getFullYear()}
                                        </span>
                                        <span className="meta-item">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                                            {members.length} Members
                                        </span>
                                    </div>
                                </div>
                                <div className="team-stats-grid">
                                    <div className="stat-card">
                                        <span className="stat-value">{members.length}</span>
                                        <span className="stat-label">TOTAL PLAYERS</span>
                                    </div>
                                    <div className="stat-card highlight">
                                        <span className="stat-value">0%</span>
                                        <span className="stat-label">WIN RATE</span>
                                    </div>
                                    <div className="stat-card">
                                        <span className="stat-value">0</span>
                                        <span className="stat-label">MATCHES</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="team-content-grid">
                        <section className="squad-section animate-in" style={{ animationDelay: '0.2s' }}>
                            <div className="section-header">
                                <h3>Squad Roster</h3>
                                <span className="count-badge">{members.length}</span>
                            </div>
                            <div className="members-list">
                                {members.map((member, index) => (
                                    <div key={member.id} className="member-card" style={{ animationDelay: `${0.3 + index * 0.05}s` }}>
                                        <div className="member-avatar-wrapper">
                                            <img src={member.profiles?.avatar_url || "https://api.dicebear.com/7.x/avataaars/svg?seed=" + member.profiles?.first_name} alt={member.profiles?.first_name} />
                                            {member.role === 'captain' && (
                                                <div className="captain-badge">
                                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                                                </div>
                                            )}
                                        </div>
                                        <div className="member-details">
                                            <span className="member-name">{member.profiles?.first_name} {member.profiles?.last_name}</span>
                                            <div className="member-tags">
                                                <span className={`role-tag ${member.role}`}>{member.role.toUpperCase()}</span>
                                                <span className="position-tag">{member.profiles?.position || "Player"}</span>
                                            </div>
                                        </div>
                                        <button className="member-more-btn">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1" /><circle cx="12" cy="5" r="1" /><circle cx="12" cy="19" r="1" /></svg>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {userRole === 'captain' && requests.length > 0 && (
                            <section className="requests-section animate-in" style={{ animationDelay: '0.3s' }}>
                                <div className="section-header">
                                    <h3>Join Requests</h3>
                                    <span className="count-badge request">{requests.length}</span>
                                </div>
                                <div className="requests-list">
                                    {requests.map((request) => (
                                        <div key={request.id} className="request-card">
                                            <div className="request-user-info">
                                                <div className="request-avatar">
                                                    <img src={request.profiles?.avatar_url || "https://api.dicebear.com/7.x/avataaars/svg?seed=" + request.profiles?.first_name} alt={request.profiles?.first_name} />
                                                </div>
                                                <div className="request-details">
                                                    <span className="request-name">{request.profiles?.first_name} {request.profiles?.last_name}</span>
                                                    <span className="request-position">{request.profiles?.position || "Player"}</span>
                                                </div>
                                            </div>
                                            <div className="request-actions">
                                                <button className="reject-btn" onClick={() => handleRejectRequest(request.id)}>
                                                    Reject
                                                </button>
                                                <button className="accept-btn" onClick={() => handleAcceptRequest(request.id, request.user_id)}>
                                                    Accept
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        <section className="invite-section animate-in" style={{ animationDelay: '0.4s' }}>
                            <div className="section-header">
                                <h3>Invite Friends</h3>
                            </div>
                            <div className="invite-glass-card">
                                {friends.length > 0 ? (
                                    <div className="friends-list">
                                        {friends.map((friend) => (
                                            <div key={friend.id} className="friend-row">
                                                <div className="friend-avatar">
                                                    <img src={friend.avatar_url || "https://api.dicebear.com/7.x/avataaars/svg?seed=" + friend.first_name} alt={friend.first_name} />
                                                </div>
                                                <div className="friend-info">
                                                    <span className="friend-name">{friend.first_name} {friend.last_name}</span>
                                                </div>
                                                <Button variant="secondary" size="sm" onClick={() => handleInviteFriend(friend.id)}>
                                                    Invite
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="empty-friends">
                                        <div className="empty-icon">
                                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="20" y1="8" x2="20" y2="14" /><line x1="23" y1="11" x2="17" y2="11" /></svg>
                                        </div>
                                        <p>No friends available to invite.</p>
                                        <Button variant="secondary" size="sm" onClick={() => router.push(`/${userId}/find-player`)}>Find Players</Button>
                                    </div>
                                )}
                            </div>
                        </section>
                    </div>
                </div>
            )}

            {isEditing && (
                <div className="modal-overlay animate-in">
                    <Card variant="glass" className="edit-modal">
                        <div className="modal-header">
                            <h3>Edit Team</h3>
                            <button className="close-btn" onClick={() => setIsEditing(false)}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                            </button>
                        </div>
                        <form onSubmit={handleUpdateTeam}>
                            <div className="edit-logo-section">
                                <div className="logo-preview-wrapper">
                                    <div className="logo-preview">
                                        {editLogo ? (
                                            <img src={editLogo} alt="Team Logo" />
                                        ) : (
                                            <div className="logo-placeholder">
                                                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
                                            </div>
                                        )}
                                    </div>
                                    <label className="logo-edit-overlay">
                                        <input type="file" accept="image/*" onChange={handleEditLogoUpload} hidden />
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
                                    </label>
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Team Name</label>
                                <input
                                    type="text"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="modal-actions">
                                <Button variant="secondary" onClick={() => setIsEditing(false)} type="button">Cancel</Button>
                                <Button variant="primary" type="submit" disabled={updating}>
                                    {updating ? "Saving..." : "Save Changes"}
                                </Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}

            <style jsx>{`
                .myteam-container {
                    display: flex;
                    flex-direction: column;
                    gap: 3rem;
                    padding-bottom: 6rem;
                    max-width: 1400px;
                    margin: 0 auto;
                    padding: 0 2rem;
                }

                .animate-in {
                    animation: reveal 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                    opacity: 0;
                }

                @keyframes reveal {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                .page-header h1 {
                    font-family: var(--font-outfit), sans-serif;
                    font-size: 5rem;
                    font-weight: 950;
                    margin-bottom: 0.5rem;
                    letter-spacing: -0.06em;
                    background: linear-gradient(180deg, #ffffff 40%, rgba(255, 255, 255, 0.2) 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    line-height: 0.9;
                }

                .subtitle {
                    color: rgba(255, 255, 255, 0.4);
                    font-size: 1.2rem;
                    font-weight: 400;
                    letter-spacing: -0.01em;
                }

                /* Create Team Styles */
                .create-team-wrapper {
                    display: flex;
                    justify-content: center;
                    padding: 4rem 0;
                }

                .create-team-card {
                    width: 100%;
                    max-width: 500px;
                    padding: 4rem !important;
                    background: rgba(255, 255, 255, 0.02) !important;
                    border: 0.5px solid rgba(255, 255, 255, 0.1) !important;
                    border-radius: 40px !important;
                }

                .logo-upload-section {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 2rem;
                    margin-bottom: 4rem;
                }

                .logo-preview {
                    width: 160px;
                    height: 160px;
                    border-radius: 40px;
                    background: rgba(255, 255, 255, 0.02);
                    border: 0.5px solid rgba(255, 255, 255, 0.1);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    overflow: hidden;
                    backdrop-filter: blur(20px);
                    position: relative;
                    z-index: 2;
                }

                .logo-glow {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    width: 240px;
                    height: 240px;
                    background: radial-gradient(circle, rgba(var(--primary-rgb), 0.2) 0%, transparent 70%);
                    z-index: 1;
                }

                .logo-preview img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }

                .upload-btn {
                    padding: 0.8rem 1.5rem;
                    background: rgba(255, 255, 255, 0.05);
                    border: 0.5px solid rgba(255, 255, 255, 0.1);
                    border-radius: 14px;
                    font-size: 0.9rem;
                    font-weight: 700;
                    cursor: pointer;
                    transition: all 0.3s ease;
                }

                .upload-btn:hover {
                    background: rgba(255, 255, 255, 0.1);
                    transform: translateY(-2px);
                }

                .form-group label {
                    display: block;
                    margin-bottom: 1rem;
                    color: rgba(255, 255, 255, 0.5);
                    font-size: 0.8rem;
                    font-weight: 800;
                    text-transform: uppercase;
                    letter-spacing: 0.1em;
                }

                .form-group input {
                    width: 100%;
                    padding: 1.4rem;
                    background: rgba(0, 0, 0, 0.4);
                    border: 0.5px solid rgba(255, 255, 255, 0.1);
                    border-radius: 20px;
                    color: #fff;
                    font-size: 1.1rem;
                    transition: all 0.3s ease;
                    outline: none;
                    margin-bottom: 2.5rem;
                }

                .form-group input:focus {
                    border-color: var(--primary);
                    background: rgba(0, 0, 0, 0.6);
                }

                /* Dashboard Styles */
                .team-hero-section {
                    position: relative;
                    margin-bottom: 2rem;
                }

                .hero-glow-bg {
                    position: absolute;
                    top: -150px;
                    right: -150px;
                    width: 600px;
                    height: 600px;
                    background: radial-gradient(circle, rgba(var(--primary-rgb), 0.1) 0%, transparent 70%);
                    z-index: 0;
                    pointer-events: none;
                }

                .team-hero-card {
                    display: grid;
                    grid-template-columns: 350px 1fr;
                    background: rgba(255, 255, 255, 0.02);
                    border: 0.5px solid rgba(255, 255, 255, 0.1);
                    border-radius: 48px;
                    overflow: hidden;
                    min-height: 350px;
                    position: relative;
                    z-index: 1;
                    backdrop-filter: blur(30px);
                }

                .hero-logo-side {
                    position: relative;
                    height: 100%;
                    border-right: 0.5px solid rgba(255, 255, 255, 0.05);
                }

                .hero-logo-side img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }

                .logo-overlay {
                    position: absolute;
                    inset: 0;
                    background: linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.6) 100%);
                }

                .hero-info-side {
                    padding: 4rem 5rem;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    gap: 3.5rem;
                }

                .team-text-info h2 {
                    font-family: var(--font-outfit), sans-serif;
                    font-size: 5.5rem;
                    font-weight: 950;
                    margin: 0;
                    letter-spacing: -0.05em;
                    line-height: 0.85;
                    color: #fff;
                    text-transform: uppercase;
                }

                .team-tag {
                    font-size: 0.9rem;
                    color: var(--primary);
                    font-weight: 900;
                    letter-spacing: 0.3em;
                    text-transform: uppercase;
                    margin-bottom: 0.5rem;
                    display: block;
                }

                .team-meta {
                    display: flex;
                    gap: 2.5rem;
                    margin-top: 1.5rem;
                }

                .meta-item {
                    display: flex;
                    align-items: center;
                    gap: 0.8rem;
                    font-size: 1.1rem;
                    color: rgba(255, 255, 255, 0.4);
                    font-weight: 500;
                }

                .team-title-row {
                    display: flex;
                    align-items: center;
                    gap: 1.5rem;
                    margin-bottom: 1.5rem;
                }

                .edit-team-btn {
                    background: rgba(255, 255, 255, 0.08);
                    border: 1px solid rgba(255, 255, 255, 0.15);
                    color: #fff;
                    padding: 0.6rem 1.2rem;
                    border-radius: 14px;
                    display: flex;
                    align-items: center;
                    gap: 0.8rem;
                    cursor: pointer;
                    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                    font-family: var(--font-inter), sans-serif;
                    font-size: 0.85rem;
                    font-weight: 700;
                    letter-spacing: 0.02em;
                    text-transform: uppercase;
                    backdrop-filter: blur(10px);
                }

                .edit-team-btn:hover {
                    background: var(--primary);
                    border-color: var(--primary);
                    color: #000;
                    transform: translateY(-2px);
                    box-shadow: 0 8px 20px rgba(var(--primary-rgb), 0.3);
                }

                .edit-team-btn svg {
                    opacity: 0.8;
                }

                .edit-team-btn:hover svg {
                    opacity: 1;
                }

                /* Modal Styles */
                .modal-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(0, 0, 0, 0.8);
                    backdrop-filter: blur(10px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                    padding: 2rem;
                }

                .edit-modal {
                    width: 100%;
                    max-width: 500px;
                    padding: 3rem !important;
                    background: rgba(255, 255, 255, 0.02) !important;
                    border: 0.5px solid rgba(255, 255, 255, 0.1) !important;
                    border-radius: 40px !important;
                }

                .modal-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 3rem;
                }

                .modal-header h3 {
                    font-family: var(--font-outfit), sans-serif;
                    font-size: 2rem;
                    font-weight: 800;
                    margin: 0;
                    color: #fff;
                }

                .close-btn {
                    background: none;
                    border: none;
                    color: rgba(255, 255, 255, 0.3);
                    cursor: pointer;
                    padding: 0.5rem;
                    transition: all 0.3s;
                }

                .close-btn:hover {
                    color: #fff;
                    transform: rotate(90deg);
                }

                .edit-logo-section {
                    display: flex;
                    justify-content: center;
                    margin-bottom: 3rem;
                }

                .logo-edit-overlay {
                    position: absolute;
                    inset: 0;
                    background: rgba(0, 0, 0, 0.4);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    opacity: 0;
                    transition: all 0.3s;
                    cursor: pointer;
                    border-radius: 32px;
                    color: #fff;
                }

                .logo-preview-wrapper:hover .logo-edit-overlay {
                    opacity: 1;
                }

                .modal-actions {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 1.5rem;
                    margin-top: 1rem;
                }

                .team-stats-grid {
                    display: flex;
                    gap: 2rem;
                }

                .stat-card {
                    display: flex;
                    flex-direction: column;
                    gap: 0.2rem;
                }

                .stat-value {
                    font-family: var(--font-outfit), sans-serif;
                    font-size: 3.5rem;
                    font-weight: 950;
                    color: #fff;
                    line-height: 1;
                }

                .stat-label {
                    font-size: 0.7rem;
                    color: rgba(255, 255, 255, 0.3);
                    font-weight: 900;
                    letter-spacing: 0.15em;
                }

                .stat-card.highlight .stat-value {
                    color: var(--primary);
                }

                .team-content-grid {
                    display: grid;
                    grid-template-columns: 1.8fr 1fr;
                    gap: 3rem;
                }

                .section-header h3 {
                    font-family: var(--font-outfit), sans-serif;
                    font-size: 2rem;
                    font-weight: 900;
                    letter-spacing: -0.03em;
                }

                .count-badge {
                    background: rgba(255, 255, 255, 0.05);
                    padding: 0.3rem 1rem;
                    border-radius: 100px;
                    font-size: 0.9rem;
                    font-weight: 800;
                    color: rgba(255, 255, 255, 0.3);
                }

                .members-list {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
                    gap: 1.5rem;
                }

                .member-card {
                    display: flex;
                    align-items: center;
                    gap: 1.5rem;
                    padding: 1.5rem;
                    background: rgba(255, 255, 255, 0.01);
                    border: 0.5px solid rgba(255, 255, 255, 0.05);
                    border-radius: 32px;
                    transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
                    opacity: 0;
                    animation: reveal 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }

                .member-card:hover {
                    background: rgba(255, 255, 255, 0.03);
                    border-color: rgba(255, 255, 255, 0.1);
                    transform: translateY(-5px) scale(1.02);
                }

                .member-avatar-wrapper {
                    position: relative;
                }

                .member-avatar-wrapper img {
                    width: 72px;
                    height: 72px;
                    border-radius: 24px;
                    object-fit: cover;
                }

                .captain-badge {
                    position: absolute;
                    top: -8px;
                    right: -8px;
                    width: 28px;
                    height: 28px;
                    background: #FFD700;
                    color: #000;
                    border-radius: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border: 3px solid #000;
                    box-shadow: 0 4px 10px rgba(255, 215, 0, 0.3);
                }

                .member-name {
                    font-size: 1.2rem;
                    font-weight: 800;
                    color: #fff;
                    display: block;
                    margin-bottom: 0.4rem;
                }

                .member-tags {
                    display: flex;
                    gap: 0.8rem;
                    align-items: center;
                }

                .role-tag {
                    font-size: 0.65rem;
                    font-weight: 900;
                    letter-spacing: 0.05em;
                }

                .role-tag.captain { color: #FFD700; }
                .role-tag.member { color: rgba(255, 255, 255, 0.3); }

                .position-tag {
                    font-size: 0.65rem;
                    font-weight: 900;
                    color: var(--primary);
                    text-transform: uppercase;
                }

                .member-more-btn {
                    background: transparent;
                    border: none;
                    color: rgba(255, 255, 255, 0.1);
                    cursor: pointer;
                    padding: 0.5rem;
                    border-radius: 12px;
                    transition: all 0.3s;
                    margin-left: auto;
                }

                .member-more-btn:hover {
                    color: #fff;
                    background: rgba(255, 255, 255, 0.05);
                }

                .invite-glass-card {
                    background: rgba(255, 255, 255, 0.01);
                    border: 0.5px solid rgba(255, 255, 255, 0.05);
                    border-radius: 32px;
                    padding: 2rem;
                }

                .friend-row {
                    display: flex;
                    align-items: center;
                    gap: 1.2rem;
                    padding: 1.2rem;
                    border-bottom: 0.5px solid rgba(255, 255, 255, 0.03);
                    transition: all 0.3s;
                }

                .friend-row:hover {
                    background: rgba(255, 255, 255, 0.01);
                }

                .friend-row:last-child {
                    border-bottom: none;
                }

                .friend-avatar img {
                    width: 48px;
                    height: 48px;
                    border-radius: 16px;
                }

                .friend-name {
                    font-weight: 700;
                    font-size: 1rem;
                    color: #fff;
                }

                .empty-friends {
                    text-align: center;
                    padding: 3rem 1rem;
                    color: rgba(255, 255, 255, 0.3);
                }

                .empty-icon {
                    margin-bottom: 1.5rem;
                    opacity: 0.5;
                }

                .empty-friends p {
                    margin-bottom: 2rem;
                    font-size: 0.95rem;
                }

                @media (max-width: 1200px) {
                    .team-hero-card {
                        grid-template-columns: 1fr;
                        min-height: auto;
                    }
                    .hero-logo-side {
                        height: 300px;
                        border-right: none;
                        border-bottom: 0.5px solid rgba(255, 255, 255, 0.05);
                    }
                    .hero-info-side {
                        padding: 3rem 2rem;
                        align-items: center;
                        text-align: center;
                    }
                    .team-text-info h2 {
                        font-size: 4rem;
                    }
                    .team-meta {
                        justify-content: center;
                    }
                    .team-stats-grid {
                        justify-content: center;
                    }
                    .team-content-grid {
                        grid-template-columns: 1fr;
                    }
                }

                @media (max-width: 768px) {
                    .myteam-container {
                        padding: 0 1rem;
                        gap: 2rem;
                    }
                    .page-header h1 {
                        font-size: 3.5rem;
                    }
                    .hero-logo-side {
                        height: 200px;
                    }
                    .hero-info-side {
                        padding: 2rem 1.5rem;
                        gap: 2.5rem;
                    }
                    .team-text-info h2 {
                        font-size: 3rem;
                    }
                    .team-tag {
                        font-size: 0.75rem;
                        letter-spacing: 0.2em;
                    }
                    .team-meta {
                        gap: 1.5rem;
                        flex-wrap: wrap;
                        justify-content: center;
                    }
                    .meta-item {
                        font-size: 0.9rem;
                    }
                    .team-stats-grid {
                        display: grid;
                        grid-template-columns: repeat(3, 1fr);
                        width: 100%;
                        gap: 1rem;
                    }
                    .stat-value {
                        font-size: 2.2rem;
                    }
                    .stat-label {
                        font-size: 0.55rem;
                    }
                    .section-header h3 {
                        font-size: 1.6rem;
                    }
                    .members-list {
                        grid-template-columns: 1fr;
                    }
                    .member-card {
                        padding: 1.2rem;
                    }
                    .member-avatar-wrapper img {
                        width: 60px;
                        height: 60px;
                    }
                }

                @media (max-width: 480px) {
                    .page-header h1 {
                        font-size: 2.8rem;
                    }
                    .team-text-info h2 {
                        font-size: 2.5rem;
                    }
                    .team-stats-grid {
                        grid-template-columns: 1fr 1fr;
                    }
                    .team-stats-grid .stat-card:last-child {
                        grid-column: span 2;
                    }
                    .stat-value {
                        font-size: 2rem;
                    }
                }

                .count-badge.request {
                    background: #ff4d4d;
                    color: #fff;
                }

                .requests-list {
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                }

                .request-card {
                    background: rgba(255, 255, 255, 0.03);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    border-radius: 20px;
                    padding: 1.2rem;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    transition: all 0.3s ease;
                }

                .request-card:hover {
                    background: rgba(255, 255, 255, 0.05);
                    border-color: rgba(255, 255, 255, 0.1);
                }

                .request-user-info {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                }

                .request-avatar {
                    width: 48px;
                    height: 48px;
                    border-radius: 14px;
                    overflow: hidden;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                }

                .request-avatar img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }

                .request-details {
                    display: flex;
                    flex-direction: column;
                }

                .request-name {
                    font-weight: 700;
                    color: #fff;
                    font-size: 1rem;
                }

                .request-position {
                    font-size: 0.8rem;
                    color: rgba(255, 255, 255, 0.4);
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }

                .request-actions {
                    display: flex;
                    gap: 0.8rem;
                }

                .accept-btn, .reject-btn {
                    padding: 0.6rem 1.2rem;
                    border-radius: 12px;
                    font-size: 0.85rem;
                    font-weight: 700;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }

                .accept-btn {
                    background: var(--primary);
                    border: none;
                    color: #000;
                }

                .accept-btn:hover {
                    transform: scale(1.05);
                    box-shadow: 0 0 15px rgba(var(--primary-rgb), 0.3);
                }

                .reject-btn {
                    background: rgba(255, 77, 77, 0.1);
                    border: 1px solid rgba(255, 77, 77, 0.2);
                    color: #ff4d4d;
                }

                .reject-btn:hover {
                    background: rgba(255, 77, 77, 0.2);
                }
            `}</style>
        </div>
    );
}
