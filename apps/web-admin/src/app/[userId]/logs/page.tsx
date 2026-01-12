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
    const [filter, setFilter] = useState<string>("all");

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('system_logs')
            .select('*')
            .order('created_at', { ascending: false });

        if (data) setLogs(data);
        setLoading(false);
    };

    const filteredLogs = filter === "all"
        ? logs
        : logs.filter(log => log.level === filter);

    const getLevelColor = (level: string) => {
        switch (level) {
            case 'error': return '#ff4d4d';
            case 'warning': return '#ffaa00';
            case 'success': return '#00ff88';
            default: return '#00aaff';
        }
    };

    return (
        <div className="page-container">
            <header className="page-header">
                <div className="header-content">
                    <h1>System Logs</h1>
                    <p>Monitor system activity and error logs.</p>
                </div>
                <div className="header-actions">
                    <select
                        className="filter-select"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                    >
                        <option value="all">All Levels</option>
                        <option value="info">Info</option>
                        <option value="warning">Warning</option>
                        <option value="error">Error</option>
                        <option value="success">Success</option>
                    </select>
                    <Button variant="outline" onClick={fetchLogs} disabled={loading}>
                        Refresh
                    </Button>
                </div>
            </header>

            <Card variant="glass">
                {loading ? (
                    <div className="loading-state">Loading logs...</div>
                ) : filteredLogs.length === 0 ? (
                    <div className="empty-state">
                        <p>No logs available.</p>
                    </div>
                ) : (
                    <div className="logs-table-wrapper">
                        <table className="logs-table">
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
                                        <td className="time-cell">
                                            {new Date(log.created_at).toLocaleString()}
                                        </td>
                                        <td>
                                            <span
                                                className="level-badge"
                                                style={{
                                                    backgroundColor: `${getLevelColor(log.level)}22`,
                                                    color: getLevelColor(log.level),
                                                    borderColor: `${getLevelColor(log.level)}44`
                                                }}
                                            >
                                                {log.level.toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="source-cell">{log.source}</td>
                                        <td className="message-cell">{log.message}</td>
                                        <td className="details-cell">
                                            <pre>{JSON.stringify(log.details, null, 2)}</pre>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            <style jsx>{`
                .page-container { padding: 2rem; max-width: 1400px; margin: 0 auto; }
                .page-header { 
                    display: flex; 
                    justify-content: space-between; 
                    align-items: flex-end; 
                    margin-bottom: 3rem; 
                }
                .page-header h1 { 
                    font-size: 2.5rem; 
                    margin-bottom: 0.5rem; 
                    background: linear-gradient(to right, #fff, rgba(255,255,255,0.5)); 
                    -webkit-background-clip: text; 
                    -webkit-text-fill-color: transparent; 
                }
                .page-header p { color: var(--text-muted); font-size: 1.1rem; }
                
                .header-actions { display: flex; gap: 1rem; align-items: center; }
                .filter-select {
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid var(--glass-border);
                    color: white;
                    padding: 0.5rem 1rem;
                    border-radius: 8px;
                    outline: none;
                }

                .logs-table-wrapper { overflow-x: auto; }
                .logs-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
                .logs-table th { text-align: left; padding: 1rem; color: var(--text-muted); border-bottom: 1px solid var(--glass-border); }
                .logs-table td { padding: 1rem; border-bottom: 1px solid rgba(255,255,255,0.05); vertical-align: top; }
                
                .time-cell { white-space: nowrap; color: var(--text-muted); }
                .level-badge { 
                    padding: 0.2rem 0.6rem; 
                    border-radius: 4px; 
                    font-size: 0.75rem; 
                    font-weight: 700; 
                    border: 1px solid;
                }
                .source-cell { font-weight: 600; color: var(--primary); }
                .message-cell { color: #eee; }
                .details-cell pre { 
                    margin: 0; 
                    font-size: 0.8rem; 
                    color: var(--text-muted); 
                    max-width: 300px; 
                    overflow: hidden; 
                    text-overflow: ellipsis; 
                }

                .loading-state, .empty-state { padding: 4rem; text-align: center; color: var(--text-muted); }
            `}</style>
        </div>
    );
}
