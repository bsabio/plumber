'use client';

import type { ToolResult } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ToolResultCardProps {
  result: ToolResult;
}

export default function ToolResultCard({ result }: ToolResultCardProps) {
  const data = result.data;
  const items = Array.isArray(data) ? data : [data];

  if (!result.success) {
    return (
      <Card className="border-destructive/30 bg-destructive/5">
        <CardHeader className="pb-2 pt-3 px-3">
          <Badge variant="destructive" className="w-fit text-xs">
            ⚠️ {result.toolName}
          </Badge>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          <p className="text-sm text-destructive">{result.message}</p>
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
    case 'schedule_appointment':
    case 'create_service_ticket':
      return <SuccessCard result={result} />;
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

function SuccessCard({ result }: { result: ToolResult }) {
  const item = Array.isArray(result.data) ? result.data[0] : result.data;
  return (
    <Card className="border-green-500/20 bg-green-500/5">
      <CardHeader className="pb-2 pt-3 px-3">
        <Badge className="w-fit text-xs bg-green-600 hover:bg-green-700">✅ {result.toolName}</Badge>
      </CardHeader>
      <CardContent className="px-3 pb-3 space-y-2">
        <p className="text-sm text-green-300">{result.message}</p>
        {item && Object.keys(item).length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(item)
              .filter(([key]) => !['id', 'userId', 'user_id'].includes(key))
              .slice(0, 6)
              .map(([key, value]) => (
                <div key={key} className="rounded-md bg-background/40 px-2 py-1.5">
                  <p className="text-[10px] text-muted-foreground">{formatColumnName(key)}</p>
                  <p className="text-xs font-medium truncate">{String(value)}</p>
                </div>
              ))}
          </div>
        )}
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
        <CardTitle className="text-sm">🎫 Ticket Detail</CardTitle>
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
              <span className="text-sm">📰</span>
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
