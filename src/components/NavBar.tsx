'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useChatContext } from '@/context/chat-context';
import { cn } from '@/lib/utils';
import type { UserRole } from '@/lib/types';
import { PersonIcon, CustomerIcon, AdminIcon, WrenchIcon, TechnicianIcon, PipeLogoIcon, SignOutIcon, SignInIcon } from '@/components/Icons';

const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/admin', label: 'Admin' },
];

const ROLES: { value: UserRole; label: string; Icon: React.FC<{size?: number; className?: string}>; desc: string; color: string; bg: string }[] = [
  { value: 'anon',          label: 'Guest',      Icon: PersonIcon,      desc: 'View tips & FAQs only',         color: 'text-slate-600',   bg: 'bg-slate-200'   },
  { value: 'authenticated', label: 'Customer',   Icon: CustomerIcon,    desc: 'Tickets & appointments',        color: 'text-blue-700',    bg: 'bg-blue-100'    },
  { value: 'admin',         label: 'Admin',      Icon: AdminIcon,       desc: 'Full system access',             color: 'text-[#d4651a]',   bg: 'bg-orange-100'  },
  { value: 'technician',    label: 'Technician', Icon: TechnicianIcon,  desc: 'Assigned tickets & schedule',   color: 'text-[#3a7d4c]',   bg: 'bg-green-100'   },
];

function getInitials(name: string | null): string {
  if (!name) return '?';
  return name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);
}

export default function NavBar() {
  const pathname = usePathname();
  const { role, setRole } = useChatContext();
  const [userName, setUserName] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadSession() {
      try {
        const res = await fetch('/api/auth/session', { cache: 'no-store' });
        const data = await res.json();
        if (!isMounted) return;
        setUserName(data?.user?.name ?? null);
        setUserEmail(data?.user?.email ?? null);
      } catch {
        if (isMounted) { setUserName(null); setUserEmail(null); }
      }
    }
    loadSession();
    return () => { isMounted = false; };
  }, []);

  // Close menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUserName(null);
    setUserEmail(null);
    setMenuOpen(false);
    window.location.href = '/login';
  };

  const activeRole = ROLES.find(r => r.value === role) ?? ROLES[0];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 text-base font-bold tracking-tight">
          <PipeLogoIcon size={22} className="text-[#d4651a]" />
          <span className="font-bold text-[#2c2416] tracking-tight">
            Pipe Dream Plumbing
          </span>
        </Link>

        {/* Nav links + account button */}
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

          {/* Account avatar button */}
          <div className="relative ml-2" ref={menuRef}>
            <button
              id="account-menu-btn"
              onClick={() => setMenuOpen(v => !v)}
              className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-[#d9cec2] bg-[#f4ede4] text-sm font-bold text-[#2c2416] transition-all hover:border-[#d4651a] focus:outline-none focus:border-[#d4651a]"
              aria-label="Account menu"
            >
              {userName ? getInitials(userName) : <activeRole.Icon size={16} className={activeRole.color} />}
            </button>

            {/* Dropdown */}
            {menuOpen && (
              <div
                className="absolute right-0 top-11 z-50 w-72 rounded-2xl border border-border/60 bg-card shadow-2xl shadow-black/40 overflow-hidden"
                style={{ animation: 'account-menu-in 150ms cubic-bezier(0.16,1,0.3,1)' }}
              >
                {/* User info header */}
                <div className="flex flex-col items-center gap-2 border-b border-border/40 bg-background/20 px-5 py-5">
                <div className={cn('flex h-14 w-14 items-center justify-center rounded-full border-2 border-[#d9cec2]', activeRole.bg)}>
                    {userName
                      ? <span className="text-xl font-bold text-[#2c2416]">{getInitials(userName)}</span>
                      : <activeRole.Icon size={28} className={activeRole.color} />}
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-foreground">
                      {userName ? `Hi, ${userName.split(' ')[0]}!` : 'Hi there!'}
                    </p>
                    {userEmail && (
                      <p className="text-[11px] text-muted-foreground mt-0.5">{userEmail}</p>
                    )}
                    <span className={cn('mt-1.5 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold border border-[#d9cec2]', activeRole.color, activeRole.bg)}>
                      <activeRole.Icon size={11} className={activeRole.color} /> {activeRole.label}
                    </span>
                  </div>
                </div>

                {/* Role switcher */}
                <div className="px-2 py-2">
                  <p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                    Switch Testing Role
                  </p>
                  {ROLES.map(r => (
                    <button
                      key={r.value}
                      id={`role-${r.value}`}
                      onClick={() => { setRole(r.value); setMenuOpen(false); }}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all duration-150',
                        role === r.value
                          ? 'bg-primary/10 text-foreground'
                          : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                      )}
                    >
                      <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[#d9cec2]', r.bg)}>
                        <r.Icon size={16} className={r.color} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium leading-none">{r.label}</p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground truncate">{r.desc}</p>
                      </div>
                      {role === r.value && (
                        <span className="text-primary text-xs">✓</span>
                      )}
                    </button>
                  ))}
                </div>

                {/* Sign out */}
                <div className="border-t border-border/40 px-2 py-2">
                  {userName ? (
                    <button
                      id="logout-btn"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-muted-foreground transition-all hover:bg-destructive/10 hover:text-destructive"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[#d9cec2] bg-[#f4ede4]">
                        <SignOutIcon size={15} className="text-[#7a6a58]" />
                      </div>
                      <span className="text-sm font-medium">Sign out</span>
                    </button>
                  ) : (
                    <Link
                      href="/login"
                      onClick={() => setMenuOpen(false)}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-muted-foreground transition-all hover:bg-accent hover:text-foreground"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[#d9cec2] bg-[#f4ede4]">
                        <SignInIcon size={15} className="text-[#7a6a58]" />
                      </div>
                      <span className="text-sm font-medium">Sign in</span>
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes account-menu-in {
          from { opacity: 0; transform: scale(0.95) translateY(-6px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </nav>
  );
}
