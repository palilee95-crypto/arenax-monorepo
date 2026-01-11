"use client";

import React, { useState, useEffect, useRef } from "react";
// @ts-ignore
import { supabase } from "@arenax/database";

interface TopBarProps {
    userId?: string;
    userName?: string;
    userRole?: string;
    avatarUrl?: string;
    statusBadge?: string;
    onMenuClick?: () => void;
    profileHref?: string;
    settingsHref?: string;
}

export const TopBar = ({ userId, userName, userRole, avatarUrl, statusBadge, onMenuClick, profileHref, settingsHref }: TopBarProps) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const menuRef = useRef<HTMLDivElement>(null);
    const notificationsRef = useRef<HTMLDivElement>(null);

    const handleMenuClick = () => {
        if (onMenuClick) {
            onMenuClick();
        } else {
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
            if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
                setIsNotificationsOpen(false);
            }
        };

        if (isMenuOpen || isNotificationsOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isMenuOpen, isNotificationsOpen]);

    useEffect(() => {
        if (!userId || !supabase) return;

        const fetchNotifications = async () => {
            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(10);

            if (data) {
                setNotifications(data);
                setUnreadCount(data.filter((n: any) => !n.is_read).length);
            }
        };

        fetchNotifications();

        const channel = supabase
            .channel(`notifications:${userId}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'notifications',
                filter: `user_id=eq.${userId}`
            }, (payload: any) => {
                setNotifications((prev: any[]) => [payload.new, ...prev].slice(0, 10));
                setUnreadCount((prev: number) => prev + 1);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [userId]);

    const markAsRead = async (id: string) => {
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', id);

        if (!error) {
            setNotifications((prev: any[]) => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
            setUnreadCount((prev: number) => Math.max(0, prev - 1));
        }
    };

    const markAllAsRead = async () => {
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('user_id', userId)
            .eq('is_read', false);

        if (!error) {
            setNotifications((prev: any[]) => prev.map(n => ({ ...n, is_read: true })));
            setUnreadCount(0);
        }
    };

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
                        <div className="user-menu-dropdown" onClick={(e) => e.stopPropagation()}>
                            <div className="menu-header">
                                <div className="menu-user-info">
                                    <span className="menu-name">{userName}</span>
                                    <span className="menu-role">{userRole}</span>
                                </div>
                            </div>
                            <div className="menu-items">
                                <a href={profileHref || `/${userId}`} className="menu-item">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                        <circle cx="12" cy="7" r="4"></circle>
                                    </svg>
                                    <span>Profile</span>
                                </a>
                                <button
                                    type="button"
                                    className="menu-item"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsMenuOpen(false);
                                        setIsNotificationsOpen(true);
                                    }}
                                    style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer', color: 'inherit', font: 'inherit', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 15px' }}
                                >
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                                        <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                                    </svg>
                                    <span>Notifications</span>
                                </button>
                                <a href={settingsHref || `/${userId}/settings`} className="menu-item">
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

                <div className="notification-wrapper" ref={notificationsRef}>
                    <button
                        id="notification-bell-main"
                        type="button"
                        className={`notification-btn ${unreadCount > 0 ? 'has-unread' : ''}`}
                        style={{ zIndex: 1002, position: 'relative' }}
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setIsNotificationsOpen(!isNotificationsOpen);
                        }}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                        </svg>
                        {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
                    </button>

                    {isNotificationsOpen && (
                        <div className="notification-dropdown" onClick={(e) => e.stopPropagation()}>
                            <div className="dropdown-header">
                                <h3>Notifications</h3>
                                {unreadCount > 0 && (
                                    <button className="mark-all-btn" onClick={markAllAsRead}>Mark all as read</button>
                                )}
                            </div>
                            <div className="notification-list">
                                {notifications.length === 0 ? (
                                    <div className="notification-empty">
                                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                                            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                                        </svg>
                                        <p>No notifications yet</p>
                                    </div>
                                ) : (
                                    notifications.map(notif => (
                                        <div
                                            key={notif.id}
                                            className={`notification-item ${!notif.is_read ? 'unread' : ''}`}
                                            onClick={() => {
                                                if (!notif.is_read) markAsRead(notif.id);
                                                if (notif.link) window.location.href = notif.link;
                                            }}
                                        >
                                            <div className="notif-content">
                                                <div className="notif-title">{notif.title}</div>
                                                <div className="notif-message">{notif.message}</div>
                                                <div className="notif-time">
                                                    {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </div>
                                            {!notif.is_read && <div className="unread-dot"></div>}
                                        </div>
                                    ))
                                )}
                            </div>
                            {notifications.length > 0 && (
                                <div className="dropdown-footer">
                                    <a href={`/${userId}/notifications`}>View all notifications</a>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="topbar-logo">
                    <img src="/logo-white.png" alt="ARENAX" className="logo-img" />
                    <span className="logo-text-fallback">ARENAX</span>
                </div>
            </div>
        </header>
    );
};
