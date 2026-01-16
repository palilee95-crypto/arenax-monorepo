"use client";

import React, { useState, useEffect } from "react";
import { Card, Button } from "@arenax/ui";
import { supabase } from "@arenax/database";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function AdminDashboard() {
  const params = useParams();
  const userId = params.userId;
  const [stats, setStats] = useState({
    activeUsers: 0,
    totalVenues: 0,
    pendingVerifications: 0
  });
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      // Fetch total profiles (Active Users)
      const { count: userCount, error: userError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Fetch total venues
      const { count: venueCount, error: venueError } = await supabase
        .from('venues')
        .select('*', { count: 'exact', head: true });

      // Fetch pending verifications
      const { count: pendingCount, error: pendingError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      if (userError || venueError || pendingError) throw userError || venueError || pendingError;

      setStats({
        activeUsers: userCount || 0,
        totalVenues: venueCount || 0,
        pendingVerifications: pendingCount || 0
      });

      // Fetch recent transactions
      const { data: txData, error: txError } = await supabase
        .from('transactions')
        .select(`
          *,
          profiles (
            first_name,
            last_name
          )
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      if (txError) throw txError;
      setRecentTransactions(txData || []);

    } catch (error) {
      console.error("Error fetching admin stats:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();

    // Set up real-time subscription
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => fetchStats()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transactions' },
        () => fetchStats()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="arenax-page-container">
      <header className="arenax-page-header">
        <h1 className="arenax-page-title">Superadmin Dashboard</h1>
        <p className="arenax-page-subtitle">Monitor system health, verify users, and oversee transactions.</p>
      </header>

      <div className="arenax-dashboard-grid">
        <Card title="System Health" variant="glass">
          <div className="arenax-stats-grid">
            <div className="arenax-stat-item">
              <div className="arenax-stat-label">Active Users</div>
              <div className="arenax-stat-value">{loading ? "..." : stats.activeUsers}</div>
            </div>
            <div className="arenax-stat-item">
              <div className="arenax-stat-label">Total Venues</div>
              <div className="arenax-stat-value">{loading ? "..." : stats.totalVenues}</div>
            </div>
          </div>
        </Card>

        <Card title="Pending Verifications" variant="glass">
          <div className="arenax-verification-info">
            <div className="arenax-pending-count">{loading ? "..." : stats.pendingVerifications} Users</div>
            <p>Awaiting document approval</p>
            <Link href={`/${userId}/verification`}>
              <Button variant="primary" style={{ marginTop: '1rem', width: '100%' }} disabled={stats.pendingVerifications === 0}>
                Review All
              </Button>
            </Link>
          </div>
        </Card>

        <Card title="Recent Transactions" variant="glass" className="arenax-span-2">
          {loading ? (
            <div className="loading-state">Loading...</div>
          ) : recentTransactions.length > 0 ? (
            <div className="arenax-tx-list">
              {recentTransactions.map((tx) => (
                <div key={tx.id} className="arenax-tx-item">
                  <div className="arenax-tx-main">
                    <span className="arenax-tx-user">{tx.profiles?.first_name} {tx.profiles?.last_name}</span>
                    <span className="arenax-tx-desc">{tx.description || tx.type}</span>
                  </div>
                  <div className="arenax-tx-meta">
                    <span className={`arenax-tx-amount ${tx.amount > 0 ? 'positive' : 'negative'}`}>
                      {tx.amount > 0 ? '+' : ''}{Number(tx.amount).toFixed(2)}
                    </span>
                    <span className="arenax-tx-date">{new Date(tx.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
              <Link href={`/${userId}/transactions`} className="arenax-view-all-link">
                View All Transactions
              </Link>
            </div>
          ) : (
            <div className="arenax-empty-state">
              <p>No transactions recorded yet.</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
