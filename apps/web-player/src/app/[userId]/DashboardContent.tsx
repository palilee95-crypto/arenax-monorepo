"use client";

import React, { useState, useEffect } from "react";
import { Card, Button } from "@arenax/ui";
import { supabase } from "@arenax/database";

interface DashboardContentProps {
    userId: string;
    initialProfile: any;
    initialWalletBalance: number;
}

export default function DashboardContent({ userId, initialProfile, initialWalletBalance }: DashboardContentProps) {
    const [profile, setProfile] = useState<any>(initialProfile);
    const [walletBalance, setWalletBalance] = useState(initialWalletBalance);
    // Loading is only true if we don't have a profile (which shouldn't happen with SSR)
    const [loading, setLoading] = useState(!initialProfile);
    const [imageError, setImageError] = useState(false);
    const [topUpLoading, setTopUpLoading] = useState(false);

    useEffect(() => {
        const fetchPlayerData = async () => {
            try {
                if (userId) {
                    // 1. Fetch Profile (Refetch to ensure freshness)
                    const { data: profileData, error: profileError } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', userId)
                        .single();

                    if (profileError) {
                        console.error("[Dashboard] Profile fetch error:", profileError);
                    } else {
                        setProfile(profileData);
                    }

                    // 2. Fetch Wallet Balance
                    const { data: walletData } = await supabase
                        .from('wallets')
                        .select('balance')
                        .eq('user_id', userId)
                        .single();

                    if (walletData) {
                        setWalletBalance(Number(walletData.balance));
                    }
                }
            } catch (error) {
                console.error("Error fetching player data:", error);
            } finally {
                setLoading(false);
            }
        };

        // Only fetch if we somehow didn't get initial data, OR to subscribe to updates
        // Actually, we can just set up the subscription.
        // fetchPlayerData(); // Let's avoid double-fetching immediately if we have data.

        // Real-time updates
        const channel = supabase
            .channel('player-db-changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` },
                () => {
                    console.log("[Dashboard] Realtime update received!");
                    fetchPlayerData();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [userId]);

    const handleTopUp = async () => {
        try {
            setTopUpLoading(true);
            const amount = 50; // Default top-up amount for now

            const response = await fetch('/api/wallet/topup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: userId,
                    amount: amount,
                }),
            });

            const data = await response.json();

            if (data.invoiceUrl) {
                // Redirect to Xendit Invoice
                window.location.href = data.invoiceUrl;
            } else {
                alert('Failed to create top-up invoice. Please try again.');
            }
        } catch (error) {
            console.error('Top up error:', error);
            alert('An error occurred. Please try again.');
        } finally {
            setTopUpLoading(false);
        }
    };

    return (
        <div className="dashboard-container">
            <section className="hero-section">
                <div className="hero-content">
                    <div className="hero-badges">
                        <div className="hero-badge pro">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path>
                                <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path>
                                <path d="M4 22h16"></path>
                                <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"></path>
                                <path d="M14 14.66V17c0 .55.47.98.97 1.21 1.18.54 2.03 2.03 2.03 3.79"></path>
                                <path d="M12 2v12.66"></path>
                            </svg>
                            {profile?.skill_level?.toUpperCase() || "PLAYER"}
                        </div>
                        <div className="hero-badge">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                            </svg>
                            STARTER XI
                        </div>
                    </div>

                    <h1 className="hero-name">
                        {profile?.first_name?.toUpperCase() || (loading ? "LOADING..." : "PLAYER")} <br />
                        {profile?.last_name?.toUpperCase() || ""}
                    </h1>

                    <div className="market-value-card">
                        <div className="mv-stats-row" style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
                            <div className="mv-info">
                                <div className="mv-label">POSITION</div>
                                <div className="mv-amount">{profile?.position?.toUpperCase() || "N/A"}</div>
                            </div>
                            <div className="mv-divider" style={{ width: '1px', height: '40px', background: 'rgba(255,255,255,0.1)' }}></div>
                            <div className="mv-info">
                                <div className="mv-label">PREFERRED FOOT</div>
                                <div className="mv-amount">{profile?.preferred_foot?.toUpperCase() || "RIGHT"}</div>
                            </div>
                        </div>
                        <div className="mv-badge">{profile?.skill_level || "Active Player"}</div>
                    </div>

                    <div className="hero-socials">
                        <button className="social-btn">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
                            </svg>
                        </button>
                        <button className="social-btn">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                            </svg>
                        </button>
                        <button className="social-btn">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"></path>
                            </svg>
                        </button>
                        <button className="social-btn">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.42a2.78 2.78 0 0 0-1.94 2C1 8.14 1 12 1 12s0 3.86.46 5.58a2.78 2.78 0 0 0 1.94 2c1.72.42 8.6.42 8.6.42s6.88 0 8.6-.42a2.78 2.78 0 0 0 1.94-2C23 15.86 23 12 23 12s0-3.86-.46-5.58z"></path>
                                <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02"></polygon>
                            </svg>
                        </button>
                        <button className="social-btn active">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                            </svg>
                        </button>
                    </div>
                </div>

                <div className="hero-image">
                    {loading ? (
                        // Keep skeleton for when loading is strictly true (e.g. initial profile was null)
                        <div className="skeleton-loader" style={{ width: '100%', height: '100%', background: 'rgba(255,255,255,0.05)' }} />
                    ) : (
                        <img
                            src={(imageError || !profile?.hero_url) ? "" : profile.hero_url}
                            alt="Football Player"
                            onError={() => setImageError(true)}
                            style={{ display: (imageError || !profile?.hero_url) ? 'none' : 'block' }}
                        />
                    )}
                </div>
            </section>

            <div className="dashboard-grid">
                <Card title="Quick Actions" variant="glass">
                    <div className="actions-grid">
                        <Button variant="primary">Find Match</Button>
                        <Button variant="secondary">Book Venue</Button>
                    </div>
                </Card>

                <Card title="My Wallet" variant="glass">
                    <div className="wallet-info">
                        <div className="balance-label">Current Balance</div>
                        <div className="balance-amount">RM {walletBalance.toFixed(2)}</div>
                        <Button
                            variant="secondary"
                            style={{ marginTop: '1rem', width: '100%' }}
                            onClick={handleTopUp}
                            disabled={topUpLoading}
                        >
                            {topUpLoading ? 'Processing...' : 'Top Up'}
                        </Button>
                    </div>
                </Card>

                <Card title="Upcoming Matches" variant="glass" className="span-2">
                    <div className="empty-state">
                        <p>No upcoming matches. Start searching now!</p>
                        <Button variant="primary" style={{ marginTop: '1rem' }}>Find Match</Button>
                    </div>
                </Card>
            </div>
            <style jsx>{`
        .dashboard-container {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }
        .hero-section {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, transparent 100%);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 32px;
          padding: 0;
          position: relative;
          overflow: hidden;
        }
        .hero-content {
          z-index: 1;
          flex: 1;
          padding: 3rem;
        }
        .hero-badges {
          display: flex;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }
        .hero-badge {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: rgba(255, 255, 255, 0.05);
          padding: 0.4rem 0.8rem;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 800;
          letter-spacing: 0.05em;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .hero-badge.pro {
          background: rgba(255, 255, 255, 0.1);
          color: #fff;
          border-color: rgba(255, 255, 255, 0.2);
        }
        .hero-name {
          font-family: var(--font-outfit), sans-serif;
          font-size: 5rem;
          font-weight: 900;
          line-height: 0.9;
          margin-bottom: 2rem;
          letter-spacing: -0.04em;
          background: linear-gradient(180deg, #ffffff 20%, #888888 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));
        }
        .market-value-card {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 24px;
          padding: 1.5rem 2rem;
          display: inline-flex;
          align-items: center;
          gap: 2rem;
          margin-bottom: 2rem;
        }
        .mv-label {
          font-size: 0.7rem;
          color: var(--text-muted);
          font-weight: 800;
          letter-spacing: 0.1em;
          margin-bottom: 0.25rem;
        }
        .mv-amount {
          font-size: 1.5rem;
          font-weight: 900;
          color: #fff;
        }
        .mv-badge {
          background: var(--primary);
          color: #000;
          padding: 0.25rem 0.75rem;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 900;
        }
        .hero-socials {
          display: flex;
          gap: 1rem;
        }
        .social-btn {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        .social-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          transform: translateY(-2px);
        }
        .social-btn.active {
          background: var(--primary);
          color: #000;
          border-color: var(--primary);
          box-shadow: 0 0 20px var(--primary-glow);
        }
        .hero-image {
          flex: 1;
          align-self: stretch;
        }
        .hero-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .dashboard-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1.5rem;
        }
        .span-2 {
          grid-column: span 2;
        }
        .actions-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }
        .wallet-info {
          text-align: center;
        }
        .balance-label {
          font-size: 0.8rem;
          color: var(--text-muted);
          margin-bottom: 0.5rem;
        }
        .balance-amount {
          font-size: 2.5rem;
          font-weight: 900;
          color: var(--primary);
        }
        .empty-state {
          text-align: center;
          padding: 2rem;
          color: var(--text-muted);
        }

        @media (max-width: 1024px) {
          .dashboard-grid {
            grid-template-columns: 1fr 1fr;
          }
          .span-2 {
            grid-column: span 2;
          }
        }
        @media (min-width: 768px) and (max-width: 1024px) {
          .hero-section {
            padding: 0;
          }
          .hero-content {
            padding: 2rem;
          }
          .hero-name {
            font-size: 3.5rem;
          }
          .hero-image {
            width: 50%;
          }
        }

        @media (max-width: 767px) {
          .hero-section {
            flex-direction: column;
            padding: 0;
            text-align: center;
            gap: 0;
            padding-bottom: 2.5rem;
            background: #0a0a0c;
            border: 1px solid rgba(255, 255, 255, 0.05);
          }
          .hero-content {
            padding: 0 1.5rem;
            position: relative;
            z-index: 10;
          }
          .hero-badges {
            justify-content: center;
            margin-top: -4rem;
            margin-bottom: 1.5rem;
            position: relative;
            z-index: 20;
          }
          .hero-name {
            font-size: 3rem;
          }
          .market-value-card {
            flex-direction: column;
            gap: 1rem;
            padding: 1.5rem;
            width: 100%;
          }
          .mv-stats-row {
            width: 100%;
            justify-content: center;
          }
          .hero-socials {
            justify-content: center;
          }
          .hero-image {
            order: -1;
            width: 100%;
            margin: 0;
            position: relative;
            height: 350px;
            overflow: hidden;
          }
          .hero-image::after {
            content: '';
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            height: 150px;
            background: linear-gradient(to top, rgba(10, 10, 12, 1) 0%, rgba(10, 10, 12, 0.8) 30%, transparent 100%);
            z-index: 5;
            pointer-events: none;
          }
          .hero-image img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            border-radius: 32px 32px 0 0;
            filter: none;
            display: block;
          }
          .dashboard-grid {
            grid-template-columns: 1fr;
          }
          .span-2 {
            grid-column: span 1;
          }
        }
      `}</style>
        </div>
    );
}
