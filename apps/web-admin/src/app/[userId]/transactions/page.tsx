"use client";

import React, { useState, useEffect } from "react";
import { Card } from "@arenax/ui";
import { supabase } from "@arenax/database";

export default function TransactionsPage() {
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTransactions = async () => {
            try {
                const { data, error } = await supabase
                    .from('transactions')
                    .select(`
                        *,
                        profiles (
                            first_name,
                            last_name,
                            email
                        )
                    `)
                    .order('created_at', { ascending: false });

                if (error) throw error;
                setTransactions(data || []);
            } catch (error) {
                console.error("Error fetching transactions:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchTransactions();

        // Set up real-time subscription
        const channel = supabase
            .channel('transactions-changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'transactions' },
                () => fetchTransactions()
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString('en-MY', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="arenax-page-container">
            <header className="arenax-page-header">
                <h1 className="arenax-page-title">Transactions</h1>
                <p className="arenax-page-subtitle">View all system transactions and financial logs.</p>
            </header>

            <Card variant="glass">
                {loading ? (
                    <div className="arenax-empty-state">Loading transactions...</div>
                ) : transactions.length > 0 ? (
                    <div className="arenax-table-wrapper">
                        <table className="arenax-table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>User</th>
                                    <th>Type</th>
                                    <th>Amount</th>
                                    <th>Status</th>
                                    <th>Description</th>
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.map((tx) => (
                                    <tr key={tx.id}>
                                        <td>{formatDate(tx.created_at)}</td>
                                        <td>
                                            <div className="arenax-user-cell">
                                                <span className="arenax-user-name">
                                                    {tx.profiles?.first_name} {tx.profiles?.last_name}
                                                </span>
                                                <span className="arenax-user-sub">{tx.profiles?.email}</span>
                                            </div>
                                        </td>
                                        <td><span className={`arenax-badge arenax-badge-status-info`}>{tx.type}</span></td>
                                        <td style={{ fontWeight: 600, color: tx.amount > 0 ? '#34d399' : '#f87171' }}>
                                            {tx.amount > 0 ? '+' : ''}{Number(tx.amount).toFixed(2)} MYR
                                        </td>
                                        <td><span className={`arenax-badge arenax-badge-status-${tx.status.toLowerCase()}`}>{tx.status}</span></td>
                                        <td>{tx.description || "-"}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="arenax-empty-state">
                        <p>No transactions found.</p>
                    </div>
                )}
            </Card>
        </div>
    );
}
