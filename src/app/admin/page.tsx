'use client';

import { useState, useEffect } from 'react';
import { useChatContext } from '@/context/chat-context';
import TicketsTable from '@/components/admin/TicketsTable';
import AdminChat from '@/components/admin/AdminChat';
import MetricsGraph from '@/components/admin/MetricsGraph';

interface TicketForChat {
  id: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
}

export default function AdminPage() {
  const { role, setRole } = useChatContext();
  const [prefillMessage, setPrefillMessage] = useState<string | undefined>();

  // Auto-switch to admin role when visiting this page
  useEffect(() => {
    if (role !== 'admin') {
      setRole('admin');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleTicketClick = (ticket: TicketForChat) => {
    setPrefillMessage(`Suggest response for ${ticket.subject}`);
  };

  const handlePrefillConsumed = () => {
    setPrefillMessage(undefined);
  };

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

        {/* Main two-column layout: Tickets + Chat */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5" style={{ minHeight: 'calc(100vh - 280px)' }}>
          {/* Left: Tickets Table (3/5 width) */}
          <div className="lg:col-span-3">
            <TicketsTable onTicketClick={handleTicketClick} />
          </div>

          {/* Right: Admin Chat (2/5 width) */}
          <div className="lg:col-span-2">
            <AdminChat
              prefillMessage={prefillMessage}
              onPrefillConsumed={handlePrefillConsumed}
            />
          </div>
        </div>

        {/* Bottom: Metrics Charts */}
        <div className="mt-4">
          <MetricsGraph />
        </div>
      </div>
    </div>
  );
}
