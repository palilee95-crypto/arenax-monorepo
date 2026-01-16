"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@arenax/ui";

interface SidebarWrapperProps {
    userId: string;
    userName?: string;
    userRole?: string;
}

const sidebarSections = [
    {
        title: "OVERVIEW",
        items: [
            {
                label: "Dashboard",
                href: "/",
                icon: (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="7" height="7"></rect>
                        <rect x="14" y="3" width="7" height="7"></rect>
                        <rect x="14" y="14" width="7" height="7"></rect>
                        <rect x="3" y="14" width="7" height="7"></rect>
                    </svg>
                )
            },
            {
                label: "User Verification",
                href: "/verification",
                icon: (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                        <circle cx="8.5" cy="7" r="4"></circle>
                        <polyline points="17 11 19 13 23 9"></polyline>
                    </svg>
                )
            },
        ]
    },
    {
        title: "MANAGEMENT",
        items: [
            {
                label: "Venue Approval",
                href: "/venues",
                icon: (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                        <polyline points="9 22 9 12 15 12 15 22"></polyline>
                    </svg>
                )
            },
            {
                label: "System Wallet",
                href: "/wallet",
                icon: (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="4" width="20" height="16" rx="2"></rect>
                        <line x1="12" y1="8" x2="12" y2="16"></line>
                        <line x1="8" y1="12" x2="16" y2="12"></line>
                    </svg>
                )
            },
            {
                label: "Transactions",
                href: "/transactions",
                icon: (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="1" x2="12" y2="23"></line>
                        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                    </svg>
                )
            },
        ]
    },
    {
        title: "SYSTEM",
        items: [
            {
                label: "System Logs",
                href: "/logs",
                icon: (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <line x1="16" y1="13" x2="8" y2="13"></line>
                        <line x1="16" y1="17" x2="8" y2="17"></line>
                        <polyline points="10 9 9 9 8 9"></polyline>
                    </svg>
                )
            },
            {
                label: "Settings",
                href: "/settings",
                icon: (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="3"></circle>
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                    </svg>
                )
            },
        ]
    }
];

export const SidebarWrapper = ({ userId, userName, userRole }: SidebarWrapperProps) => {
    const pathname = usePathname();

    const updatedSections = sidebarSections.map(section => ({
        ...section,
        items: section.items.map((item: any) => {
            const href = item.href === "/" ? `/${userId}` : `/${userId}${item.href}`;
            return {
                ...item,
                href,
                active: pathname === href
            };
        })
    }));

    const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);
    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => {
        setMounted(true);
        // On mobile, start closed
        if (window.innerWidth <= 1024) {
            setIsSidebarOpen(false);
        }
    }, []);

    // Sync body class with sidebar state for desktop override
    React.useEffect(() => {
        if (!mounted) return;

        if (isSidebarOpen) {
            document.body.classList.remove('sidebar-closed');
        } else {
            // Only add sidebar-closed if we are on desktop
            if (window.innerWidth > 1024) {
                document.body.classList.add('sidebar-closed');
            }
        }
    }, [isSidebarOpen, mounted]);

    React.useEffect(() => {
        // Auto-close on navigation for mobile
        if (mounted && window.innerWidth <= 1024) {
            setIsSidebarOpen(false);
        }
    }, [pathname, mounted]);

    React.useEffect(() => {
        const handleToggleSidebar = () => {
            setIsSidebarOpen(prev => !prev);
        };
        window.addEventListener('open-sidebar', handleToggleSidebar);
        return () => window.removeEventListener('open-sidebar', handleToggleSidebar);
    }, []);

    return (
        <Sidebar
            sections={updatedSections}
            userName={userName}
            userRole={userRole}
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
        />
    );
};
