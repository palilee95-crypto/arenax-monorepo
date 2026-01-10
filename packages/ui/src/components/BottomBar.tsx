"use client";

import React from "react";

export interface BottomBarItem {
    label: string;
    href: string;
    icon: React.ReactNode;
    isCenter?: boolean;
    active?: boolean;
    onClick?: () => void;
}

interface BottomBarProps {
    items: BottomBarItem[];
}

export const BottomBar: React.FC<BottomBarProps> = ({ items }) => {
    return (
        <nav className="arenax-bottom-bar">
            <div className="bottom-bar-content">
                {items.map((item, index) => {
                    const isActive = item.active;

                    if (item.isCenter) {
                        return (
                            <a
                                key={index}
                                href={item.href}
                                className={`bottom-bar-item center-item ${isActive ? 'active' : ''}`}
                                onClick={(e) => {
                                    if (item.onClick) {
                                        e.preventDefault();
                                        item.onClick();
                                    }
                                }}
                            >
                                <div className="center-button-glow"></div>
                                <div className="center-icon-wrapper">
                                    {item.icon}
                                </div>
                                <span className="label">{item.label}</span>
                            </a>
                        );
                    }

                    return (
                        <a
                            key={index}
                            href={item.href}
                            className={`bottom-bar-item ${isActive ? 'active' : ''}`}
                            onClick={(e) => {
                                if (item.onClick) {
                                    e.preventDefault();
                                    item.onClick();
                                }
                            }}
                        >
                            <div className="icon-wrapper">
                                {item.icon}
                            </div>
                            <span className="label">{item.label}</span>
                        </a>
                    );
                })}
            </div>
        </nav>
    );
};
