import { TopBar } from "@arenax/ui";
import { SidebarWrapper } from "../../components/SidebarWrapper";
import { supabase } from "@arenax/database";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { CreateMatchProvider } from "../../contexts/CreateMatchContext";
import { unstable_noStore as noStore } from 'next/cache';
import { NotificationHandler } from "../../components/NotificationHandler";

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



    try {

        const { data: profile } = await supabase
            .from('profiles')
            .select('first_name, last_name, role, skill_level, avatar_url, hero_url')
            .eq('id', userId)
            .single();



        if (!profile) {

            const authUrl = process.env.NEXT_PUBLIC_AUTH_URL || 'http://localhost:3000';
            redirect(`${authUrl}/onboarding`);
        }

        // Session validation: Ensure URL userId matches authenticated user
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            redirect(`${process.env.NEXT_PUBLIC_AUTH_URL || 'http://localhost:3000'}`);
        }

        if (user && user.id !== userId) {

            redirect(`/${user.id}`);
        }



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
                <NotificationHandler userId={userId} />
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
