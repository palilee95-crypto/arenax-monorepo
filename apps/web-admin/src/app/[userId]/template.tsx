"use client";

import React from "react";

export default function Template({ children }: { children: React.ReactNode }) {
    return (
        <div className="arenax-animate-enter">
            {children}
        </div>
    );
}
