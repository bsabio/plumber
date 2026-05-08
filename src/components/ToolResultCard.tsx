'use client';

import type { ToolResult } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { TicketIcon, CalendarIcon, ResolveIcon, WarningIcon, NewsIcon, DocumentIcon } from '@/components/Icons';

interface ToolResultCardProps {
  result: ToolResult;
}

export default function ToolResultCard({ result }: ToolResultCardProps) {
  const data = result.data;
  const items = Array.isArray(data) ? data : [data];

  if (!result.success) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardHeader className="pb-2 pt-3 px-3">
          <div className="flex items-center gap-1.5">
            <WarningIcon size={14} className="text-red-600" />
            <Badge variant="destructive" className="w-fit text-xs">{result.toolName}</Badge>
          </div>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          <p className="text-sm text-red-700">{result.message}</p>
        </CardContent>
      </Card>
    );
  }

  switch (result.toolName) {
    case 'query_tickets':
    case 'query_appointments':
    case 'manage_users':
      return <TableResult items={items} toolName={result.toolName} />;
    case 'create_ticket':
    case 'create_service_ticket':
      return <CreateTicketCard result={result} />;
    case 'schedule_appointment':
      return <ScheduleCard result={result} />;
    case 'update_ticket_status':
      return <ResolveCard result={result} />;
    case 'get_ticket_detail':
      return <DetailCard item={items[0]} />;
    case 'get_newsletter':
    case 'get_newsletter_advice':
      return <NewsletterResult items={items} />;
    default:
      return (
        <Card className="bg-card/50">
          <CardHeader className="pb-2 pt-3 px-3">
            <Badge variant="secondary" className="w-fit text-xs">
              {result.toolName}
            </Badge>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <p className="text-sm">{result.message}</p>
          </CardContent>
        </Card>
      );
  }
}

