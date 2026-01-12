"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@arenax/database";

export default function LogoutPage() {
    const router = useRouter();

    useEffect(() => {
        const handleLogout = async () => {
            try {
                console.log("Logging out from web-player...");
                // 1. Sign out from Supabase
                await supabase.auth.signOut();

                // 2. Clear legacy cookies
                const cookiesToClear = [
                    'arenax_player_id',
                    'arenax_venue_id',
                    'arenax_admin_id'
                ];

                // Get domain for cross-subdomain cookies
                const hostname = window.location.hostname;
                const domain = hostname.includes('.') ? `.${hostname.split('.').slice(-2).join('.')}` : '';
                const domainAttr = domain ? `; domain=${domain}` : '';

                cookiesToClear.forEach(name => {
                    // Clear on current path/domain
                    document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
                    // Clear on wildcard domain
                    if (domainAttr) {
                        document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax${domainAttr}`;
                    }
                });

                // 3. Redirect to central auth logout page to ensure session is cleared there too
                const authUrl = process.env.NEXT_PUBLIC_AUTH_URL || 'https://arenax.my';
                window.location.href = `${authUrl}/logout`;
            } catch (error) {
                console.error("Logout error:", error);
                window.location.href = "/";
            }
        };

        handleLogout();
    }, [router]);

    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh',
            background: '#0a0a0c',
            color: 'white',
            fontFamily: 'system-ui, sans-serif'
        }}>
            <div style={{ textAlign: 'center' }}>
                <h2 style={{ marginBottom: '1rem' }}>Logging you out...</h2>
                <div className="loader"></div>
            </div>
            <style jsx>{`
                .loader {
                    border: 3px solid rgba(255, 255, 255, 0.1);
                    border-top: 3px solid #00ff88;
                    border-radius: 50%;
                    width: 30px;
                    height: 30px;
                    animation: spin 1s linear infinite;
                    margin: 0 auto;
                }
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
