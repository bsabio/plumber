'use client';

import { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

interface RechartsDataPoint {
  name: string;
  value: number;
  fill: string;
}

interface MetricsData {
  ticketStatusBreakdown: RechartsDataPoint[];
  ticketPriorityBreakdown: RechartsDataPoint[];
  appointmentStatusBreakdown: RechartsDataPoint[];
  serviceTypeBreakdown: RechartsDataPoint[];
  summary: {
    totalTickets: number;
    openTickets: number;
    closedTickets: number;
    resolvedTickets: number;
    inProgressTickets: number;
    totalAppointments: number;
    upcomingAppointments: number;
  };
}

export default function MetricsGraph() {
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMetrics() {
      try {
        const res = await fetch('/api/admin/metrics');
        const data = await res.json();
        setMetrics(data);
      } catch {
        console.error('Failed to fetch metrics');
      } finally {
        setLoading(false);
      }
    }
    fetchMetrics();
  }, []);

  if (loading) {
    return (
      <Card className="glass border-border/40">
        <CardContent className="flex items-center justify-center p-8">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
        </CardContent>
      </Card>
    );
  }

  if (!metrics) {
    return (
      <Card className="glass border-border/40">
        <CardContent className="p-8 text-center text-sm text-muted-foreground">
          Failed to load metrics.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {/* Service Type Bar Chart (Issue Frequency) */}
      <Card className="glass border-border/40 lg:col-span-2">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-semibold">
            📊 Issue Frequency by Type
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Breakdown of plumbing service types
          </p>
        </CardHeader>
        <CardContent className="px-2 pb-4">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={metrics.serviceTypeBreakdown}
              margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
            >
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                axisLine={{ stroke: '#334155' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'oklch(0.17 0.015 260)',
                  border: '1px solid oklch(0.28 0.02 260)',
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: '#e2e8f0',
                }}
              />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {metrics.serviceTypeBreakdown.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Ticket Status Donut */}
      <Card className="glass border-border/40">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-semibold">
            🎫 Ticket Status
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            {metrics.summary.totalTickets} total tickets
          </p>
        </CardHeader>
        <CardContent className="px-2 pb-4">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={metrics.ticketStatusBreakdown}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={75}
                paddingAngle={3}
                dataKey="value"
                strokeWidth={0}
              >
                {metrics.ticketStatusBreakdown.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'oklch(0.17 0.015 260)',
                  border: '1px solid oklch(0.28 0.02 260)',
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: '#e2e8f0',
                }}
              />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Summary Stats Row */}
      <Card className="glass border-border/40 lg:col-span-3">
        <CardContent className="py-3 px-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {[
              { label: 'Total Tickets', value: metrics.summary.totalTickets, icon: '🎫' },
              { label: 'Open', value: metrics.summary.openTickets, icon: '🟢' },
              { label: 'In Progress', value: metrics.summary.inProgressTickets, icon: '🟡' },
              { label: 'Resolved', value: metrics.summary.resolvedTickets, icon: '🔵' },
              { label: 'Closed', value: metrics.summary.closedTickets, icon: '⚫' },
              { label: 'Appointments', value: metrics.summary.totalAppointments, icon: '📅' },
              { label: 'Upcoming', value: metrics.summary.upcomingAppointments, icon: '⏰' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className="text-lg font-bold">
                  {stat.icon} {stat.value}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
