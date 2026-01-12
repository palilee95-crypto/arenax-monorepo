"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@arenax/database";
import { Card } from "@arenax/ui";

function AuthCallbackContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [status, setStatus] = useState("Verifying your email...");

    useEffect(() => {
        const handleCallback = async () => {
            const code = searchParams.get("code");
            const error = searchParams.get("error");
            const error_description = searchParams.get("error_description");

            if (error) {
                setStatus(`Error: ${error_description || error}`);
                return;
            }

            if (code) {
                try {
                    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

                    if (exchangeError) {
                        throw exchangeError;
                    }

                    setStatus("Email verified successfully! Redirecting...");

                    // Fetch user role to redirect correctly
                    if (data.user) {
                        const { data: profile } = await supabase
                            .from('profiles')
                            .select('role')
                            .eq('id', data.user.id)
                            .single();

                        const role = profile?.role || data.user.user_metadata?.role || 'player';

                        // Set legacy cookies
                        const cookieName = role === 'player' ? 'arenax_player_id' :
                            role === 'venue-owner' ? 'arenax_venue_id' :
                                'arenax_admin_id';

                        // Get domain for cross-subdomain cookies
                        const hostname = window.location.hostname;
                        const domain = hostname.includes('.') ? `.${hostname.split('.').slice(-2).join('.')}` : '';
                        const domainAttr = domain ? `; domain=${domain}` : '';

                        document.cookie = `${cookieName}=${data.user.id}; path=/; max-age=86400${domainAttr}; SameSite=Lax`;

                        // Redirect based on role
                        const roleRedirects: Record<string, string> = {
                            'player': `${process.env.NEXT_PUBLIC_PLAYER_URL || 'http://localhost:3001'}/${data.user.id}`,
                            'venue-owner': `${process.env.NEXT_PUBLIC_VENUE_URL || 'http://localhost:3002'}/${data.user.id}`,
                            'admin': `${process.env.NEXT_PUBLIC_ADMIN_URL || 'http://localhost:3003'}/${data.user.id}`
                        };

                        const redirectUrl = roleRedirects[role] || '/';
                        window.location.href = redirectUrl;
                    } else {
                        router.push("/");
                    }
                } catch (err: any) {
                    console.error("Verification error:", err);
                    setStatus(`Verification failed: ${err.message}`);
                }
            } else {
                // No code, just redirect to login
                router.push("/");
            }
        };

        handleCallback();
    }, [searchParams, router]);

    return (
        <main className="auth-container">
            <Card className="auth-card">
                <div style={{ textAlign: "center", padding: "2rem" }}>
                    <h2 style={{ marginBottom: "1rem" }}>{status}</h2>
                    <p style={{ color: "var(--text-muted)" }}>Please wait while we set up your account.</p>
                </div>
            </Card>
        </main>
    );
}

export default function AuthCallbackPage() {
    return (
        <Suspense fallback={<div className="auth-container"><Card className="auth-card">Loading...</Card></div>}>
            <AuthCallbackContent />
        </Suspense>
    );
}
