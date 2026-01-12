"use client";

import React, { useState, useEffect } from "react";
import { Card, Button, Modal } from "@arenax/ui";
import { supabase, Profile } from "@arenax/database";

const MALAYSIA_DATA: Record<string, string[]> = {
    "Selangor": ["Petaling Jaya", "Shah Alam", "Subang Jaya", "Klang", "Kajang", "Selayang", "Ampang Jaya"],
    "Kuala Lumpur": ["Bukit Bintang", "Cheras", "Kepong", "Lembah Pantai", "Seputeh", "Setiawangsa", "Wangsa Maju"],
    "Johor": ["Johor Bahru", "Batu Pahat", "Kluang", "Muar", "Kota Tinggi", "Segamat", "Pontian"],
    "Penang": ["George Town", "Butterworth", "Bukit Mertajam", "Bayan Lepas", "Seberang Perai"],
    "Perak": ["Ipoh", "Taiping", "Teluk Intan", "Manjung", "Kuala Kangsar", "Batu Gajah"],
    "Negeri Sembilan": ["Seremban", "Port Dickson", "Jempol", "Tampin", "Kuala Pilah"],
    "Melaka": ["Melaka City", "Alor Gajah", "Jasin"],
    "Pahang": ["Kuantan", "Temerloh", "Bentong", "Pekan", "Raub", "Cameron Highlands"],
    "Kedah": ["Alor Setar", "Sungai Petani", "Kulim", "Langkawi", "Kubang Pasu"],
    "Kelantan": ["Kota Bharu", "Pasir Mas", "Tumpat", "Bachok", "Tanah Merah"],
    "Terengganu": ["Kuala Terengganu", "Kemaman", "Dungun", "Besut", "Marang"],
    "Sabah": ["Kota Kinabalu", "Sandakan", "Tawau", "Lahad Datu", "Penampang"],
    "Sarawak": ["Kuching", "Miri", "Sibu", "Bintulu", "Samarahan"],
    "Perlis": ["Kangar", "Arau", "Padang Besar"],
    "Putrajaya": ["Putrajaya"],
    "Labuan": ["Labuan"]
};

