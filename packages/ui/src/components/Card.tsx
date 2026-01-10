import React from "react";

interface CardProps {
    children: React.ReactNode;
    title?: string;
    className?: string;
    variant?: "glass" | "solid";
    onClick?: () => void;
}

export const Card = ({ children, title, className = "", variant = "glass", onClick }: CardProps) => {
    return (
        <div className={`arenax-card ${variant} ${className}`} onClick={onClick}>
            {title && <h3 className="arenax-card-title">{title}</h3>}
            <div className="arenax-card-content">
                {children}
            </div>
        </div>
    );
};
