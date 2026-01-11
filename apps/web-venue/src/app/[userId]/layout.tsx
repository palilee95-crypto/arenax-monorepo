import { TopBar } from "@arenax/ui";
import { SidebarWrapper } from "../../components/SidebarWrapper";
import { supabase } from "@arenax/database";
import { redirect } from "next/navigation";

export default async function UserLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ userId: string }>;
}) {
    const { userId } = await params;

    if (!userId) {
        redirect(`${process.env.NEXT_PUBLIC_AUTH_URL || 'http://localhost:3000'}`);
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name, role')
        .eq('id', userId)
        .single();

    if (!profile) {
        redirect(`${process.env.NEXT_PUBLIC_AUTH_URL || 'http://localhost:3000'}`);
    }

    // Redirection guard
    if (profile.role !== 'venue-owner') {
        const roleRedirects: Record<string, string> = {
            'player': process.env.NEXT_PUBLIC_PLAYER_URL || 'http://localhost:3001',
            'admin': process.env.NEXT_PUBLIC_ADMIN_URL || 'http://localhost:3003'
        };
        redirect(`${roleRedirects[profile.role]}/${userId}` || (process.env.NEXT_PUBLIC_AUTH_URL || 'http://localhost:3000'));
    }

    const userName = `${profile.first_name} ${profile.last_name}`;
    const userRole = profile.role;

    return (
        <div className="app-layout">
            <SidebarWrapper
                userId={userId}
                userName={userName}
                userRole={userRole}
            />
            <div className="main-wrapper">
                <TopBar
                    userId={userId}
                    userName={userName}
                    userRole={userRole}
                    statusBadge="VENUE OWNER: ACTIVE"
                    profileHref={`/${userId}`}
                    settingsHref={`/${userId}/settings`}
                />
                <main className="app-content">
                    {children}
                </main>
            </div>
        </div>
    );
}
