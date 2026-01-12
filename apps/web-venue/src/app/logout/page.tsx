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
                const cookies = ['arenax_venue_id'];
                cookies.forEach(name => {
                    document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
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