export default function VerificationPage() {
    const [users, setUsers] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editData, setEditData] = useState<Partial<Profile> & {
        venue_name?: string;
        venue_address?: string;
        venue_contact?: string;
        venue_courts?: string;
        venue_facilities?: string[];
    }>({});
    const [districts, setDistricts] = useState<string[]>([]);

    const fetchUsers = async () => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setUsers(data || []);
        } catch (error) {
            console.error("Error fetching users:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();

        // Real-time updates
        const channel = supabase
            .channel('schema-db-changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'profiles' },
                () => fetchUsers()
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const handleVerify = async (userId: string) => {
        // Optimistic update for instant UI feedback
        setUsers(prev => prev.map(user =>
            user.id === userId ? { ...user, status: 'verified' as const } : user
        ));

        try {
            const { error } = await supabase
                .from('profiles')
                .update({ status: 'verified' })
                .eq('id', userId);

            if (error) throw error;
        } catch (error) {
            console.error("Error verifying user:", error);
            alert("Failed to verify user. Please try again.");
            fetchUsers(); // Rollback to actual data on error
        }
    };

    const handleDetails = async (user: Profile) => {
        setSelectedUser(user);

        let venueInfo = {};
        if (user.role === 'venue-owner') {
            const { data: venueData } = await supabase
                .from('venues')
                .select('*')
                .eq('owner_id', user.id)
                .single();

            if (venueData) {
                venueInfo = {
                    venue_name: venueData.name,
                    venue_address: venueData.address,
                    venue_contact: venueData.contact_number,
                    venue_courts: venueData.total_courts.toString(),
                    venue_facilities: venueData.facilities
                };
            }
        }

        setEditData({
            first_name: user.first_name,
            last_name: user.last_name,
            email: user.email,
            password: user.password,
            nationality: user.nationality,
            state: user.state,
            district: user.district,
            role: user.role,
            phone_number: user.phone_number,
            date_of_birth: user.date_of_birth,
            preferred_foot: user.preferred_foot,
            position: user.position,
            skill_level: user.skill_level,
            ...venueInfo
        });

        if (user.state && MALAYSIA_DATA[user.state]) {
            setDistricts(MALAYSIA_DATA[user.state]);
        } else {
            setDistricts([]);
        }

        setIsModalOpen(true);
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUser) return;

        try {
            // Split data for profiles and venues
            const {
                venue_name, venue_address, venue_contact, venue_courts, venue_facilities,
                ...profileData
            } = editData;

            // Update profile
            const { error: profileError } = await supabase
                .from('profiles')
                .update(profileData)
                .eq('id', selectedUser.id);

            if (profileError) throw profileError;

            // Update venue if role is venue-owner
            if (editData.role === 'venue-owner') {
                const { error: venueError } = await supabase
                    .from('venues')
                    .update({
                        name: venue_name,
                        address: venue_address,
                        contact_number: venue_contact,
                        total_courts: parseInt(venue_courts || "0"),
                        facilities: venue_facilities
                    })
                    .eq('owner_id', selectedUser.id);

                if (venueError) throw venueError;
            }

            setIsModalOpen(false);
            fetchUsers();
        } catch (error) {
            console.error("Error updating user:", error);
            alert("Failed to update user.");
        }
    };

    const handleDelete = async (userId: string) => {
        if (!confirm("Are you sure you want to delete this user? This action cannot be undone and will remove all associated data.")) {
            return;
        }

        try {
            const response = await fetch('/api/delete-user', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ userId }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to delete user');
            }

            alert("User deleted successfully.");
            setIsModalOpen(false);
            fetchUsers();
        } catch (error: any) {
            alert(`Failed to delete user: ${error.message}`);
        }
    };

    return (
        <div className="dashboard-container">
            <header className="dashboard-header">
                <h1>User Verification</h1>
                <p>Review and verify user profiles for platform security.</p>
            </header>

            <Card title="All Registered Users" variant="glass">
                <div className="table-container">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Role</th>
                                <th>Nationality</th>
                                <th>Location</th>
                                <th>Joined Date</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>Loading users...</td>
                                </tr>
                            ) : users.length === 0 ? (
                                <tr>
                                    <td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>No users found.</td>
                                </tr>
                            ) : (
                                users.map((user) => (
                                    <tr key={user.id}>
                                        <td>
                                            <div className="user-name">
                                                {user.first_name} {user.last_name}
                                            </div>
                                            <div className="user-id">{user.id.substring(0, 8)}...</div>
                                        </td>
                                        <td>
                                            <span className={`role-badge ${user.role}`}>
                                                {user.role}
                                            </span>
                                        </td>
                                        <td>{user.nationality}</td>
                                        <td>
                                            {user.state ? `${user.district}, ${user.state}` : 'N/A'}
                                        </td>
                                        <td>
                                            {new Date(user.created_at).toLocaleDateString()}
                                        </td>
                                        <td>
                                            <span className={`status-badge ${user.status || 'pending'}`}>
                                                {user.status || 'pending'}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="action-buttons">
                                                {user.status !== 'verified' ? (
                                                    <Button
                                                        variant="primary"
                                                        onClick={() => handleVerify(user.id)}
                                                    >
                                                        Verify
                                                    </Button>
                                                ) : (
                                                    <span className="verified-text">✓ Verified</span>
                                                )}
                                                <Button variant="secondary" onClick={() => handleDetails(user)}>Details</Button>
                                                <button
                                                    onClick={() => handleDelete(user.id)}
                                                    style={{
                                                        background: 'rgba(255, 77, 77, 0.1)',
                                                        color: '#ff4d4d',
                                                        border: '1px solid rgba(255, 77, 77, 0.2)',
                                                        padding: '0.5rem 1rem',
                                                        borderRadius: '8px',
                                                        cursor: 'pointer',
                                                        fontSize: '0.85rem'
                                                    }}
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="User Details & Management"
            >
                {selectedUser && (
                    <form onSubmit={handleUpdate} className="edit-form">
                        <div className="form-grid">
                            <div className="form-group">
                                <label>First Name</label>
                                <input
                                    type="text"
                                    value={editData.first_name || ""}
                                    onChange={(e) => setEditData({ ...editData, first_name: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label>Last Name</label>
                                <input
                                    type="text"
                                    value={editData.last_name || ""}
                                    onChange={(e) => setEditData({ ...editData, last_name: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="form-grid">
                            <div className="form-group">
                                <label>Email Address</label>
                                <input
                                    type="email"
                                    value={editData.email || ""}
                                    onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label>Password</label>
                                <input
                                    type="text"
                                    value={editData.password || ""}
                                    onChange={(e) => setEditData({ ...editData, password: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Nationality</label>
                            <select
                                className="admin-select"
                                value={editData.nationality || ""}
                                onChange={(e) => setEditData({ ...editData, nationality: e.target.value })}
                            >
                                <option value="Malaysian">Malaysian</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                        <div className="form-grid">
                            <div className="form-group">
                                <label>Date of Birth</label>
                                <input
                                    type="date"
                                    value={editData.date_of_birth || ""}
                                    onChange={(e) => setEditData({ ...editData, date_of_birth: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label>Phone Number</label>
                                <input
                                    type="tel"
                                    value={editData.phone_number || ""}
                                    onChange={(e) => setEditData({ ...editData, phone_number: e.target.value })}
                                />
                            </div>
                        </div>
                        {editData.nationality === "Malaysian" ? (
                            <div className="form-grid">
                                <div className="form-group">
                                    <label>State (Negeri)</label>
                                    <select
                                        className="admin-select"
                                        value={editData.state || ""}
                                        onChange={(e) => {
                                            const newState = e.target.value;
                                            setEditData({ ...editData, state: newState, district: "" });
                                            if (newState && MALAYSIA_DATA[newState]) {
                                                setDistricts(MALAYSIA_DATA[newState]);
                                            } else {
                                                setDistricts([]);
                                            }
                                        }}
                                    >
                                        <option value="">Select State</option>
                                        {Object.keys(MALAYSIA_DATA).sort().map(s => (
                                            <option key={s} value={s}>{s}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>District (Daerah)</label>
                                    <select
                                        className="admin-select"
                                        value={editData.district || ""}
                                        onChange={(e) => setEditData({ ...editData, district: e.target.value })}
                                        disabled={!editData.state}
                                    >
                                        <option value="">Select District</option>
                                        {districts.map(d => (
                                            <option key={d} value={d}>{d}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        ) : (
                            <div className="form-group">
                                <label>Location (City, Country)</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Singapore"
                                    value={editData.state || ""}
                                    onChange={(e) => setEditData({ ...editData, state: e.target.value, district: "" })}
                                />
                            </div>
                        )}
                        <div className="form-grid">
                            <div className="form-group">
                                <label>Preferred Foot</label>
                                <select
                                    value={editData.preferred_foot || ""}
                                    onChange={(e) => setEditData({ ...editData, preferred_foot: e.target.value })}
                                    className="admin-select"
                                >
                                    <option value="Right">Right</option>
                                    <option value="Left">Left</option>
                                    <option value="Both">Both</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Position</label>
                                <select
                                    value={editData.position || ""}
                                    onChange={(e) => setEditData({ ...editData, position: e.target.value })}
                                    className="admin-select"
                                >
                                    <option value="Forward">Forward</option>
                                    <option value="Midfielder">Midfielder</option>
                                    <option value="Defender">Defender</option>
                                    <option value="Goalkeeper">Goalkeeper</option>
                                </select>
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Skill Level</label>
                            <select
                                value={editData.skill_level || ""}
                                onChange={(e) => setEditData({ ...editData, skill_level: e.target.value })}
                                className="admin-select"
                            >
                                <option value="Beginner">Beginner</option>
                                <option value="Intermediate">Intermediate</option>
                                <option value="Advanced">Advanced</option>
                                <option value="Pro">Pro</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Role</label>
                            <select
                                value={editData.role || ""}
                                onChange={(e) => setEditData({ ...editData, role: e.target.value as any })}
                                className="admin-select"
                            >
                                <option value="player">Player</option>
                                <option value="venue-owner">Venue Owner</option>
                            </select>
                        </div>

                        {editData.role === 'venue-owner' && (
                            <div className="venue-section" style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                                <h3 style={{ marginBottom: '1rem', fontSize: '1rem', color: '#00f2fe' }}>Venue Details</h3>
                                <div className="form-group">
                                    <label>Venue Name</label>
                                    <input
                                        type="text"
                                        value={editData.venue_name || ""}
                                        onChange={(e) => setEditData({ ...editData, venue_name: e.target.value })}
                                        placeholder="e.g. Arena Futsal Subang"
                                    />
                                </div>
                                <div className="form-group" style={{ marginTop: '1rem' }}>
                                    <label>Venue Address</label>
                                    <textarea
                                        style={{
                                            background: 'rgba(255, 255, 255, 0.05)',
                                            border: '1px solid rgba(255, 255, 255, 0.1)',
                                            borderRadius: '8px',
                                            padding: '0.75rem',
                                            color: 'var(--text-primary)',
                                            fontSize: '0.9rem',
                                            width: '100%',
                                            minHeight: '80px'
                                        }}
                                        value={editData.venue_address || ""}
                                        onChange={(e) => setEditData({ ...editData, venue_address: e.target.value })}
                                        placeholder="Full address of the venue"
                                    />
                                </div>
                                <div className="form-grid" style={{ marginTop: '1rem' }}>
                                    <div className="form-group">
                                        <label>Venue Contact</label>
                                        <input
                                            type="tel"
                                            value={editData.venue_contact || ""}
                                            onChange={(e) => setEditData({ ...editData, venue_contact: e.target.value })}
                                            placeholder="e.g. 03-12345678"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Total Courts</label>
                                        <input
                                            type="number"
                                            value={editData.venue_courts || ""}
                                            onChange={(e) => setEditData({ ...editData, venue_courts: e.target.value })}
                                            placeholder="e.g. 4"
                                        />
                                    </div>
                                </div>
                                <div className="form-group" style={{ marginTop: '1rem' }}>
                                    <label>Facilities</label>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.5rem' }}>
                                        {['Surau', 'Parking', 'Changing Room', 'Cafe / Vending'].map(facility => (
                                            <label key={facility} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={editData.venue_facilities?.includes(facility) || false}
                                                    onChange={(e) => {
                                                        const current = editData.venue_facilities || [];
                                                        const updated = e.target.checked
                                                            ? [...current, facility]
                                                            : current.filter(f => f !== facility);
                                                        setEditData({ ...editData, venue_facilities: updated });
                                                    }}
                                                /> {facility}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="modal-actions">
                            <Button variant="primary" type="submit">Save Changes</Button>
                            <Button
                                variant="secondary"
                                type="button"
                                onClick={() => handleDelete(selectedUser.id)}
                                style={{ background: 'rgba(255, 77, 77, 0.1)', color: '#ff4d4d', border: '1px solid rgba(255, 77, 77, 0.2)' }}
                            >
                                Delete User
                            </Button>
                        </div>
                    </form>
                )}
            </Modal>

            <style jsx>{`
        .edit-form {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .form-group label {
          font-size: 0.85rem;
          color: var(--text-secondary);
        }
        .form-group input, .admin-select {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          padding: 0.75rem;
          color: var(--text-primary);
          font-size: 0.9rem;
        }
        .modal-actions {
          display: flex;
          justify-content: space-between;
          margin-top: 1.5rem;
          padding-top: 1.5rem;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }
        .table-container {
          overflow-x: auto;
          margin-top: 1rem;
        }
        .admin-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }
        .admin-table th {
          padding: 1rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          font-weight: 600;
          color: var(--text-secondary);
          font-size: 0.9rem;
        }
        .admin-table td {
          padding: 1rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          font-size: 0.9rem;
        }
        .user-name {
          font-weight: 500;
          color: var(--text-primary);
        }
        .user-id {
          font-size: 0.75rem;
          opacity: 0.5;
        }
        .role-badge {
          padding: 0.25rem 0.6rem;
          border-radius: 20px;
          font-size: 0.75rem;
          text-transform: capitalize;
        }
        .role-badge.player {
          background: rgba(0, 242, 254, 0.1);
          color: #00f2fe;
          border: 1px solid rgba(0, 242, 254, 0.2);
        }
        .role-badge.venue-owner {
          background: rgba(79, 172, 254, 0.1);
          color: #4facfe;
          border: 1px solid rgba(79, 172, 254, 0.2);
        }
        .status-badge {
          padding: 0.25rem 0.6rem;
          border-radius: 4px;
          font-size: 0.75rem;
        }
        .status-badge.pending {
          background: rgba(255, 193, 7, 0.1);
          color: #ffc107;
          border: 1px solid rgba(255, 193, 7, 0.2);
        }
        .status-badge.verified {
          background: rgba(40, 167, 69, 0.1);
          color: #28a745;
          border: 1px solid rgba(40, 167, 69, 0.2);
        }
        .verified-text {
          color: #28a745;
          font-size: 0.8rem;
          font-weight: 600;
          padding: 0.5rem;
        }
        .action-buttons {
          display: flex;
          gap: 0.5rem;
        }
      `}</style>
        </div>
    );
}
