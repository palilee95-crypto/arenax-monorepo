"use client";

import React, { useState, useEffect } from "react";
import { Card, Button } from "@arenax/ui";
import { supabase } from "@arenax/database";
import { useParams, useRouter } from "next/navigation";

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
    const router = useRouter();
    const userId = params.userId;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [profile, setProfile] = useState<any>({
        first_name: "",
        last_name: "",
        email: "",
        phone_number: "",
        date_of_birth: "",
        nationality: "Malaysian",
        state: "",
        district: "",
        preferred_foot: "Right",
        position: "Forward",
        skill_level: "Beginner",
        avatar_url: "",
        hero_url: ""
    });

    const [districts, setDistricts] = useState<string[]>([]);

    useEffect(() => {
        const fetchProfile = async () => {
            if (!userId) return;
            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', userId)
                    .single();

                if (error) throw error;
                if (data) {
                    setProfile(data);
                    if (data.state && MALAYSIA_DATA[data.state]) {
                        setDistricts(MALAYSIA_DATA[data.state]);
                    }
                }
            } catch (error) {
                console.error("Error fetching profile:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [userId]);

    useEffect(() => {
        if (profile.state && MALAYSIA_DATA[profile.state]) {
            setDistricts(MALAYSIA_DATA[profile.state]);
        } else {
            setDistricts([]);
        }
    }, [profile.state]);

    // Helper function to compress and resize images
    const compressImage = (file: File, maxWidth: number = 800): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    // Resize if too large
                    if (width > maxWidth) {
                        height = (height * maxWidth) / width;
                        width = maxWidth;
                    }

                    canvas.width = width;
                    canvas.height = height;

                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0, width, height);

                    // Convert to base64 with compression (0.7 quality for JPEG)
                    const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
                    resolve(compressedBase64);
                };
                img.onerror = reject;
                img.src = e.target?.result as string;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            console.log("[Settings] Attempting to save profile for userId:", userId);

            // Verify session
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            if (userError) console.error("[Settings] Session error:", userError);
            console.log("[Settings] Current auth.uid():", user?.id);

            if (user && user.id !== userId) {
                console.warn("[Settings] Warning: userId in URL does not match auth.uid()!");
            }

            // Update profile in Supabase
            const { data, error, count } = await supabase
                .from('profiles')
                .update({
                    first_name: profile.first_name,
                    last_name: profile.last_name,
                    phone_number: profile.phone_number,
                    date_of_birth: profile.date_of_birth,
                    nationality: profile.nationality,
                    state: profile.state,
                    district: profile.district,
                    preferred_foot: profile.preferred_foot,
                    position: profile.position,
                    skill_level: profile.skill_level,
                    avatar_url: profile.avatar_url,
                    hero_url: profile.hero_url
                }, { count: 'exact' })
                .eq('id', userId)
                .select();

            if (error) {
                console.error("[Settings] Update error:", error);
                throw error;
            }

            console.log("[Settings] Update result:", { count, dataLength: data?.length });

            if (!data || data.length === 0) {
                throw new Error("No profile was updated. You might not have permission to update this profile.");
            }

            console.log("[Settings] Profile updated successfully!");
            router.refresh(); // Refresh server components (TopBar/Sidebar) to show new avatar
            alert("Profile updated successfully!");
        } catch (error: any) {
            console.error("[Settings] Error updating profile:", error);
            alert(`Failed to update profile. Error: ${error.message || 'Unknown error'}`);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="loading">Loading settings...</div>;

    return (
        <div className="settings-container">
            <header className="settings-header">
                <h1>Settings</h1>
                <p>Manage your profile and account preferences.</p>
            </header>

            <form onSubmit={handleSave} className="settings-form">
                <div className="settings-grid">
                    {/* Profile Images Section */}
                    <Card title="Profile Appearance" variant="glass" className="span-2">
                        <div className="image-settings">
                            <div className="image-group">
                                <label>Avatar</label>
                                <div className="image-preview-wrapper">
                                    <img
                                        src={profile.avatar_url || "https://ui-avatars.com/api/?name=" + profile.first_name}
                                        alt="Avatar"
                                        className="avatar-preview"
                                        onError={(e) => {
                                            e.currentTarget.src = "https://ui-avatars.com/api/?name=" + profile.first_name;
                                        }}
                                    />
                                    <div className="upload-actions">
                                        <input
                                            type="file"
                                            id="avatar-upload"
                                            accept="image/*"
                                            style={{ display: 'none' }}
                                            onChange={async (e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    try {
                                                        const compressed = await compressImage(file, 400);
                                                        setProfile({ ...profile, avatar_url: compressed });
                                                    } catch (error) {
                                                        console.error("Error compressing image:", error);
                                                        alert("Failed to process image. Please try a smaller file.");
                                                    }
                                                }
                                            }}
                                        />
                                        <Button
                                            variant="secondary"
                                            type="button"
                                            onClick={() => document.getElementById('avatar-upload')?.click()}
                                            style={{ fontSize: '0.85rem', padding: '0.5rem 1rem', width: '100%' }}
                                        >
                                            📁 Upload Image
                                        </Button>
                                    </div>
                                    <input
                                        type="hidden"
                                        placeholder="Or paste image URL..."
                                        value={profile.avatar_url || ""}
                                        onChange={(e) => setProfile({ ...profile, avatar_url: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="image-group">
                                <label>Hero Background</label>
                                <div className="image-preview-wrapper hero">
                                    <img
                                        src={profile.hero_url || "https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&q=80&w=1000"}
                                        alt="Hero"
                                        className="hero-preview"
                                        onError={(e) => {
                                            e.currentTarget.src = "https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&q=80&w=1000";
                                        }}
                                    />
                                    <div className="upload-actions">
                                        <input
                                            type="file"
                                            id="hero-upload"
                                            accept="image/*"
                                            style={{ display: 'none' }}
                                            onChange={async (e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    try {
                                                        const compressed = await compressImage(file, 1200);
                                                        setProfile({ ...profile, hero_url: compressed });
                                                    } catch (error) {
                                                        console.error("Error compressing image:", error);
                                                        alert("Failed to process image. Please try a smaller file.");
                                                    }
                                                }
                                            }}
                                        />
                                        <Button
                                            variant="secondary"
                                            type="button"
                                            onClick={() => document.getElementById('hero-upload')?.click()}
                                            style={{ fontSize: '0.85rem', padding: '0.5rem 1rem', width: '100%' }}
                                        >
                                            📁 Upload Image
                                        </Button>
                                    </div>
                                    <input
                                        type="hidden"
                                        placeholder="Or paste image URL..."
                                        value={profile.hero_url || ""}
                                        onChange={(e) => setProfile({ ...profile, hero_url: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* Personal Info Section */}
                    <Card title="Personal Information" variant="glass">
                        <div className="form-grid-inner">
                            <div className="form-group">
                                <label>First Name</label>
                                <input
                                    type="text"
                                    value={profile.first_name}
                                    onChange={(e) => setProfile({ ...profile, first_name: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Last Name</label>
                                <input
                                    type="text"
                                    value={profile.last_name}
                                    onChange={(e) => setProfile({ ...profile, last_name: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Date of Birth</label>
                                <input
                                    type="date"
                                    value={profile.date_of_birth}
                                    onChange={(e) => setProfile({ ...profile, date_of_birth: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Phone Number</label>
                                <input
                                    type="tel"
                                    value={profile.phone_number}
                                    onChange={(e) => setProfile({ ...profile, phone_number: e.target.value })}
                                    required
                                />
                            </div>
                        </div>
                    </Card>

                    {/* Game Preferences Section */}
                    <Card title="Game Preferences" variant="glass">
                        <div className="form-grid-inner">
                            <div className="form-group">
                                <label>Preferred Foot</label>
                                <select
                                    value={profile.preferred_foot}
                                    onChange={(e) => setProfile({ ...profile, preferred_foot: e.target.value })}
                                >
                                    <option value="Right">Right</option>
                                    <option value="Left">Left</option>
                                    <option value="Both">Both</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Position</label>
                                <select
                                    value={profile.position}
                                    onChange={(e) => setProfile({ ...profile, position: e.target.value })}
                                >
                                    <option value="Forward">Forward</option>
                                    <option value="Midfielder">Midfielder</option>
                                    <option value="Defender">Defender</option>
                                    <option value="Goalkeeper">Goalkeeper</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Skill Level</label>
                                <select
                                    value={profile.skill_level}
                                    onChange={(e) => setProfile({ ...profile, skill_level: e.target.value })}
                                >
                                    <option value="Beginner">Beginner</option>
                                    <option value="Intermediate">Intermediate</option>
                                    <option value="Advanced">Advanced</option>
                                    <option value="Pro">Pro</option>
                                </select>
                            </div>
                        </div>
                    </Card>

                    {/* Location Section */}
                    <Card title="Location" variant="glass" className="span-2">
                        <div className="form-grid-inner three-cols">
                            <div className="form-group">
                                <label>Nationality</label>
                                <select
                                    value={profile.nationality}
                                    onChange={(e) => setProfile({ ...profile, nationality: e.target.value })}
                                >
                                    <option value="Malaysian">Malaysian</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            {profile.nationality === "Malaysian" ? (
                                <>
                                    <div className="form-group">
                                        <label>State</label>
                                        <select
                                            value={profile.state}
                                            onChange={(e) => setProfile({ ...profile, state: e.target.value })}
                                        >
                                            <option value="">Select State</option>
                                            {Object.keys(MALAYSIA_DATA).sort().map(s => (
                                                <option key={s} value={s}>{s}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>District</label>
                                        <select
                                            value={profile.district}
                                            onChange={(e) => setProfile({ ...profile, district: e.target.value })}
                                            disabled={!profile.state}
                                        >
                                            <option value="">Select District</option>
                                            {districts.map(d => (
                                                <option key={d} value={d}>{d}</option>
                                            ))}
                                        </select>
                                    </div>
                                </>
                            ) : (
                                <div className="form-group">
                                    <label>Location (City, Country)</label>
                                    <input
                                        type="text"
                                        value={profile.state}
                                        onChange={(e) => setProfile({ ...profile, state: e.target.value })}
                                    />
                                </div>
                            )}
                        </div>
                    </Card>
                </div>

                <div className="form-actions">
                    <Button variant="primary" type="submit" disabled={saving}>
                        {saving ? "Saving Changes..." : "Save All Changes"}
                    </Button>
                    <Button variant="secondary" type="button" onClick={() => router.back()}>Cancel</Button>
                </div>
            </form>

            <style jsx>{`
                .settings-container {
                    display: flex;
                    flex-direction: column;
                    gap: 2rem;
                    max-width: 1200px;
                    margin: 0 auto;
                    padding: 2rem 0;
                }
                .settings-header {
                    margin-bottom: 1rem;
                }
                .settings-header h1 {
                    font-family: var(--font-outfit), sans-serif;
                    font-size: 3.5rem;
                    margin-bottom: 0.5rem;
                    background: linear-gradient(180deg, #ffffff 20%, #888888 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                    font-weight: 900;
                    letter-spacing: -0.04em;
                    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));
                }
                .settings-header p {
                    color: rgba(255, 255, 255, 0.6);
                    font-size: 1rem;
                }
                .settings-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(450px, 1fr));
                    gap: 1.5rem;
                }
                .span-2 {
                    grid-column: 1 / -1;
                }
                .form-grid-inner {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 1.25rem;
                }
                .form-grid-inner.three-cols {
                    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
                }
                .form-group {
                    display: flex;
                    flex-direction: column;
                    gap: 0.6rem;
                }
                .form-group label {
                    font-size: 0.75rem;
                    font-weight: 600;
                    color: rgba(255, 255, 255, 0.8);
                    text-transform: uppercase;
                    letter-spacing: 1.2px;
                }
                .form-group input,
                .form-group select {
                    background: linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%);
                    backdrop-filter: blur(10px);
                    border: 1px solid rgba(0, 242, 255, 0.15);
                    padding: 0.875rem 1rem;
                    border-radius: 8px;
                    color: #ffffff;
                    outline: none;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    font-size: 0.95rem;
                }
                .form-group input:hover,
                .form-group select:hover {
                    border-color: rgba(0, 242, 255, 0.3);
                    background: linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.04) 100%);
                }
                .form-group input:focus,
                .form-group select:focus {
                    border-color: #00f2ff;
                    background: linear-gradient(135deg, rgba(0, 242, 255, 0.1) 0%, rgba(0, 242, 255, 0.05) 100%);
                    box-shadow: 0 0 0 3px rgba(0, 242, 255, 0.1), 
                                0 0 20px rgba(0, 242, 255, 0.2);
                }
                .form-group input::placeholder {
                    color: rgba(255, 255, 255, 0.3);
                }
                .image-settings {
                    display: grid;
                    grid-template-columns: 300px 1fr;
                    gap: 2.5rem;
                    align-items: stretch;
                }
                .image-group {
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                    height: 100%;
                }
                .image-group label {
                    font-size: 0.75rem;
                    font-weight: 600;
                    color: rgba(255, 255, 255, 0.8);
                    text-transform: uppercase;
                    letter-spacing: 1.2px;
                    margin-bottom: 0.5rem;
                }
                .image-preview-wrapper {
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                    flex: 1;
                }
                .upload-actions {
                    margin-top: auto;
                    width: 100%;
                }
                .avatar-preview {
                    width: 140px;
                    height: 140px;
                    border-radius: 50%;
                    object-fit: cover;
                    border: 2px solid #009e60;
                    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
                    transition: all 0.3s ease;
                    margin: 0 auto;
                }
                .avatar-preview:hover {
                    transform: scale(1.05);
                    border-color: #00c77a;
                    box-shadow: 0 15px 50px rgba(0, 0, 0, 0.4),
                                0 0 30px rgba(0, 158, 96, 0.4);
                }
                .hero-preview {
                    width: 100%;
                    height: 180px;
                    border-radius: 12px;
                    object-fit: cover;
                    border: 2px solid #009e60;
                    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
                    transition: all 0.3s ease;
                }
                .hero-preview:hover {
                    transform: scale(1.02);
                    border-color: #00c77a;
                    box-shadow: 0 15px 50px rgba(0, 0, 0, 0.4),
                                0 0 30px rgba(0, 158, 96, 0.4);
                }
                .form-actions {
                    margin-top: 2.5rem;
                    padding-top: 2rem;
                    border-top: 1px solid rgba(255, 255, 255, 0.1);
                    display: flex;
                    gap: 1rem;
                    justify-content: flex-end;
                }
                .form-actions :global(button) {
                    min-width: 160px;
                    padding: 0.875rem 2rem;
                    font-weight: 600;
                    font-size: 0.95rem;
                    letter-spacing: 0.5px;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                }
                .form-actions :global(button[type="submit"]) {
                    background: linear-gradient(135deg, #00f2ff 0%, #0099ff 100%);
                    box-shadow: 0 4px 15px rgba(0, 242, 255, 0.3);
                }
                .form-actions :global(button[type="submit"]:hover:not(:disabled)) {
                    transform: translateY(-2px);
                    box-shadow: 0 6px 20px rgba(0, 242, 255, 0.4);
                }
                .form-actions :global(button[type="button"]) {
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                }
                .form-actions :global(button[type="button"]:hover) {
                    background: rgba(255, 255, 255, 0.1);
                    border-color: rgba(255, 255, 255, 0.2);
                }
                .loading {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 50vh;
                    font-size: 1.2rem;
                    color: rgba(255, 255, 255, 0.6);
                }
                
                @media (max-width: 768px) {
                    .settings-grid {
                        grid-template-columns: 1fr;
                    }
                    .image-settings {
                        grid-template-columns: 1fr;
                        gap: 2rem;
                    }
                    .form-grid-inner,
                    .form-grid-inner.three-cols {
                        grid-template-columns: 1fr;
                    }
                    .form-actions {
                        flex-direction: column-reverse;
                    }
                    .form-actions :global(button) {
                        width: 100%;
                    }
                }
            `}</style>
        </div>
    );
}