function TableResult({
  items,
  toolName,
}: {
  items: Record<string, unknown>[];
  toolName: string;
}) {
  if (items.length === 0 || !items[0] || Object.keys(items[0]).length === 0) {
    return (
      <Card className="bg-card/50">
        <CardContent className="py-3 px-3">
          <Badge variant="secondary" className="text-xs">{toolName}</Badge>
          <p className="mt-2 text-sm text-muted-foreground">No results found.</p>
        </CardContent>
      </Card>
    );
  }

  const allKeys = Object.keys(items[0]);
  const excludeKeys = ['id', 'userId', 'user_id', 'createdAt', 'created_at', 'updatedAt', 'updated_at'];
  const displayKeys = allKeys.filter((k) => !excludeKeys.includes(k)).slice(0, 5);

  return (
    <Card className="bg-card/50 overflow-hidden">
      <CardHeader className="pb-2 pt-3 px-3 flex-row items-center justify-between">
        <Badge variant="secondary" className="text-xs">{toolName}</Badge>
        <span className="text-xs text-muted-foreground">{items.length} result(s)</span>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-t border-border/30">
                {displayKeys.map((key) => (
                  <th key={key} className="px-3 py-2 text-left font-medium text-muted-foreground">
                    {formatColumnName(key)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={idx} className="border-t border-border/20 hover:bg-accent/30 transition-colors">
                  {displayKeys.map((key) => (
                    <td key={key} className="px-3 py-2 text-foreground/80">
                      {formatCellValue(key, item[key])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Core Function 1: Create Ticket ──────────────────────────────────────────
function CreateTicketCard({ result }: { result: ToolResult }) {
  const item: Record<string, unknown> = Array.isArray(result.data) ? result.data[0] : result.data;
  const subject = item?.subject ?? item?.title ?? 'New Ticket';
  const priority = String(item?.priority ?? 'medium');
  const status = String(item?.status ?? 'open');
  const priorityColors: Record<string, string> = {
    urgent: 'text-red-400 bg-red-500/10 border-red-500/30',
    high: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
    medium: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
    low: 'text-green-400 bg-green-500/10 border-green-500/30',
  };
  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardContent className="px-4 py-4 space-y-3">
        <div className="flex items-center gap-2">
          <TicketIcon size={20} className="text-[#d4651a]" />
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-blue-400">Ticket Created</p>
            <p className="text-sm font-semibold text-foreground leading-tight">{String(subject)}</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <span className={cn('rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize', priorityColors[priority] ?? priorityColors.medium)}>
            {priority} priority
          </span>
          <span className="rounded-full border border-border/50 bg-background/40 px-2.5 py-0.5 text-[11px] capitalize text-muted-foreground">
            {status}
          </span>
          {item?.id != null && (
            <span className="rounded-full border border-border/50 bg-background/40 px-2.5 py-0.5 text-[11px] font-mono text-muted-foreground">
              #{String(item.id)}
            </span>
          )}
        </div>
        {item?.description != null && (
          <p className="text-xs text-muted-foreground leading-relaxed border-t border-border/30 pt-2">
            {String(item.description).slice(0, 200)}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ── Core Function 2: Schedule Appointment ───────────────────────────────────
function ScheduleCard({ result }: { result: ToolResult }) {
  const item: Record<string, unknown> = Array.isArray(result.data) ? result.data[0] : result.data;
  const date = item?.scheduledDate ?? item?.date ?? item?.scheduledAt ?? '';
  const time = item?.scheduledTime ?? item?.time ?? '';
  const service = item?.serviceType ?? item?.service ?? item?.notes ?? 'Plumbing Service';
  return (
    <Card className="border-green-200 bg-green-50">
      <CardContent className="px-4 py-4 space-y-3">
        <div className="flex items-center gap-2">
          <CalendarIcon size={20} className="text-[#3a7d4c]" />
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-violet-400">Appointment Scheduled</p>
            <p className="text-sm font-semibold text-foreground">{String(service)}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {date && (
            <div className="rounded-lg bg-background/40 border border-border/30 px-3 py-2">
              <p className="text-[10px] text-muted-foreground">Date</p>
              <p className="text-sm font-semibold">{String(date)}</p>
            </div>
          )}
          {time && (
            <div className="rounded-lg bg-background/40 border border-border/30 px-3 py-2">
              <p className="text-[10px] text-muted-foreground">Time</p>
              <p className="text-sm font-semibold">{String(time)}</p>
            </div>
          )}
        </div>
        {item?.id != null && (
          <p className="text-[11px] font-mono text-muted-foreground/60">Confirmation #{String(item.id)}</p>
        )}
      </CardContent>
    </Card>
  );
}

// ── Core Function 3: Resolve Ticket ─────────────────────────────────────────
function ResolveCard({ result }: { result: ToolResult }) {
  const item: Record<string, unknown> = Array.isArray(result.data) ? result.data[0] : result.data;
  const subject = item?.subject ?? item?.title ?? 'Ticket';
  return (
    <Card className="border-amber-200 bg-amber-50">
      <CardContent className="px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100">
            <ResolveIcon size={20} className="text-[#c49a3c]" />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-emerald-400">Ticket Resolved</p>
            <p className="text-sm font-semibold text-foreground leading-tight">{String(subject)}</p>
            {item?.id != null && (
              <p className="text-[11px] font-mono text-muted-foreground/60 mt-0.5">#{String(item.id)}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DetailCard({ item }: { item: Record<string, unknown> }) {
  if (!item || Object.keys(item).length === 0) {
    return (
      <Card className="bg-card/50">
        <CardContent className="py-3">
          <p className="text-sm text-muted-foreground">No details found.</p>
        </CardContent>
      </Card>
    );
  }
  return (
    <Card className="bg-card/50">
      <CardHeader className="pb-2 pt-3 px-3">
            <CardTitle className="flex items-center gap-1.5 text-sm">
              <DocumentIcon size={14} className="text-[#7a6a58]" />
              Ticket Detail
            </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3">
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(item)
            .filter(([key]) => key !== 'id')
            .map(([key, value]) => (
              <div key={key} className="rounded-md bg-background/40 px-2 py-1.5">
                <p className="text-[10px] text-muted-foreground">{formatColumnName(key)}</p>
                <p className="text-xs font-medium">{String(value)}</p>
              </div>
            ))}
        </div>
      </CardContent>
    </Card>
  );
}

function NewsletterResult({ items }: { items: Record<string, unknown>[] }) {
  if (items.length === 0 || !items[0] || Object.keys(items[0]).length === 0) {
    return (
      <Card className="bg-card/50">
        <CardContent className="py-3 px-3">
          <Badge variant="secondary" className="text-xs">📰 Newsletter</Badge>
          <p className="mt-2 text-sm text-muted-foreground">No articles found.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((article, idx) => (
        <Card key={idx} className="bg-card/50">
          <CardContent className="py-3 px-3">
            <div className="flex items-center gap-2 mb-2">
              <NewsIcon size={14} className="text-[#7a6a58]" />
              <h4 className="text-sm font-semibold">{String(article.title)}</h4>
            </div>
            <Badge variant="secondary" className="text-[10px] mb-2">
              {String(article.category)}
            </Badge>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {String(article.body).slice(0, 300)}
              {String(article.body).length > 300 ? '...' : ''}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function formatColumnName(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

function formatCellValue(key: string, value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (key === 'status') {
    const e: Record<string, string> = {
      open: '🟢', in_progress: '🟡', resolved: '🔵', closed: '⚫',
      scheduled: '📅', confirmed: '✅', completed: '🏁', cancelled: '❌',
    };
    return `${e[String(value)] || ''} ${String(value)}`;
  }
  if (key === 'priority') {
    const e: Record<string, string> = { low: '🟢', medium: '🟡', high: '🟠', urgent: '🔴' };
    return `${e[String(value)] || ''} ${String(value)}`;
  }
  return String(value);
}
