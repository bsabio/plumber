'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useChatContext } from '@/context/chat-context';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/login', label: 'Login' },
  { href: '/admin', label: 'Admin' },
];

const ROLE_BADGE: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' }> = {
  anon: { label: '👤 Guest', variant: 'secondary' },
  authenticated: { label: '🔑 Customer', variant: 'default' },
  admin: { label: '⚡ Admin', variant: 'destructive' },
};

export default function NavBar() {
  const pathname = usePathname();
  const { role } = useChatContext();
  const badge = ROLE_BADGE[role];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 text-lg font-bold tracking-tight">
          <span className="text-2xl">🔧</span>
          <span className="bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
            Pipe Dream Plumbing
          </span>
        </Link>

        {/* Links */}
        <div className="flex items-center gap-1">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-sm font-medium transition-all',
                pathname === link.href
                  ? 'bg-secondary text-secondary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              {link.label}
            </Link>
          ))}

          <div className="ml-3 hidden sm:block">
            <Badge variant={badge.variant}>{badge.label}</Badge>
          </div>
        </div>
      </div>
    </nav>
  );
}
