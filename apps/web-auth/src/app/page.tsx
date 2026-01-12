"use client";

import React, { useState, useEffect } from "react";
import { Button, Card } from "@arenax/ui";
import { supabase } from "@arenax/database";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabaseUrl = (supabase as any).supabaseUrl;
  const isPlaceholder = !supabaseUrl || supabaseUrl.includes('placeholder');

  // Auto-redirect if already logged in
  useEffect(() => {
    const checkSession = async () => {
      // Don't auto-redirect if we just logged out
      const params = new URLSearchParams(window.location.search);
      if (params.get('loggedout') === 'true') {
        console.log("User just logged out, skipping auto-redirect");
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        console.log("User already logged in, redirecting...");
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();

        const role = profile?.role || session.user.user_metadata?.role || 'player';

        const roleRedirects: Record<string, string> = {
          'player': `${process.env.NEXT_PUBLIC_PLAYER_URL || 'http://localhost:3001'}/${session.user.id}`,
          'venue-owner': `${process.env.NEXT_PUBLIC_VENUE_URL || 'http://localhost:3002'}/${session.user.id}`,
          'admin': `${process.env.NEXT_PUBLIC_ADMIN_URL || 'http://localhost:3003'}/${session.user.id}`
        };

        const redirectUrl = roleRedirects[role] || `http://localhost:3001/${session.user.id}`;
        window.location.href = redirectUrl;
      }
    };

    checkSession();
  }, []);

  console.log("Supabase URL initialized with:", supabaseUrl);
  console.log("Direct Env URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Login attempt started...");
    setLoading(true);
    setError(null);

    const formData = new FormData(e.target as HTMLFormElement);
    const email = (formData.get("email") as string)?.trim();
    const password = (formData.get("password") as string)?.trim();

    try {
      // 1. Sign in with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (authError) throw authError;

      if (!authData.user) throw new Error("Login failed");

      // 2. Fetch user profile to get role
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, id')
        .eq('id', authData.user.id)
        .single();

      if (profileError) {
        console.error("Profile fetch error:", profileError);
        // Fallback to metadata if profile fetch fails (optional)
        // throw new Error("Profile not found");
      }

      const role = profile?.role || authData.user.user_metadata?.role || 'player';

      console.log("Login successful, redirecting to:", role);

      // Redirect based on role
      const roleRedirects: Record<string, string> = {
        'player': `${process.env.NEXT_PUBLIC_PLAYER_URL || 'http://localhost:3001'}/${authData.user.id}`,
        'venue-owner': `${process.env.NEXT_PUBLIC_VENUE_URL || 'http://localhost:3002'}/${authData.user.id}`,
        'admin': `${process.env.NEXT_PUBLIC_ADMIN_URL || 'http://localhost:3003'}/${authData.user.id}`
      };

      const redirectUrl = roleRedirects[role] || `http://localhost:3001/${authData.user.id}`;
      console.log("Redirect URL:", redirectUrl);

      // Set cookie for session persistence across ports
      const cookieName = role === 'player' ? 'arenax_player_id' :
        role === 'venue-owner' ? 'arenax_venue_id' :
          'arenax_admin_id';

      console.log("Setting cookie:", cookieName);
      // Omit domain=localhost as it can cause issues on some browsers
      document.cookie = `${cookieName}=${authData.user.id}; path=/; max-age=86400; SameSite=Lax`;

      // Also set the Supabase session cookie if needed by middleware (handled by Supabase client usually, but good to be explicit if we have custom middleware)

      window.location.href = redirectUrl;

    } catch (err: any) {
      console.error("Login error details:", err);
      setError(err.message || "An error occurred during login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-container">
      <Card className="auth-card" variant="glass">
        <div className="auth-header" style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: '800', margin: '0 0 0.5rem 0', letterSpacing: '0.05em', textTransform: 'uppercase', opacity: 0.8 }}>Welcome to</h2>
          <img src="/logo-white.png" alt="ARENAX" style={{ height: '45px', width: 'auto', marginBottom: '1.5rem', filter: 'drop-shadow(0 0 15px var(--primary-glow))' }} />
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Centralized Sports Community Hub</p>
        </div>


        <form className="auth-form" onSubmit={handleSubmit}>
          {isPlaceholder && (
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
              <strong>WARNING:</strong> Supabase is not configured correctly.
            </div>
          )}
          {error && <div className="error-message" style={{ color: '#ff4d4d', marginBottom: '1.5rem', fontSize: '0.85rem', textAlign: 'center', padding: '0.8rem', background: 'rgba(255,77,77,0.1)', borderRadius: '8px', border: '1px solid rgba(255,77,77,0.2)' }}>{error}</div>}

          <div className="form-group">
            <label htmlFor="email" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>Email Address</label>
            <input type="email" id="email" name="email" placeholder="Enter your email" required style={{ padding: '1rem', fontSize: '0.95rem' }} />
          </div>

          <div className="form-group">
            <label htmlFor="password" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>Password</label>
            <input type="password" id="password" name="password" placeholder="Enter your password" required style={{ padding: '1rem', fontSize: '0.95rem' }} />
          </div>

          <div className="auth-actions" style={{ marginTop: '1rem' }}>
            <Button variant="primary" type="submit" style={{ width: '100%', padding: '1rem', fontSize: '1rem' }} disabled={loading}>
              {loading ? "Authenticating..." : "Login to Arena"}
            </Button>
          </div>
        </form>

        <div className="auth-footer" style={{ marginTop: '2rem', borderTop: '1px solid var(--glass-border)', paddingTop: '1.5rem' }}>
          <p style={{ color: 'var(--text-muted)' }}>Don't have an account? <a href="/register" style={{ color: 'var(--primary)', fontWeight: '700' }}>Register here</a></p>
        </div>
      </Card>
    </main>
  );
}
