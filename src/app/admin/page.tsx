'use client';

import { useEffect } from 'react';
import { useChatContext } from '@/context/chat-context';
import TicketsTable from '@/components/admin/TicketsTable';
import MetricsGraph from '@/components/admin/MetricsGraph';

export default function AdminPage() {
  const { role, setRole } = useChatContext();

  // Auto-switch to admin role when visiting this page
  useEffect(() => {
    if (role !== 'admin') {
      setRole('admin');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen pt-14 pb-14 px-4">
      <div className="mx-auto max-w-[1400px]">
        {/* Header */}
        <div className="pt-4 pb-4">
          <h1 className="text-2xl font-bold">
            <span className="bg-gradient-to-r from-primary via-blue-400 to-cyan-400 bg-clip-text text-transparent">
              ⚡ Operator Cockpit
            </span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Monitor tickets, analyze trends, and manage customer responses — all in one view
          </p>
        </div>

        {/* Tickets Table */}
        <div className="h-[500px] lg:h-[calc(100vh-340px)] lg:min-h-[400px]">
          <TicketsTable />
        </div>

        {/* Metrics Charts */}
        <div className="mt-4">
          <MetricsGraph />
        </div>
      </div>
    </div>
  );
}
