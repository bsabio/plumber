'use client';

import type { ToolResult } from '@/lib/types';

interface ToolResultCardProps {
  result: ToolResult;
}

export default function ToolResultCard({ result }: ToolResultCardProps) {
  const data = result.data;
  const items = Array.isArray(data) ? data : [data];

  if (!result.success) {
    return (
      <div className="tool-result-card error">
        <div className="tool-result-header">
          <span className="tool-badge error">⚠️ {result.toolName}</span>
        </div>
        <p className="tool-result-message">{result.message}</p>
      </div>
    );
  }

  // Render based on tool type
  switch (result.toolName) {
    case 'query_tickets':
    case 'query_appointments':
    case 'manage_users':
      return <TableResult items={items} toolName={result.toolName} />;

    case 'create_ticket':
    case 'schedule_appointment':
      return <SuccessCard result={result} />;

    case 'get_ticket_detail':
      return <DetailCard item={items[0]} />;

    case 'get_newsletter':
      return <NewsletterResult items={items} />;

    default:
      return (
        <div className="tool-result-card">
          <div className="tool-result-header">
            <span className="tool-badge">{result.toolName}</span>
          </div>
          <p className="tool-result-message">{result.message}</p>
        </div>
      );
  }
}

function TableResult({ items, toolName }: { items: Record<string, unknown>[]; toolName: string }) {
  if (items.length === 0 || !items[0] || Object.keys(items[0]).length === 0) {
    return (
      <div className="tool-result-card">
        <span className="tool-badge">{toolName}</span>
        <p className="tool-result-message">No results found.</p>
      </div>
    );
  }

  // Pick relevant columns
  const allKeys = Object.keys(items[0]);
  const excludeKeys = ['id', 'userId', 'user_id', 'createdAt', 'created_at', 'updatedAt', 'updated_at'];
  const displayKeys = allKeys.filter((k) => !excludeKeys.includes(k)).slice(0, 5);

  return (
    <div className="tool-result-card">
      <div className="tool-result-header">
        <span className="tool-badge">{toolName}</span>
        <span className="tool-count">{items.length} result(s)</span>
      </div>
      <div className="tool-table-wrapper">
        <table className="tool-table">
          <thead>
            <tr>
              {displayKeys.map((key) => (
                <th key={key}>{formatColumnName(key)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={idx}>
                {displayKeys.map((key) => (
                  <td key={key}>
                    {formatCellValue(key, item[key])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SuccessCard({ result }: { result: ToolResult }) {
  const item = Array.isArray(result.data) ? result.data[0] : result.data;
  return (
    <div className="tool-result-card success">
      <div className="tool-result-header">
        <span className="tool-badge success">✅ {result.toolName}</span>
      </div>
      <p className="tool-result-message">{result.message}</p>
      {item && Object.keys(item).length > 0 && (
        <div className="tool-detail-grid">
          {Object.entries(item)
            .filter(([key]) => !['id', 'userId', 'user_id'].includes(key))
            .slice(0, 6)
            .map(([key, value]) => (
              <div key={key} className="tool-detail-item">
                <span className="tool-detail-label">{formatColumnName(key)}</span>
                <span className="tool-detail-value">{String(value)}</span>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

function DetailCard({ item }: { item: Record<string, unknown> }) {
  if (!item || Object.keys(item).length === 0) {
    return <div className="tool-result-card"><p>No details found.</p></div>;
  }
  return (
    <div className="tool-result-card">
      <div className="tool-result-header">
        <span className="tool-badge">🎫 Ticket Detail</span>
      </div>
      <div className="tool-detail-grid">
        {Object.entries(item)
          .filter(([key]) => key !== 'id')
          .map(([key, value]) => (
            <div key={key} className="tool-detail-item">
              <span className="tool-detail-label">{formatColumnName(key)}</span>
              <span className="tool-detail-value">{String(value)}</span>
            </div>
          ))}
      </div>
    </div>
  );
}

function NewsletterResult({ items }: { items: Record<string, unknown>[] }) {
  if (items.length === 0 || !items[0] || Object.keys(items[0]).length === 0) {
    return (
      <div className="tool-result-card">
        <span className="tool-badge">📰 Newsletter</span>
        <p className="tool-result-message">No articles found.</p>
      </div>
    );
  }

  return (
    <div className="tool-result-card newsletter">
      <div className="tool-result-header">
        <span className="tool-badge">📰 Newsletter</span>
      </div>
      {items.map((article, idx) => (
        <div key={idx} className="newsletter-article">
          <h4 className="newsletter-title">{String(article.title)}</h4>
          <span className="newsletter-category">{String(article.category)}</span>
          <p className="newsletter-body">
            {String(article.body).slice(0, 300)}
            {String(article.body).length > 300 ? '...' : ''}
          </p>
        </div>
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
    const statusEmoji: Record<string, string> = {
      open: '🟢',
      in_progress: '🟡',
      resolved: '🔵',
      closed: '⚫',
      scheduled: '📅',
      confirmed: '✅',
      completed: '🏁',
      cancelled: '❌',
    };
    return `${statusEmoji[String(value)] || ''} ${String(value)}`;
  }
  if (key === 'priority') {
    const priorityEmoji: Record<string, string> = {
      low: '🟢',
      medium: '🟡',
      high: '🟠',
      urgent: '🔴',
    };
    return `${priorityEmoji[String(value)] || ''} ${String(value)}`;
  }
  return String(value);
}
