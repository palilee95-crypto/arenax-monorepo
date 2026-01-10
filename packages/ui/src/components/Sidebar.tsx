"use client";

import React from "react";

interface SidebarItem {
    label: string;
    icon?: React.ReactNode;
    avatarUrl?: string;
    href: string;
    active?: boolean;
    onClick?: () => void;
}

interface SidebarSection {
    title?: string;
    items: SidebarItem[];
}

interface SidebarProps {
    sections: SidebarSection[];
    userName?: string;
    userRole?: string;
    avatarUrl?: string;
    isOpen?: boolean;
    onClose?: () => void;
}

export const Sidebar = ({ sections, userName, userRole, avatarUrl, isOpen, onClose }: SidebarProps) => {
    return (
        <>
            {/* Mobile Overlay */}
            <div
                className={`sidebar-overlay ${isOpen ? 'show' : ''}`}
                onClick={onClose}
            />

            <aside className={`arenax-sidebar ${isOpen ? 'open' : ''}`}>
                <div className="sidebar-header">
                    <div className="sidebar-logo">
                        <img src="/logo-white.png" alt="ARENAX" className="logo-img" />
                        <span className="logo-text-fallback">ARENAX</span>
                    </div>

                    {/* Mobile Close Button */}
                    <button className="sidebar-close-btn" onClick={onClose}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>

                <nav className="sidebar-nav">
                    {sections.map((section, sIndex) => (
                        <div key={sIndex} className="sidebar-section">
                            {section.title && <h3 className="section-title">{section.title}</h3>}
                            <div className="section-items">
                                {section.items.map((item, iIndex) => (
                                    <a
                                        key={iIndex}
                                        href={item.href}
                                        className={`nav-item ${item.active ? 'active' : ''} ${item.avatarUrl ? 'has-avatar' : ''}`}
                                        onClick={(e) => {
                                            if (item.onClick) {
                                                e.preventDefault();
                                                item.onClick();
                                            }

                                            // Close sidebar on mobile/tablet after click
                                            if (onClose && window.innerWidth <= 1024) {
                                                onClose();
                                            }
                                        }}
                                    >
                                        {item.avatarUrl ? (
                                            <div className="nav-avatar">
                                                <img src={item.avatarUrl} alt={item.label} />
                                            </div>
                                        ) : (
                                            item.icon && <span className="nav-icon">{item.icon}</span>
                                        )}
                                        <span className="nav-label">{item.label}</span>
                                    </a>
                                ))}
                            </div>
                        </div>
                    ))}
                </nav>

                {userName && (
                    <div className="sidebar-user">
                        <div className="user-avatar">
                            {avatarUrl ? (
                                <img src={avatarUrl} alt={userName} />
                            ) : (
                                userName.charAt(0).toUpperCase()
                            )}
                        </div>
                        <div className="user-info">
                            <span className="user-name">{userName}</span>
                            <span className="user-role">{userRole || 'User'}</span>
                        </div>
                    </div>
                )}
            </aside>
        </>
    );
};



