"use client";

import React from "react";
import { Card } from "@arenax/ui";

export default function VenuesPage() {
    return (
        <div className="arenax-page-container">
            <header className="arenax-page-header">
                <h1 className="arenax-page-title">Venue Approval</h1>
                <p className="arenax-page-subtitle">Review and approve new venue registrations.</p>
            </header>
            <Card variant="glass">
                <div className="arenax-empty-state">
                    <p>No pending venue approvals.</p>
                </div>
            </Card>
        </div>
    );
}
