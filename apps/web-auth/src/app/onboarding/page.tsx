"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button, Card } from "@arenax/ui";
import { supabase } from "@arenax/database";

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

function OnboardingContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const role = searchParams.get("role") || "player";
    const firstName = searchParams.get("firstName") || "";
    const lastName = searchParams.get("lastName") || "";
    const email = searchParams.get("email") || "";
    const password = searchParams.get("password") || "";

    // State management
    const [nationality, setNationality] = useState("Malaysian");
    const [state, setState] = useState("");
    const [district, setDistrict] = useState("");
    const [districts, setDistricts] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [venueName, setVenueName] = useState("");
    const [venueAddress, setVenueAddress] = useState("");
    const [venueContact, setVenueContact] = useState("");
    const [venueCourts, setVenueCourts] = useState("");
    const [dob, setDob] = useState("");
    const [phone, setPhone] = useState("");
    const [preferredFoot, setPreferredFoot] = useState("Right");
    const [position, setPosition] = useState("Forward");
    const [skillLevel, setSkillLevel] = useState("Beginner");
    const [error, setError] = useState<string | null>(null);

    // Update districts when state changes
    useEffect(() => {
        if (state && MALAYSIA_DATA[state]) {
            setDistricts(MALAYSIA_DATA[state]);
            setDistrict(""); // Reset district when state changes
        } else {
            setDistricts([]);
        }
    }, [state]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // 1. Sign up with Supabase Auth
            console.log("Attempting Supabase SignUp with:", email);
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: email?.trim(),
                password: password?.trim(),
                options: {
                    data: {
                        first_name: firstName?.trim(),
                        last_name: lastName?.trim(),
                        role: role
                    },
                    emailRedirectTo: `${window.location.origin}/auth/callback`
                }
            });

            console.log("SignUp Result:", { authData, authError });

            if (authError) {
                console.error("SignUp Error:", authError);
                throw authError;
            }

            if (!authData.user) throw new Error("Signup failed");

            const userId = authData.user.id;

            // 2. Insert into profiles table
            // Note: If you have a trigger on auth.users, this might be redundant or cause a duplicate key error.
            // For now, we assume manual insertion is needed or handled gracefully.
            if (role === "player") {
                const { error: insertError } = await supabase
                    .from('profiles')
                    .upsert([ // Use upsert to handle potential trigger conflicts
                        {
                            id: userId,
                            first_name: firstName?.trim(),
                            last_name: lastName?.trim(),
                            email: email?.trim(),
                            // password: password?.trim(), // DO NOT STORE PASSWORD IN PLAIN TEXT
                            role: role,
                            nationality: nationality?.trim(),
                            state: state?.trim() || null,
                            district: district?.trim() || null,
                            date_of_birth: dob,
                            phone_number: phone?.trim(),
                            preferred_foot: preferredFoot,
                            position: position,
                            skill_level: skillLevel,
                        }
                    ])
                    .select();

                if (insertError) throw insertError;

                // Set cookie for session persistence (legacy support)
                document.cookie = `arenax_player_id=${userId}; path=/; max-age=86400; SameSite=Lax`;

                // Check if email confirmation is required
                if (authData.user && !authData.session) {
                    alert("Registration successful! Please check your email to verify your account.");
                    window.location.href = '/'; // Redirect to login
                    return;
                }

                window.location.href = `${process.env.NEXT_PUBLIC_PLAYER_URL || 'http://localhost:3001'}/${userId}`;
            } else if (role === "venue-owner") {
                // Save profile first
                const { error: profileError } = await supabase
                    .from('profiles')
                    .upsert([{
                        id: userId,
                        first_name: firstName?.trim(),
                        last_name: lastName?.trim(),
                        email: email?.trim(),
                        // password: password?.trim(),
                        role: role,
                        nationality: nationality?.trim(),
                        state: state?.trim() || null,
                        district: district?.trim() || null,
                    }])
                    .select();

                if (profileError) throw profileError;

                // Save venue details
                const { error: venueError } = await supabase
                    .from('venues')
                    .insert([
                        {
                            owner_id: userId,
                            name: venueName,
                            address: venueAddress,
                            contact_number: venueContact,
                            total_courts: parseInt(venueCourts),
                            facilities: Array.from((e.target as any).querySelectorAll('input[type="checkbox"]:checked')).map((cb: any) => cb.parentElement.textContent.trim())
                        }
                    ])
                    .select();

                if (venueError) throw venueError;

                // Set cookie for session persistence
                const cookieName = 'arenax_venue_id';
                document.cookie = `${cookieName}=${userId}; path=/; max-age=86400; SameSite=Lax`;

                if (authData.user && !authData.session) {
                    alert("Registration successful! Please check your email to verify your account.");
                    window.location.href = '/';
                    return;
                }

                window.location.href = `${process.env.NEXT_PUBLIC_VENUE_URL || 'http://localhost:3002'}/${userId}`;
            }
        } catch (err: any) {
            console.error("Error saving profile:", err);
            setError(err.message || "An error occurred while saving your profile. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="auth-container">
            <Card className="auth-card" title={role === "player" ? "Player Profile" : "Venue Details"}>
                <p className="auth-subtitle">
                    {role === "player"
                        ? "Tell us more about your game"
                        : "Set up your venue for bookings"}
                </p>

                <form className="auth-form" onSubmit={handleSubmit}>
                    {error && (
                        <div style={{
                            background: 'rgba(255, 77, 77, 0.1)',
                            border: '1px solid #ff4d4d',
                            padding: '0.8rem',
                            borderRadius: '8px',
                            color: '#ff4d4d',
                            fontSize: '0.8rem',
                            marginBottom: '1rem',
                            textAlign: 'center'
                        }}>
                            {error}
                        </div>
                    )}
                    {role === "player" && (
                        <>
                            <div className="form-group">
                                <label>Date of Birth</label>
                                <input
                                    type="date"
                                    value={dob}
                                    onChange={(e) => setDob(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Phone Number</label>
                                <input
                                    type="tel"
                                    placeholder="e.g. 012-3456789"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    required
                                />
                            </div>
                        </>
                    )}

                    {/* Shared Location Fields for both Player and Venue Owner */}
                    <div className="form-group">
                        <label>Nationality</label>
                        <select
                            className="auth-select"
                            value={nationality}
                            onChange={(e) => setNationality(e.target.value)}
                            required
                        >
                            <option value="Malaysian">Malaysian</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>

                    {nationality === "Malaysian" ? (
                        <div className="form-grid">
                            <div className="form-group">
                                <label>State (Negeri)</label>
                                <select
                                    className="auth-select"
                                    value={state}
                                    onChange={(e) => setState(e.target.value)}
                                    required
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
                                    className="auth-select"
                                    value={district}
                                    onChange={(e) => setDistrict(e.target.value)}
                                    disabled={!state}
                                    required
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
                                value={state}
                                onChange={(e) => setState(e.target.value)}
                                required
                            />
                        </div>
                    )}

                    {role === "player" ? (
                        <>
                            <div className="form-grid">
                                <div className="form-group">
                                    <label>Preferred Foot</label>
                                    <select
                                        className="auth-select"
                                        value={preferredFoot}
                                        onChange={(e) => setPreferredFoot(e.target.value)}
                                        required
                                    >
                                        <option value="Right">Right</option>
                                        <option value="Left">Left</option>
                                        <option value="Both">Both</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Position</label>
                                    <select
                                        className="auth-select"
                                        value={position}
                                        onChange={(e) => setPosition(e.target.value)}
                                        required
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
                                    className="auth-select"
                                    value={skillLevel}
                                    onChange={(e) => setSkillLevel(e.target.value)}
                                    required
                                >
                                    <option value="Beginner">Beginner</option>
                                    <option value="Intermediate">Intermediate</option>
                                    <option value="Advanced">Advanced</option>
                                    <option value="Pro">Pro</option>
                                </select>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="form-group">
                                <label>Venue Name</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Arena Futsal Subang"
                                    value={venueName}
                                    onChange={(e) => setVenueName(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Location / Address</label>
                                <textarea
                                    className="auth-textarea"
                                    placeholder="Full address of your venue"
                                    rows={3}
                                    value={venueAddress}
                                    onChange={(e) => setVenueAddress(e.target.value)}
                                    required
                                ></textarea>
                            </div>
                            <div className="form-grid">
                                <div className="form-group">
                                    <label>Contact Number</label>
                                    <input
                                        type="tel"
                                        placeholder="e.g. 03-12345678"
                                        value={venueContact}
                                        onChange={(e) => setVenueContact(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Total Courts</label>
                                    <input
                                        type="number"
                                        placeholder="e.g. 4"
                                        value={venueCourts}
                                        onChange={(e) => setVenueCourts(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Facilities</label>
                                <div className="checkbox-group">
                                    <label className="checkbox-item">
                                        <input type="checkbox" /> Surau
                                    </label>
                                    <label className="checkbox-item">
                                        <input type="checkbox" /> Parking
                                    </label>
                                    <label className="checkbox-item">
                                        <input type="checkbox" /> Changing Room
                                    </label>
                                    <label className="checkbox-item">
                                        <input type="checkbox" /> Cafe / Vending
                                    </label>
                                </div>
                            </div>
                        </>
                    )}

                    <div className="auth-actions" style={{ marginTop: '1rem' }}>
                        <Button variant="primary" type="submit" style={{ width: '100%' }} disabled={loading}>
                            {loading ? "Saving..." : "Complete Setup"}
                        </Button>
                    </div>
                </form>
            </Card>
        </main>
    );
}

export default function OnboardingPage() {
    return (
        <Suspense fallback={<div className="auth-container"><Card className="auth-card">Loading...</Card></div>}>
            <OnboardingContent />
        </Suspense>
    );
}
