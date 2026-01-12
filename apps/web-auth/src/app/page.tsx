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
      if (params.get('loggedout') === 'true' || sessionStorage.getItem('justLoggedOut') === 'true') {
        console.log("User just logged out, skipping auto-redirect");
        sessionStorage.setItem('justLoggedOut', 'true');
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

        if (!profile) {
          console.log("Profile missing for logged in user, redirecting to onboarding");
          const params = new URLSearchParams({
            role: session.user.user_metadata?.role || 'player',
            firstName: session.user.user_metadata?.first_name || '',
            lastName: session.user.user_metadata?.last_name || '',
            email: session.user.user_metadata?.email || '',
          });
          window.location.href = `/onboarding?${params.toString()}`;
          return;
        }

        const role = profile.role;

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

  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  const handleResendEmail = async (email: string) => {
    setResending(true);
    setResendMessage(null);
    try {
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (resendError) throw resendError;
      setResendMessage("Verification email resent! Please check your inbox.");

      // Log success
      await supabase.from('system_logs').insert({
        level: 'info',
        message: `Verification email resent to ${email}`,
        source: 'AuthService',
        details: { email }
      });
    } catch (err: any) {
      console.error("Resend error:", err);
      setResendMessage(`Error: ${err.message}`);

      // Log error
      await supabase.from('system_logs').insert({
        level: 'error',
        message: `Failed to resend verification email to ${email}`,
        source: 'AuthService',
        details: { error: err.message, email }
      });
    } finally {
      setResending(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Login attempt started...");
    setLoading(true);
    setError(null);
    setResendMessage(null);

    const formData = new FormData(e.target as HTMLFormElement);
    const email = (formData.get("email") as string)?.trim();
    const password = (formData.get("password") as string)?.trim();

    try {
      // 1. Sign in with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (authError) {
        // Log auth error
        await supabase.from('system_logs').insert({
          level: 'warning',
          message: `Login failed for ${email}`,
          source: 'AuthService',
          details: { error: authError.message, email }
        });
        throw authError;
      }

      if (!authData.user) throw new Error("Login failed");

      console.log("[Auth] Login successful for user:", authData.user.id);
      console.log("[Auth] Session established:", authData.session ? "YES" : "NO");
      if (authData.session) {
        console.log("[Auth] Session expires at:", new Date(authData.session.expires_at! * 1000).toLocaleString());
      }

      // 2. Fetch user profile to get role
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, id')
        .eq('id', authData.user.id)
        .single();

      if (profileError || !profile) {
        console.error("Profile not found, redirecting to onboarding");
        // Log profile missing
        await supabase.from('system_logs').insert({
          level: 'warning',
          message: `Profile missing for ${email} after login, redirecting to onboarding`,
          source: 'AuthService',
          details: { userId: authData.user.id }
        });

        const params = new URLSearchParams({
          role: authData.user.user_metadata?.role || 'player',
          firstName: authData.user.user_metadata?.first_name || '',
          lastName: authData.user.user_metadata?.last_name || '',
          email: email,
          // We don't have the password here, but onboarding might need it if it re-triggers signUp
          // However, if they are already logged in, onboarding should just update the profile.
        });
        window.location.href = `/onboarding?${params.toString()}`;
        return;
      }

      const role = profile.role;

      console.log("Login successful, redirecting to:", role);

      // Log success
      await supabase.from('system_logs').insert({
        level: 'info',
        message: `User logged in: ${email}`,
        source: 'AuthService',
        details: { role, userId: authData.user.id }
      });

      // Redirect based on role
      const roleRedirects: Record<string, string> = {
        'player': `${process.env.NEXT_PUBLIC_PLAYER_URL || 'http://localhost:3001'}/${authData.user.id}`,
        'venue-owner': `${process.env.NEXT_PUBLIC_VENUE_URL || 'http://localhost:3002'}/${authData.user.id}`,
        'admin': `${process.env.NEXT_PUBLIC_ADMIN_URL || 'http://localhost:3003'}/${authData.user.id}`
      };

      const redirectUrl = roleRedirects[role] || `http://localhost:3001/${authData.user.id}`;

      // Set cookie for session persistence
      const cookieName = role === 'player' ? 'arenax_player_id' :
        role === 'venue-owner' ? 'arenax_venue_id' :
          'arenax_admin_id';

      // Get domain for cross-subdomain cookies
      const hostname = window.location.hostname;
      const domain = hostname.includes('.') ? `.${hostname.split('.').slice(-2).join('.')}` : '';
      const domainAttr = domain ? `; domain=${domain}` : '';

      console.log("Setting cookie:", cookieName, "on domain:", domain || 'default');
      document.cookie = `${cookieName}=${authData.user.id}; path=/; max-age=86400${domainAttr}; SameSite=Lax`;

      window.location.href = redirectUrl;

    } catch (err: any) {
      console.error("Login error details:", err);
      setError(err.message || "An error occurred during login");

      // Check if it's an unconfirmed email error
      if (err.message?.toLowerCase().includes("email not confirmed")) {
        setError(
          <div style={{ textAlign: 'center' }}>
            <p>Your email is not verified yet.</p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleResendEmail(email)}
              disabled={resending}
              style={{ marginTop: '0.5rem' }}
            >
              {resending ? "Resending..." : "Resend Verification Email"}
            </Button>
          </div> as any
        );
      }
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
          {resendMessage && <div className="success-message" style={{ color: '#00ff88', marginBottom: '1.5rem', fontSize: '0.85rem', textAlign: 'center', padding: '0.8rem', background: 'rgba(0,255,136,0.1)', borderRadius: '8px', border: '1px solid rgba(0,255,136,0.2)' }}>{resendMessage}</div>}

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
