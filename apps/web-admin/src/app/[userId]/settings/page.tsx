"use client";

import React from "react";
import { Card } from "@arenax/ui";

export default function SettingsPage() {
    return (
        <div className="arenax-page-container">
            <header className="arenax-page-header">
                <h1 className="arenax-page-title">Settings</h1>
                <p className="arenax-page-subtitle">Manage system configurations and preferences.</p>
            </header>
            <Card variant="glass">
                <div className="arenax-empty-state">
                    <p>Settings configuration coming soon.</p>
                </div>
            </Card>
        </div>
    );
}
