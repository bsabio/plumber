'use client';

import { useChatContext } from '@/context/chat-context';
import { cn } from '@/lib/utils';
import type { UserRole } from '@/lib/types';

const ROLES: { value: UserRole; label: string; icon: string; desc: string }[] = [
  { value: 'anon', label: 'Guest', icon: '👤', desc: 'View tips & FAQs' },
  { value: 'authenticated', label: 'Customer', icon: '🔑', desc: 'Tickets & appointments' },
  { value: 'admin', label: 'Admin', icon: '⚡', desc: 'Full system access' },
];

export default function RoleTestingFooter() {
  const { role, setRole } = useChatContext();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-border/40">
      <div className="mx-auto flex h-12 max-w-xl items-center justify-center gap-1 px-4">
        <span className="mr-2 text-xs font-medium text-muted-foreground hidden sm:inline">
          Testing Role:
        </span>
        {ROLES.map((r) => (
          <button
            key={r.value}
            onClick={() => setRole(r.value)}
            title={r.desc}
            className={cn(
              'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-all duration-200',
              role === r.value
                ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25'
                : 'bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground',
            )}
          >
            <span>{r.icon}</span>
            <span>{r.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
