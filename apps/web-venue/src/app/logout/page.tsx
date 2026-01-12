"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@arenax/database";

export default function LogoutPage() {
    const router = useRouter();

    useEffect(() => {
        const handleLogout = async () => {
            try {
                await supabase.auth.signOut();
                const cookiesToClear = ['arenax_venue_id'];

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
                const authUrl = process.env.NEXT_PUBLIC_AUTH_URL || 'https://arenax.myposhub.my';
                window.location.href = `${authUrl}/logout`;
            } catch (error) {
                console.error("Logout error:", error);
                window.location.href = "/";
            }
        };
        handleLogout();
    }, [router]);

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#0a0a0c', color: 'white' }}>
            <div style={{ textAlign: 'center' }}><h2>Logging you out...</h2></div>
        </div>
    );
}
