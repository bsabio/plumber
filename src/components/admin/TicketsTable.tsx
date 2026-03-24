'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface Ticket {
  id: string;
  userId: string;
  subject: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdAt: string;
  updatedAt: string;
}

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
] as const;

const STATUS_STYLES: Record<string, string> = {
  open: 'bg-green-500/15 text-green-400 border-green-500/30',
  in_progress: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  resolved: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  closed: 'bg-gray-500/15 text-gray-400 border-gray-500/30',
};

const PRIORITY_STYLES: Record<string, string> = {
  low: 'bg-green-500/15 text-green-400',
  medium: 'bg-yellow-500/15 text-yellow-400',
  high: 'bg-orange-500/15 text-orange-400',
  urgent: 'bg-red-500/15 text-red-400',
};

const STATUS_EMOJI: Record<string, string> = {
  open: '🟢',
  in_progress: '🟡',
  resolved: '🔵',
  closed: '⚫',
};

const PRIORITY_EMOJI: Record<string, string> = {
  low: '🟢',
  medium: '🟡',
  high: '🟠',
  urgent: '🔴',
};

interface TicketsTableProps {
  onTicketClick?: (ticket: Ticket) => void;
}

export default function TicketsTable({ onTicketClick }: TicketsTableProps) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const url = statusFilter
        ? `/api/admin/tickets?status=${statusFilter}`
        : '/api/admin/tickets';
      const res = await fetch(url);
      const data = await res.json();
      setTickets(data.tickets || []);
    } catch {
      console.error('Failed to fetch tickets');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const handleRowClick = (ticket: Ticket) => {
    setSelectedId(ticket.id);
    onTicketClick?.(ticket);
  };

  return (
    <Card className="glass border-border/40 flex flex-col h-full">
      <CardHeader className="pb-3 pt-4 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">
            🎫 Active Tickets
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {tickets.length} total
            </span>
            <Button
              size="xs"
              variant="ghost"
              onClick={fetchTickets}
              className="text-xs"
            >
              ↻ Refresh
            </Button>
          </div>
        </div>
        {/* Status filter tabs */}
        <div className="flex gap-1 mt-2">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setStatusFilter(filter.value)}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-medium transition-all',
                statusFilter === filter.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary/50 text-muted-foreground hover:bg-secondary',
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="flex-1 px-0 pb-0">
        <ScrollArea className="h-[calc(100%-0px)] custom-scrollbar">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
            </div>
          ) : tickets.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              No tickets found.
            </p>
          ) : (
            <div className="divide-y divide-border/20">
              {tickets.map((ticket) => (
                <button
                  key={ticket.id}
                  onClick={() => handleRowClick(ticket)}
                  className={cn(
                    'w-full text-left px-4 py-3 transition-all hover:bg-accent/30',
                    selectedId === ticket.id && 'bg-primary/10 border-l-2 border-l-primary',
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{ticket.subject}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                        {ticket.description}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <Badge variant="outline" className={cn('text-[10px]', STATUS_STYLES[ticket.status])}>
                        {STATUS_EMOJI[ticket.status]} {ticket.status.replace('_', ' ')}
                      </Badge>
                      <Badge variant="outline" className={cn('text-[10px]', PRIORITY_STYLES[ticket.priority])}>
                        {PRIORITY_EMOJI[ticket.priority]} {ticket.priority}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground/60 mt-1">
                    {new Date(ticket.createdAt).toLocaleDateString()}
                  </p>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
