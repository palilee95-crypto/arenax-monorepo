"use client";

import React, { useState, useEffect } from "react";
import { Card, Button } from "@arenax/ui";
import { supabase } from "@arenax/database";
import { useParams } from "next/navigation";

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

export default function SettingsPage() {
    const params = useParams();
    const userId = params.userId as string;

    const [venueId, setVenueId] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        name: "",
        address: "",
        district: "",
        state: "",
        nationality: "Malaysia",
        facilities: "",
        latitude: null as number | null,
        longitude: null as number | null
    });
    const [districts, setDistricts] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const fetchVenue = async () => {
            setLoading(true);
            try {
                const { data } = await supabase
                    .from('venues')
                    .select('*')
                    .eq('owner_id', userId)
                    .single();

                if (data) {
                    setVenueId(data.id);
                    setFormData({
                        name: data.name || "",
                        address: data.address || "",
                        district: data.district || "",
                        state: data.state || "",
                        nationality: data.nationality || "Malaysia",
                        facilities: data.facilities?.join(", ") || "",
                        latitude: data.latitude,
                        longitude: data.longitude
                    });
                }
            } catch (error) {
                console.error("Error fetching venue:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchVenue();
    }, [userId]);

    useEffect(() => {
        if (formData.nationality === "Malaysia" && formData.state && MALAYSIA_DATA[formData.state]) {
            setDistricts(MALAYSIA_DATA[formData.state]);
            const currentDistrict = formData.district;
            const newDistricts = MALAYSIA_DATA[formData.state];
            if (currentDistrict && !newDistricts.includes(currentDistrict)) {
                setFormData(prev => ({ ...prev, district: "" }));
            }
        } else {
            setDistricts([]);
        }
    }, [formData.state, formData.nationality]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const facilitiesArray = formData.facilities.split(',').map(f => f.trim()).filter(f => f);

            const updates = {
                name: formData.name,
                address: formData.address,
                district: formData.district,
                state: formData.state,
                nationality: formData.nationality,
                facilities: facilitiesArray,
                latitude: formData.latitude,
                longitude: formData.longitude
            };

            if (venueId) {
                const { error } = await supabase
                    .from('venues')
                    .update(updates)
                    .eq('id', venueId);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('venues')
                    .insert({ ...updates, owner_id: userId });
                if (error) throw error;
            }

            alert("Settings saved successfully!");

        } catch (error: any) {
            console.error("Error saving settings:", error);
            alert("Failed to save settings: " + error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleGetLocation = () => {
        if (!navigator.geolocation) {
            alert("Geolocation is not supported by your browser");
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setFormData(prev => ({
                    ...prev,
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                }));
            },
            (error) => {
                console.error("Error getting location:", error);
                alert("Failed to get location: " + error.message);
            }
        );
    };

    return (
        <div className="settings-page">
            <header className="page-header">
                <h1>Venue Settings</h1>
                <p>Update your venue profile and information.</p>
            </header>

            <div className="settings-grid">
                <Card className="settings-card" variant="glass">
                    {loading ? (
                        <div className="loading-state">
                            <div className="spinner"></div>
                            <p>Loading settings...</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSave} className="premium-form">
                            <div className="form-section">
                                <h3 className="section-title">Basic Information</h3>
                                <div className="form-group">
                                    <label>Venue Name</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="Enter venue name"
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Facilities (comma separated)</label>
                                    <input
                                        type="text"
                                        value={formData.facilities}
                                        onChange={e => setFormData({ ...formData, facilities: e.target.value })}
                                        placeholder="e.g. Parking, Shower, Surau"
                                    />
                                </div>
                            </div>

                            <div className="form-section">
                                <h3 className="section-title">Location Details</h3>
                                <div className="form-group">
                                    <label>Address</label>
                                    <textarea
                                        value={formData.address}
                                        onChange={e => setFormData({ ...formData, address: e.target.value })}
                                        placeholder="Enter full address"
                                        rows={3}
                                    />
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Nationality</label>
                                        <select
                                            value={formData.nationality}
                                            onChange={e => setFormData({ ...formData, nationality: e.target.value })}
                                            className="premium-select"
                                        >
                                            <option value="Malaysia">Malaysia</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>State</label>
                                        {formData.nationality === "Malaysia" ? (
                                            <select
                                                value={formData.state}
                                                onChange={e => setFormData({ ...formData, state: e.target.value })}
                                                className="premium-select"
                                            >
                                                <option value="">Select State</option>
                                                {Object.keys(MALAYSIA_DATA).sort().map(s => (
                                                    <option key={s} value={s}>{s}</option>
                                                ))}
                                            </select>
                                        ) : (
                                            <input
                                                type="text"
                                                value={formData.state}
                                                onChange={e => setFormData({ ...formData, state: e.target.value })}
                                                placeholder="Enter State"
                                            />
                                        )}
                                    </div>
                                    <div className="form-group">
                                        <label>District</label>
                                        {formData.nationality === "Malaysia" ? (
                                            <select
                                                value={formData.district}
                                                onChange={e => setFormData({ ...formData, district: e.target.value })}
                                                className="premium-select"
                                                disabled={!formData.state}
                                            >
                                                <option value="">Select District</option>
                                                {districts.map(d => (
                                                    <option key={d} value={d}>{d}</option>
                                                ))}
                                            </select>
                                        ) : (
                                            <input
                                                type="text"
                                                value={formData.district}
                                                onChange={e => setFormData({ ...formData, district: e.target.value })}
                                                placeholder="e.g. Subang Jaya"
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="form-section">
                                <h3 className="section-title">GPS Location</h3>
                                <p className="section-desc">Pin your venue's exact location to enable player check-ins.</p>
                                <div className="location-pin-wrapper">
                                    <div className="coords-display">
                                        <div className="coord-item">
                                            <label>Latitude</label>
                                            <span>{formData.latitude?.toFixed(6) || "Not pinned"}</span>
                                        </div>
                                        <div className="coord-item">
                                            <label>Longitude</label>
                                            <span>{formData.longitude?.toFixed(6) || "Not pinned"}</span>
                                        </div>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        onClick={handleGetLocation}
                                        className="pin-btn"
                                    >
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
                                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                                            <circle cx="12" cy="10" r="3"></circle>
                                        </svg>
                                        {formData.latitude ? "Update Pinned Location" : "Pin Current Location"}
                                    </Button>
                                </div>
                            </div>

                            <div className="form-actions">
                                <Button type="submit" variant="primary" disabled={saving} className="save-btn">
                                    {saving ? "Saving Changes..." : "Save Changes"}
                                </Button>
                            </div>
                        </form>
                    )}
                </Card>

                <div className="settings-info">
                    <Card variant="glass" className="info-card">
                        <h3>Profile Completion</h3>
                        <p>Keep your venue information up to date to help players find and book your courts more easily.</p>
                        <div className="completion-bar">
                            <div className="fill" style={{ width: '85%' }}></div>
                        </div>
                        <span className="percentage">85% Complete</span>
                    </Card>

                    <Card variant="glass" className="info-card">
                        <h3>Need Help?</h3>
                        <p>If you have questions about managing your venue settings, contact our support team.</p>
                        <Button variant="secondary" className="support-btn">Contact Support</Button>
                    </Card>
                </div>
            </div>

            <style jsx>{`
                .settings-page {
                    display: flex;
                    flex-direction: column;
                    gap: 2rem;
                    padding-bottom: 3rem;
                }
                .page-header h1 {
                    font-size: 2.5rem;
                    font-weight: 800;
                    margin-bottom: 0.5rem;
                    background: linear-gradient(135deg, #fff 0%, #a0a0a0 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                }
                .page-header p {
                    color: var(--text-muted);
                    font-size: 1.1rem;
                }
                .settings-grid {
                    display: grid;
                    grid-template-columns: 1fr 320px;
                    gap: 2rem;
                    align-items: start;
                }
                .settings-card {
                    padding: 2rem;
                }
                .premium-form {
                    display: flex;
                    flex-direction: column;
                    gap: 2.5rem;
                }
                .form-section {
                    display: flex;
                    flex-direction: column;
                    gap: 1.5rem;
                }
                .section-title {
                    font-size: 1.1rem;
                    font-weight: 700;
                    color: #fff;
                    padding-bottom: 0.75rem;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                }
                .form-group {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }
                .form-group label {
                    font-size: 0.85rem;
                    font-weight: 600;
                    color: var(--text-muted);
                }
                .form-group input, .form-group textarea, .premium-select {
                    background: rgba(255, 255, 255, 0.03);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 10px;
                    padding: 0.8rem 1rem;
                    color: #fff;
                    font-size: 1rem;
                    transition: all 0.3s ease;
                }
                .form-group input:focus, .form-group textarea:focus, .premium-select:focus {
                    border-color: var(--primary);
                    background: rgba(255, 255, 255, 0.06);
                    outline: none;
                    box-shadow: 0 0 15px rgba(0, 158, 96, 0.1);
                }
                .form-row {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 1.5rem;
                }
                .premium-select option {
                    background: #0a0a0c;
                    color: #fff;
                }
                .section-desc {
                    font-size: 0.9rem;
                    color: var(--text-muted);
                    margin-top: -1rem;
                    margin-bottom: 0.5rem;
                }
                .location-pin-wrapper {
                    display: flex;
                    flex-direction: column;
                    gap: 1.5rem;
                    background: rgba(255, 255, 255, 0.02);
                    padding: 1.5rem;
                    border-radius: 12px;
                    border: 1px solid rgba(255, 255, 255, 0.05);
                }
                .coords-display {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 1.5rem;
                }
                .coord-item {
                    display: flex;
                    flex-direction: column;
                    gap: 0.25rem;
                }
                .coord-item label {
                    font-size: 0.75rem;
                    font-weight: 700;
                    color: var(--text-muted);
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }
                .coord-item span {
                    font-size: 1.1rem;
                    font-weight: 600;
                    color: #fff;
                    font-family: var(--font-outfit), sans-serif;
                }
                .pin-btn {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .form-actions {
                    display: flex;
                    justify-content: flex-end;
                    padding-top: 1rem;
                }
                .save-btn {
                    padding: 0.8rem 2.5rem;
                    font-weight: 700;
                }
                
                .settings-info {
                    display: flex;
                    flex-direction: column;
                    gap: 1.5rem;
                }
                .info-card {
                    padding: 1.5rem;
                }
                .info-card h3 {
                    font-size: 1rem;
                    font-weight: 700;
                    color: #fff;
                    margin-bottom: 0.75rem;
                }
                .info-card p {
                    font-size: 0.85rem;
                    color: var(--text-muted);
                    line-height: 1.5;
                    margin-bottom: 1.5rem;
                }
                .completion-bar {
                    height: 6px;
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 100px;
                    overflow: hidden;
                    margin-bottom: 0.5rem;
                }
                .completion-bar .fill {
                    height: 100%;
                    background: linear-gradient(to right, var(--primary), var(--secondary));
                    border-radius: 100px;
                }
                .percentage {
                    font-size: 0.75rem;
                    font-weight: 700;
                    color: var(--primary);
                }
                .support-btn {
                    width: 100%;
                }

                .loading-state {
                    padding: 5rem 2rem;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 1.5rem;
                    color: var(--text-muted);
                }
                .spinner {
                    width: 40px;
                    height: 40px;
                    border: 3px solid rgba(255, 255, 255, 0.1);
                    border-top-color: var(--primary);
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }

                @media (max-width: 1024px) {
                    .settings-grid {
                        grid-template-columns: 1fr;
                    }
                    .settings-info {
                        order: -1;
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 1.5rem;
                    }
                }
                @media (max-width: 768px) {
                    .settings-info {
                        grid-template-columns: 1fr;
                    }
                    .form-row {
                        grid-template-columns: 1fr;
                    }
                    .save-btn {
                        width: 100%;
                    }
                }
            `}</style>
        </div>
    );
}
