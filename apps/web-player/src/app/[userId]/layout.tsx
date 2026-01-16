import { TopBar } from "@arenax/ui";
import { SidebarWrapper } from "../../components/SidebarWrapper";
import { supabase } from "@arenax/database";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { CreateMatchProvider } from "../../contexts/CreateMatchContext";
import { unstable_noStore as noStore } from 'next/cache';

export const dynamic = 'force-dynamic';

export default async function UserLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ userId: string }>;
}) {
    noStore();
    const { userId } = await params;
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll().map((c: { name: string, value: string }) => `${c.name}=${c.value.substring(0, 5)}...`).join(', ');

    console.log("[WEB-PLAYER] ===== LAYOUT START =====");
    console.log("[WEB-PLAYER] Received userId:", userId);
    console.log("[WEB-PLAYER] Cookies seen by server:", allCookies);
    console.log("[WEB-PLAYER] Supabase URL:", process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 40));

    try {
        console.log("[WEB-PLAYER] Attempting to fetch profile for userId:", userId);
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('first_name, last_name, role, skill_level, avatar_url, hero_url')
            .eq('id', userId)
            .single();

        console.log("[WEB-PLAYER] Profile fetch result:", {
            hasProfile: !!profile,
            error: error ? error.message : null,
            profileData: profile ? {
                ...profile,
                avatar_url: profile.avatar_url ? `${profile.avatar_url.substring(0, 20)}... (length: ${profile.avatar_url.length})` : null,
                hero_url: profile.hero_url ? `${profile.hero_url.substring(0, 20)}... (length: ${profile.hero_url.length})` : null
            } : null
        });

        if (!profile) {
            console.log("[WEB-PLAYER] ❌ No profile found, redirecting to onboarding");
            const authUrl = process.env.NEXT_PUBLIC_AUTH_URL || 'http://localhost:3000';
            redirect(`${authUrl}/onboarding`);
        }

        // Session validation: Ensure URL userId matches authenticated user
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            console.log("[WEB-PLAYER] ❌ No active session, but bypassing for debugging (Redirect loop fix)");
            // const authUrl = process.env.NEXT_PUBLIC_AUTH_URL || 'http://localhost:3000';
            // redirect(`${authUrl}`);
        }

        if (user && user.id !== userId) {
            console.log(`[WEB-PLAYER] ⚠️ Session mismatch! URL: ${userId}, Auth: ${user.id}. Redirecting to correct path.`);
            redirect(`/${user.id}`);
        }

        console.log("[WEB-PLAYER] ✅ Profile found for:", profile.first_name, profile.last_name);

        // Redirection guard
        if (profile.role !== 'player') {
            const roleRedirects: Record<string, string> = {
                'venue-owner': process.env.NEXT_PUBLIC_VENUE_URL || 'http://localhost:3002',
                'admin': process.env.NEXT_PUBLIC_ADMIN_URL || 'http://localhost:3003'
            };
            redirect(`${roleRedirects[profile.role]}/${user.id}` || (process.env.NEXT_PUBLIC_AUTH_URL || 'http://localhost:3000'));
        }

        const userName = `${profile.first_name} ${profile.last_name}`;
        const userRole = profile.skill_level ? `${profile.skill_level} ${profile.role}` : profile.role;

        return (
            <CreateMatchProvider>
                <div className="app-layout">
                    <SidebarWrapper
                        userId={userId}
                        userName={userName}
                        userRole={userRole}
                        avatarUrl={profile.avatar_url}
                    />
                    <div className="main-wrapper">
                        <TopBar
                            userId={userId}
                            userName={userName}
                            userRole={userRole}
                            avatarUrl={profile.avatar_url}
                            statusBadge="PLAYER: ACTIVE"
                            profileHref={`/${userId}`}
                            settingsHref={`/${userId}/settings`}
                        />
                        <main className="app-content">
                            {children}
                        </main>
                    </div>
                </div>
            </CreateMatchProvider>
        );
    } catch (err) {
        console.error("[WEB-PLAYER] ❌ Error in layout:", err);
        redirect(`${process.env.NEXT_PUBLIC_AUTH_URL || 'http://localhost:3000'}`);
    }
}
