'use client';

import { useEffect, useState } from 'react';
import { useChatContext } from '@/context/chat-context';
import TicketsTable from '@/components/admin/TicketsTable';
import MetricsGraph from '@/components/admin/MetricsGraph';
import GeminiSettings from '@/components/admin/GeminiSettings';
import { cn } from '@/lib/utils';

export default function AdminPage() {
  const { role, setRole } = useChatContext();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'gemini'>('dashboard');

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
          <h1 className="text-2xl font-bold text-[#d4651a]">
            Operator Cockpit
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Monitor tickets, analyze trends, and manage customer responses — all in one view
          </p>
        </div>

        {/* Tabs */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {[
            { id: 'dashboard', label: 'Dashboard' },
            { id: 'gemini', label: 'Gemini Key' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as 'dashboard' | 'gemini')}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-medium transition-all',
                activeTab === tab.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary/50 text-muted-foreground hover:bg-secondary',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'dashboard' ? (
          <>
            {/* Tickets Table */}
            <div className="mt-4 h-[500px] lg:h-[calc(100vh-340px)] lg:min-h-[400px]">
              <TicketsTable />
            </div>

            {/* Metrics Charts */}
            <div className="mt-4">
              <MetricsGraph />
            </div>
          </>
        ) : (
          <div className="mt-4 max-w-2xl">
            <GeminiSettings />
          </div>
        )}
      </div>
    </div>
  );
}
