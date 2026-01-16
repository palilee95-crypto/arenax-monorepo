"use client";

import React, { useState, useEffect } from "react";
import { Card, Button } from "@arenax/ui";
import { supabase } from "@arenax/database";
import { useParams } from "next/navigation";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell
} from 'recharts';

export default function VenueDashboard() {
  const params = useParams();
  const userId = params.userId;
  const [venue, setVenue] = useState<any>(null);
  const [stats, setStats] = useState({
    totalBookings: 0,
    availableSlots: 0,
    todayRevenue: 0,
    totalRevenue: 0,
    monthlyGrowth: 0,
    avgBookingValue: 0
  });

  const [recentBookings, setRecentBookings] = useState<any[]>([]);
  const [weeklyData, setWeeklyData] = useState<any[]>([]);
  const [courtData, setCourtData] = useState<any[]>([]);

  useEffect(() => {
    const fetchVenueData = async () => {
      try {
        if (userId) {
          // 1. Fetch Venue
          const { data: venueData } = await supabase
            .from('venues')
            .select('*')
            .eq('owner_id', userId)
            .single();

          setVenue(venueData);

          if (venueData) {
            const today = new Date();
            const todayStr = today.toISOString().split('T')[0];
            const sevenDaysAgo = new Date(today);
            sevenDaysAgo.setDate(today.getDate() - 7);


            // 2. Fetch ALL Confirmed Bookings
            const { data: bookingsData, error: bookingsError } = await supabase
              .from('bookings')
              .select(`
                *,
                court:courts(name, price_per_hour),
                user:profiles(first_name, last_name)
              `)
              .eq('venue_id', venueData.id)
              .eq('status', 'confirmed');

            if (bookingsError) throw bookingsError;

            // 3. Process Weekly Data
            const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            const last7Days = Array.from({ length: 7 }, (_, i) => {
              const d = new Date(today);
              d.setDate(today.getDate() - (6 - i));
              return {
                date: d.toISOString().split('T')[0],
                day: days[d.getDay()],
                revenue: 0
              };
            });

            bookingsData?.forEach(b => {
              const dayObj = last7Days.find(d => d.date === b.date);
              if (dayObj) {
                dayObj.revenue += Number(b.court?.price_per_hour) || 0;
              }
            });
            setWeeklyData(last7Days);

            // 4. Process Court Data
            const courtMap: Record<string, number> = {};
            bookingsData?.forEach(b => {
              const name = b.court?.name || 'Unknown';
              courtMap[name] = (courtMap[name] || 0) + (Number(b.court?.price_per_hour) || 0);
            });
            const courtStats = Object.entries(courtMap).map(([name, value]) => ({ name, value }));
            setCourtData(courtStats);

            // 5. Calculate Stats
            const todayRevenue = bookingsData?.filter(b => b.date === todayStr)
              .reduce((sum, b) => sum + (Number(b.court?.price_per_hour) || 0), 0) || 0;

            const totalRevenue = bookingsData?.reduce((sum, b) => sum + (Number(b.court?.price_per_hour) || 0), 0) || 0;
            const avgValue = bookingsData?.length ? totalRevenue / bookingsData.length : 0;

            const { count: totalCount } = await supabase
              .from('bookings')
              .select('*', { count: 'exact', head: true })
              .eq('venue_id', venueData.id);

            const { count: courtCount } = await supabase
              .from('courts')
              .select('*', { count: 'exact', head: true })
              .eq('venue_id', venueData.id);

            const totalPossibleSlots = (courtCount || 0) * 12;
            const todayBookings = bookingsData?.filter(b => b.date === todayStr).length || 0;
            const available = Math.max(0, totalPossibleSlots - todayBookings);

            setStats({
              totalBookings: totalCount || 0,
              availableSlots: available,
              todayRevenue: todayRevenue,
              totalRevenue: totalRevenue,
              monthlyGrowth: 12.5, // Mock for now
              avgBookingValue: avgValue
            });

            setRecentBookings(bookingsData?.filter(b => b.date === todayStr) || []);
          }
        }
      } catch (error) {
        console.error("Error fetching venue data:", error);
      } finally {
        // setLoading(false);
      }
    };

    fetchVenueData();
  }, [userId]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip">
          <p className="label">{`${label}`}</p>
          <p className="intro">{`Revenue: RM ${payload[0].value.toFixed(2)}`}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-content">
          <h1>Venue Dashboard</h1>
          <p>Manage {venue?.name || 'your venue'} slots and track bookings in real-time.</p>
        </div>
        <div className="header-actions">
          <Button variant="primary" onClick={() => window.location.href = `/${userId}/slots`}>Manage Slots</Button>
        </div>
      </header>

      <div className="stats-grid-premium">
        <Card variant="glass" className="stat-card-premium">
          <div className="stat-header">
            <div className="stat-icon-wrapper blue">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
            </div>
          </div>
          <div className="stat-content">
            <span className="stat-label">Total Revenue</span>
            <h2 className="stat-value">RM {stats.totalRevenue.toFixed(2)}</h2>
          </div>
        </Card>

        <Card variant="glass" className="stat-card-premium">
          <div className="stat-header">
            <div className="stat-icon-wrapper green">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
            </div>
            <span className="stat-trend positive">+12%</span>
          </div>
          <div className="stat-content">
            <span className="stat-label">Today's Revenue</span>
            <h2 className="stat-value">RM {stats.todayRevenue.toFixed(2)}</h2>
          </div>
        </Card>

        <Card variant="glass" className="stat-card-premium">
          <div className="stat-header">
            <div className="stat-icon-wrapper green">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
            </div>
          </div>
          <div className="stat-content">
            <span className="stat-label">Total Bookings</span>
            <h2 className="stat-value">{stats.totalBookings}</h2>
          </div>
        </Card>

        <Card variant="glass" className="stat-card-premium">
          <div className="stat-header">
            <div className="stat-icon-wrapper purple">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
            </div>
          </div>
          <div className="stat-content">
            <span className="stat-label">Available Slots</span>
            <h2 className="stat-value">{stats.availableSlots}</h2>
          </div>
        </Card>

        <Card variant="glass" className="stat-card-premium">
          <div className="stat-header">
            <div className="stat-icon-wrapper orange">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>
            </div>
          </div>
          <div className="stat-content">
            <span className="stat-label">Avg. Booking Value</span>
            <h2 className="stat-value">RM {stats.avgBookingValue.toFixed(2)}</h2>
          </div>
        </Card>
      </div>

      <div className="charts-grid">
        <Card title="Revenue Overview (Last 7 Days)" variant="glass" className="chart-card">
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={weeklyData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                  tickFormatter={(value) => `RM${value}`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="var(--primary)"
                  strokeWidth={4}
                  dot={{ r: 4, fill: 'var(--primary)', strokeWidth: 2, stroke: '#000' }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Revenue by Court" variant="glass" className="chart-card">
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={courtData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  contentStyle={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {courtData.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={index % 2 === 0 ? 'var(--primary)' : 'var(--secondary)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="dashboard-bottom-grid">
        <Card title="Recent Bookings" variant="glass" className="recent-bookings-card">
          {recentBookings.length > 0 ? (
            <div className="bookings-list">
              {recentBookings.map((booking, index) => (
                <div key={index} className="booking-item-premium">
                  <div className="booking-user-info">
                    <div className="user-avatar-mini">
                      {booking.user?.first_name?.charAt(0) || 'U'}
                    </div>
                    <div className="user-details">
                      <span className="user-name">{booking.user?.first_name} {booking.user?.last_name || 'Anonymous'}</span>
                      <span className="court-name">{booking.court?.name || 'Court'}</span>
                    </div>
                  </div>
                  <div className="booking-time-info">
                    <span className="booking-time">{booking.start_time} - {booking.end_time}</span>
                    <span className="booking-status-tag">Confirmed</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <p>No bookings for today yet.</p>
              <Button variant="primary" style={{ marginTop: '1rem' }} onClick={() => window.location.href = `/${userId}/slots`}>Manage Slots</Button>
            </div>
          )}
        </Card>

        <Card title="Sales Insights" variant="glass" className="insights-card">
          <div className="insights-list">
            <div className="insight-item">
              <div className="insight-icon orange">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
              </div>
              <div className="insight-text">
                <h4>Peak Performance</h4>
                <p>Your highest revenue day this week was <strong>{weeklyData.reduce((max, d) => d.revenue > max.revenue ? d : max, { day: '', revenue: 0 }).day}</strong>.</p>
              </div>
            </div>
            <div className="insight-item">
              <div className="insight-icon blue">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
              </div>
              <div className="insight-text">
                <h4>Court Popularity</h4>
                <p><strong>{courtData.reduce((max, d) => d.value > max.value ? d : max, { name: 'N/A', value: 0 }).name}</strong> is currently your most profitable court.</p>
              </div>
            </div>
            <div className="insight-item">
              <div className="insight-icon green">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 6l-9.5 9.5-5-5L1 18"></path><polyline points="17 6 23 6 23 12"></polyline></svg>
              </div>
              <div className="insight-text">
                <h4>Growth Opportunity</h4>
                <p>Consider offering discounts on low-revenue days to increase slot occupancy.</p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <style jsx>{`
        .dashboard-container {
          display: flex;
          flex-direction: column;
          gap: 2rem;
          padding-bottom: 3rem;
        }
        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-bottom: 1rem;
        }
        .dashboard-header h1 {
          font-size: 2.5rem;
          font-weight: 800;
          margin-bottom: 0.5rem;
          background: linear-gradient(135deg, #fff 0%, #a0a0a0 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .dashboard-header p {
          color: var(--text-muted);
          font-size: 1.1rem;
        }
        
        .stats-grid-premium {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 1.5rem;
        }
        .stat-card-premium {
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        .stat-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .stat-icon-wrapper {
          width: 48px;
          height: 48px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .stat-icon-wrapper.blue { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
        .stat-icon-wrapper.green { background: rgba(16, 185, 129, 0.1); color: #10b981; }
        .stat-icon-wrapper.purple { background: rgba(139, 92, 246, 0.1); color: #8b5cf6; }
        .stat-icon-wrapper.orange { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
        
        .stat-trend {
          font-size: 0.85rem;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 100px;
        }
        .stat-trend.positive {
          background: rgba(16, 185, 129, 0.1);
          color: #10b981;
        }
        
        .stat-content {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .stat-label {
          font-size: 0.9rem;
          color: var(--text-muted);
          font-weight: 600;
        }
        .stat-value {
          font-size: 2rem;
          font-weight: 800;
          color: #fff;
        }

        .charts-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
        }
        .chart-card {
          padding: 1.5rem;
        }
        .chart-container {
          margin-top: 1.5rem;
        }

        .dashboard-bottom-grid {
          display: grid;
          grid-template-columns: 1fr 400px;
          gap: 1.5rem;
        }
        
        .bookings-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          margin-top: 1rem;
        }
        .booking-item-premium {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.05);
          padding: 1.25rem;
          border-radius: 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .booking-item-premium:hover {
          background: rgba(255, 255, 255, 0.04);
          border-color: rgba(255, 255, 255, 0.1);
          transform: translateY(-2px);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
        }
        .booking-user-info {
          display: flex;
          align-items: center;
          gap: 1.25rem;
        }
        .user-avatar-mini {
          width: 44px;
          height: 44px;
          border-radius: 14px;
          background: linear-gradient(135deg, var(--primary), var(--secondary));
          color: #000;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 1.1rem;
          box-shadow: 0 4px 12px rgba(0, 158, 96, 0.2);
        }
        .user-details {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .user-name { 
          font-weight: 700; 
          color: #fff; 
          font-size: 1.05rem;
          letter-spacing: -0.01em;
        }
        .court-name { 
          font-size: 0.75rem; 
          color: var(--text-muted); 
          text-transform: uppercase;
          letter-spacing: 0.05em;
          font-weight: 600;
        }
        .booking-time-info {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 0.5rem;
        }
        .booking-time { 
          font-weight: 700; 
          color: #fff; 
          font-size: 1rem;
          font-family: var(--font-outfit), sans-serif;
        }
        .booking-status-tag {
          font-size: 0.7rem;
          background: rgba(0, 158, 96, 0.1);
          color: var(--primary);
          padding: 4px 10px;
          border-radius: 100px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border: 1px solid rgba(0, 158, 96, 0.2);
        }

        .insights-list {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          margin-top: 1rem;
        }
        .insight-item {
          display: flex;
          gap: 1rem;
          align-items: flex-start;
        }
        .insight-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .insight-icon.orange { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
        .insight-icon.blue { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
        .insight-icon.green { background: rgba(16, 185, 129, 0.1); color: #10b981; }
        
        .insight-text h4 {
          font-size: 1rem;
          font-weight: 700;
          color: #fff;
          margin-bottom: 0.25rem;
        }
        .insight-text p {
          font-size: 0.9rem;
          color: var(--text-muted);
          line-height: 1.4;
        }

        .custom-tooltip {
          background: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 10px 15px;
          border-radius: 8px;
        }
        .custom-tooltip .label {
          color: var(--text-muted);
          font-size: 0.8rem;
          margin-bottom: 4px;
        }
        .custom-tooltip .intro {
          color: var(--primary);
          font-weight: 800;
          font-size: 1rem;
        }

        @media (max-width: 1200px) {
          .charts-grid { grid-template-columns: 1fr; }
          .dashboard-bottom-grid { grid-template-columns: 1fr; }
        }

        @media (max-width: 768px) {
          .dashboard-container { gap: 1.5rem; }
          .dashboard-header { 
            flex-direction: column; 
            align-items: flex-start; 
            gap: 1rem; 
          }
          .dashboard-header h1 { font-size: 1.8rem; }
          .dashboard-header p { font-size: 0.95rem; }
          .header-actions { width: 100%; }
          .header-actions :global(button) { width: 100%; }

          .stats-grid-premium { 
            grid-template-columns: 1fr 1fr; 
            gap: 1rem; 
          }
          .stat-card-premium { padding: 1rem; gap: 1rem; }
          .stat-icon-wrapper { width: 36px; height: 36px; }
          .stat-icon-wrapper :global(svg) { width: 18px; height: 18px; }
          .stat-label { font-size: 0.8rem; }
          .stat-value { font-size: 1.25rem; }
          .stat-trend { font-size: 0.7rem; padding: 2px 6px; }

          .chart-card { padding: 1rem; }
          .booking-item-premium { padding: 1rem; }
          .booking-user-info { gap: 0.75rem; }
          .user-avatar-mini { width: 36px; height: 36px; font-size: 0.9rem; border-radius: 10px; }
          .user-name { font-size: 0.95rem; }
          .court-name { font-size: 0.7rem; }
          .booking-time { font-size: 0.9rem; }
          .booking-status-tag { font-size: 0.6rem; padding: 2px 8px; }
        }

        @media (max-width: 480px) {
          .stats-grid-premium { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
