"use client";

import React from "react";
import { Card, Button } from "@arenax/ui";

export default function WalletPage() {
    return (
        <div className="arenax-page-container">
            <div className="arenax-page-header">
                <h1 className="arenax-page-title">System Wallet</h1>
                <p className="arenax-page-subtitle">Monitor platform funds and transaction logs</p>
            </div>

            <div className="arenax-wallet-grid">
                {/* Balance Card */}
                <Card variant="glass" className="arenax-balance-card">
                    <div className="arenax-balance-content">
                        <span className="arenax-stat-label">Total Platform Funds</span>
                        <div className="arenax-stat-value large">RM 45,250.00</div>
                        <div className="arenax-balance-actions">
                            <Button variant="primary">Generate Report</Button>
                        </div>
                    </div>
                </Card>

                {/* Transaction History */}
                <Card variant="glass" className="history-card">
                    <h3 className="arenax-card-title">System Transactions</h3>
                    <div className="arenax-tx-list">
                        <div className="arenax-tx-item">
                            <div className="arenax-tx-icon received">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12l7 7 7-7" /></svg>
                            </div>
                            <div className="arenax-tx-details">
                                <span className="arenax-tx-title">Platform Fee (Booking #1234)</span>
                                <span className="arenax-tx-date">Today, 2:00 PM</span>
                            </div>
                            <span className="arenax-tx-amount positive">+ RM 12.00</span>
                        </div>
                        <div className="arenax-tx-item">
                            <div className="arenax-tx-icon received">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12l7 7 7-7" /></svg>
                            </div>
                            <div className="arenax-tx-details">
                                <span className="arenax-tx-title">Platform Fee (Booking #1233)</span>
                                <span className="arenax-tx-date">Yesterday, 8:00 PM</span>
                            </div>
                            <span className="arenax-tx-amount positive">+ RM 12.00</span>
                        </div>
                        <div className="arenax-tx-item">
                            <div className="arenax-tx-icon sent">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
                            </div>
                            <div className="arenax-tx-details">
                                <span className="arenax-tx-title">Server Costs</span>
                                <span className="arenax-tx-date">5 days ago</span>
                            </div>
                            <span className="arenax-tx-amount negative">- RM 150.00</span>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
}
