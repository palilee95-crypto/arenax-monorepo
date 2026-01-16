"use client";

import React, { useEffect, useState } from "react";
import { Card, Button } from "@arenax/ui";
import { supabase } from "@arenax/database";

interface SystemLog {
    id: string;
    created_at: string;
    level: 'info' | 'warning' | 'error' | 'success';
    message: string;
    source: string;
    details: any;
}

export default function LogsPage() {
    const [logs, setLogs] = useState<SystemLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<string>("all");

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        setLoading(true);
        setError(null);
        try {
            const { data, error: fetchError } = await supabase
                .from('system_logs')
                .select('*')
                .order('created_at', { ascending: false });

            if (fetchError) {
                console.error("Fetch error:", fetchError);
                setError(fetchError.message);
            } else {
                setLogs(data || []);
            }
        } catch (err: any) {
            console.error("Unexpected error:", err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const filteredLogs = filter === "all"
        ? logs
        : logs.filter(log => log.level === filter);

    return (
        <div className="arenax-page-container">
            <header className="arenax-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div className="header-content">
                    <h1 className="arenax-page-title">System Logs</h1>
                    <p className="arenax-page-subtitle">Monitor system activity and error logs.</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <select
                        className="arenax-select"
                        style={{ width: 'auto' }}
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                    >
                        <option value="all">All Levels</option>
                        <option value="info">Info</option>
                        <option value="warning">Warning</option>
                        <option value="error">Error</option>
                        <option value="success">Success</option>
                    </select>
                    <Button variant="secondary" onClick={fetchLogs} disabled={loading}>
                        Refresh
                    </Button>
                </div>
            </header>

            <Card variant="glass">
                {loading ? (
                    <div className="arenax-empty-state">Loading logs...</div>
                ) : error ? (
                    <div className="arenax-empty-state" style={{ color: '#ff4d4d' }}>
                        <p>Error fetching logs: {error}</p>
                        <Button variant="secondary" onClick={fetchLogs} style={{ marginTop: '1rem' }}>Try Again</Button>
                    </div>
                ) : filteredLogs.length === 0 ? (
                    <div className="arenax-empty-state">
                        <p>No logs available.</p>
                    </div>
                ) : (
                    <div className="arenax-table-wrapper">
                        <table className="arenax-table">
                            <thead>
                                <tr>
                                    <th>Time</th>
                                    <th>Level</th>
                                    <th>Source</th>
                                    <th>Message</th>
                                    <th>Details</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredLogs.map(log => (
                                    <tr key={log.id}>
                                        <td style={{ whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>
                                            {new Date(log.created_at).toLocaleString()}
                                        </td>
                                        <td>
                                            <span className={`arenax-badge arenax-badge-status-${log.level}`}>
                                                {log.level.toUpperCase()}
                                            </span>
                                        </td>
                                        <td style={{ fontWeight: 600, color: 'var(--primary)' }}>{log.source}</td>
                                        <td>{log.message}</td>
                                        <td className="arenax-log-details">
                                            <pre>{JSON.stringify(log.details, null, 2)}</pre>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
        </div>
    );
}
