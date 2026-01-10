"use client";

import React, { useState, useEffect, useRef } from "react";

interface TopBarProps {
    userName?: string;
    userRole?: string;
    avatarUrl?: string;
    statusBadge?: string;
    onMenuClick?: () => void;
}

export const TopBar = ({ userName, userRole, avatarUrl, statusBadge, onMenuClick }: TopBarProps) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    const handleMenuClick = () => {
        if (onMenuClick) {
            onMenuClick();
        } else {
            // Fallback: Dispatch custom event if no callback provided
            window.dispatchEvent(new CustomEvent('open-sidebar'));
        }
    };

    const toggleUserMenu = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsMenuOpen(!isMenuOpen);
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };

        if (isMenuOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isMenuOpen]);

    return (
        <header className="arenax-topbar">
            <div className="topbar-left">
                <button className="mobile-menu-btn" onClick={handleMenuClick}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="3" y1="12" x2="21" y2="12"></line>
                        <line x1="3" y1="6" x2="21" y2="6"></line>
                        <line x1="3" y1="18" x2="21" y2="18"></line>
                    </svg>
                </button>

                <div
                    className={`topbar-user ${isMenuOpen ? 'active' : ''}`}
                    onClick={toggleUserMenu}
                    ref={menuRef}
                >
                    <div className="user-avatar">
                        {avatarUrl ? (
                            <img src={avatarUrl} alt={userName} />
                        ) : (
                            <div className="avatar-placeholder">{userName?.charAt(0)}</div>
                        )}
                    </div>
                    <div className="user-text">
                        <div className="user-name">{userName}</div>
                        <div className="user-role">{userRole}</div>
                    </div>

                    {isMenuOpen && (
                        <div className="user-menu-dropdown">
                            <div className="menu-header">
                                <div className="menu-user-info">
                                    <span className="menu-name">{userName}</span>
                                    <span className="menu-role">{userRole}</span>
                                </div>
                            </div>
                            <div className="menu-items">
                                <a href={`/${userName}/profile`} className="menu-item">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                        <circle cx="12" cy="7" r="4"></circle>
                                    </svg>
                                    <span>Profile</span>
                                </a>
                                <a href={`/${userName}/settings?tab=notifications`} className="menu-item">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                                        <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                                    </svg>
                                    <span>Notifications</span>
                                </a>
                                <a href={`/${userName}/settings`} className="menu-item">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="12" cy="12" r="3"></circle>
                                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                                    </svg>
                                    <span>Settings</span>
                                </a>
                                <div className="menu-divider"></div>
                                <button className="menu-item logout" onClick={() => window.location.href = '/logout'}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                                        <polyline points="16 17 21 12 16 7"></polyline>
                                        <line x1="21" y1="12" x2="9" y2="12"></line>
                                    </svg>
                                    <span>Logout</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="topbar-search">
                <div className="search-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                </div>
                <input type="text" placeholder="Search matches, teams..." />
            </div>

            <div className="topbar-actions">
                <div className="status-badge-active">
                    <span className="status-dot"></span>
                    {statusBadge || "PLAYER: ACTIVE"}
                </div>

                <div className="topbar-logo">
                    <img src="/logo-white.png" alt="ARENAX" className="logo-img" />
                    <span className="logo-text-fallback">ARENAX</span>
                </div>
            </div>
        </header>
    );
};
