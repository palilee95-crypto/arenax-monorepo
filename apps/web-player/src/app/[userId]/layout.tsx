import { TopBar } from "@arenax/ui";
import { SidebarWrapper } from "../../components/SidebarWrapper";
import { supabase } from "@arenax/database";
import { redirect } from "next/navigation";
import { CreateMatchProvider } from "../../contexts/CreateMatchContext";

export default async function UserLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ userId: string }>;
}) {
    const { userId } = await params;
    console.log("[WEB-PLAYER] ===== LAYOUT START =====");
    console.log("[WEB-PLAYER] Received userId:", userId);
    console.log("[WEB-PLAYER] Supabase URL:", process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 40));

    try {
        console.log("[WEB-PLAYER] Attempting to fetch profile...");
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('first_name, last_name, role, skill_level, avatar_url')
            .eq('id', userId)
            .single();

        console.log("[WEB-PLAYER] Profile fetch result:", {
            hasProfile: !!profile,
            error: error ? error.message : null,
            profileData: profile
        });

        if (!profile) {
            console.log("[WEB-PLAYER] ❌ No profile found, redirecting to login");
            redirect(`${process.env.NEXT_PUBLIC_AUTH_URL || 'http://localhost:3000'}`);
        }

        console.log("[WEB-PLAYER] ✅ Profile found for:", profile.first_name, profile.last_name);

        // Redirection guard
        if (profile.role !== 'player') {
            const roleRedirects: Record<string, string> = {
                'venue-owner': process.env.NEXT_PUBLIC_VENUE_URL || 'http://localhost:3002',
                'admin': process.env.NEXT_PUBLIC_ADMIN_URL || 'http://localhost:3003'
            };
            redirect(`${roleRedirects[profile.role]}/${userId}` || (process.env.NEXT_PUBLIC_AUTH_URL || 'http://localhost:3000'));
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
