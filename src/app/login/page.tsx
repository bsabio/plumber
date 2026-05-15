'use client';

import { useEffect, useState } from 'react';
import { PipeLogoIcon, PersonIcon, CustomerIcon } from '@/components/Icons';
import { cn } from '@/lib/utils';

type Tab = 'signin' | 'register';

const OAUTH_ERROR_LABELS: Record<string, string> = {
  oauth_state: 'Sign-in expired or was tampered with. Please try again.',
  oauth_token: 'Google rejected the authorization code. Please try again.',
  oauth_verify: 'Could not verify your Google identity. Please try again.',
  oauth_no_email: 'Google did not return an email address.',
  oauth_db: 'Could not save your account. Reason:',
};

export default function LoginPage() {
  const [tab, setTab] = useState<Tab>('signin');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Surface OAuth-callback errors (?error=...&reason=...) on the page itself.
  // Deferred to a microtask so the setError doesn't run synchronously inside
  // the effect body (avoids react-hooks/set-state-in-effect).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let cancelled = false;
    Promise.resolve().then(() => {
      if (cancelled) return;
      const params = new URLSearchParams(window.location.search);
      const e = params.get('error');
      if (!e) return;
      const label = OAUTH_ERROR_LABELS[e] ?? `Sign-in failed: ${e}`;
      setError(label);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Sign-in fields
  const [siEmail, setSiEmail] = useState('');
  const [siPassword, setSiPassword] = useState('');

  // Register fields
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirm, setRegConfirm] = useState('');

  const resetMessages = () => { setError(''); setSuccess(''); };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: siEmail, password: siPassword }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Sign-in failed.'); return; }
      setSuccess(`Welcome back, ${data.name}! Redirecting…`);
      setTimeout(() => { window.location.href = '/'; }, 800);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    if (regPassword !== regConfirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: regName, email: regEmail, password: regPassword }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Registration failed.'); return; }
      setSuccess(`Account created! Welcome, ${data.name}! Redirecting…`);
      setTimeout(() => { window.location.href = '/'; }, 800);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center pt-14 px-4 bg-[#f4ede4]">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="mb-6 flex flex-col items-center gap-2">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#d4651a]">
            <PipeLogoIcon size={28} className="text-white" />
          </div>
          <h1 className="text-xl font-bold text-[#2c2416]">Pipe Dream Plumbing</h1>
          <p className="text-sm text-[#7a6a58]">Your plumbing service portal</p>
        </div>

        {/* Card */}
        <div className="rounded-xl border-2 border-[#d9cec2] bg-[#fffdf9] overflow-hidden">

          {/* Tabs */}
          <div className="flex border-b-2 border-[#d9cec2]">
            {([
              { id: 'signin',   label: 'Sign In',        Icon: CustomerIcon },
              { id: 'register', label: 'Create Account', Icon: PersonIcon   },
            ] as { id: Tab; label: string; Icon: React.FC<{size?: number; className?: string}> }[]).map(t => (
              <button
                key={t.id}
                onClick={() => { setTab(t.id); resetMessages(); }}
                className={cn(
                  'flex flex-1 items-center justify-center gap-2 py-3 text-sm font-semibold transition-all',
                  tab === t.id
                    ? 'bg-[#fffdf9] text-[#d4651a] border-b-2 border-[#d4651a] -mb-[2px]'
                    : 'bg-[#f4ede4] text-[#7a6a58] hover:text-[#2c2416]'
                )}
              >
                <t.Icon size={15} className={tab === t.id ? 'text-[#d4651a]' : 'text-[#7a6a58]'} />
                {t.label}
              </button>
            ))}
          </div>

          <div className="p-6 space-y-4">

            {/* Error / Success banners */}
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
                {error}
              </div>
            )}
            {success && (
              <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-2.5 text-sm text-green-700">
                {success}
              </div>
            )}

            {/* ── SIGN IN ── */}
            {tab === 'signin' && (
              <form onSubmit={handleSignIn} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#7a6a58] mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    id="signin-email"
                    required
                    autoComplete="email"
                    value={siEmail}
                    onChange={e => setSiEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-md border-2 border-[#d9cec2] bg-[#f4ede4] px-3 py-2.5 text-sm text-[#2c2416] placeholder:text-[#b09880] focus:outline-none focus:border-[#d4651a] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#7a6a58] mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    id="signin-password"
                    required
                    autoComplete="current-password"
                    value={siPassword}
                    onChange={e => setSiPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-md border-2 border-[#d9cec2] bg-[#f4ede4] px-3 py-2.5 text-sm text-[#2c2416] placeholder:text-[#b09880] focus:outline-none focus:border-[#d4651a] transition-colors"
                  />
                </div>
                <button
                  id="signin-submit"
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-md bg-[#d4651a] py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#b8541a] disabled:opacity-50"
                >
                  {loading ? 'Signing in…' : 'Sign In'}
                </button>

                <div className="relative flex items-center gap-3 py-1">
                  <div className="flex-1 border-t-2 border-[#d9cec2]" />
                  <span className="text-[11px] font-medium text-[#b09880]">or</span>
                  <div className="flex-1 border-t-2 border-[#d9cec2]" />
                </div>

                <button
                  id="google-signin-btn"
                  type="button"
                  onClick={() => { window.location.href = '/api/auth/google'; }}
                  className="flex w-full items-center justify-center gap-3 rounded-md border-2 border-[#d9cec2] bg-[#fffdf9] py-2.5 text-sm font-semibold text-[#2c2416] transition-all hover:border-[#c4b8aa] hover:bg-[#f4ede4]"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continue with Google
                </button>

                <p className="text-center text-[11px] text-[#b09880]">
                  No account?{' '}
                  <button type="button" onClick={() => { setTab('register'); resetMessages(); }} className="font-semibold text-[#d4651a] hover:underline">
                    Create one
                  </button>
                </p>
              </form>
            )}

            {/* ── CREATE ACCOUNT ── */}
            {tab === 'register' && (
              <form onSubmit={handleRegister} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#7a6a58] mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    id="reg-name"
                    required
                    autoComplete="name"
                    value={regName}
                    onChange={e => setRegName(e.target.value)}
                    placeholder="Jane Smith"
                    className="w-full rounded-md border-2 border-[#d9cec2] bg-[#f4ede4] px-3 py-2.5 text-sm text-[#2c2416] placeholder:text-[#b09880] focus:outline-none focus:border-[#d4651a] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#7a6a58] mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    id="reg-email"
                    required
                    autoComplete="email"
                    value={regEmail}
                    onChange={e => setRegEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-md border-2 border-[#d9cec2] bg-[#f4ede4] px-3 py-2.5 text-sm text-[#2c2416] placeholder:text-[#b09880] focus:outline-none focus:border-[#d4651a] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#7a6a58] mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    id="reg-password"
                    required
                    autoComplete="new-password"
                    value={regPassword}
                    onChange={e => setRegPassword(e.target.value)}
                    placeholder="Min. 6 characters"
                    className="w-full rounded-md border-2 border-[#d9cec2] bg-[#f4ede4] px-3 py-2.5 text-sm text-[#2c2416] placeholder:text-[#b09880] focus:outline-none focus:border-[#d4651a] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#7a6a58] mb-1">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    id="reg-confirm"
                    required
                    autoComplete="new-password"
                    value={regConfirm}
                    onChange={e => setRegConfirm(e.target.value)}
                    placeholder="••••••••"
                    className={cn(
                      'w-full rounded-md border-2 bg-[#f4ede4] px-3 py-2.5 text-sm text-[#2c2416] placeholder:text-[#b09880] focus:outline-none transition-colors',
                      regConfirm && regConfirm !== regPassword
                        ? 'border-red-300 focus:border-red-400'
                        : 'border-[#d9cec2] focus:border-[#d4651a]'
                    )}
                  />
                  {regConfirm && regConfirm !== regPassword && (
                    <p className="mt-1 text-[11px] text-red-500">Passwords don&apos;t match</p>
                  )}
                </div>
                <button
                  id="register-submit"
                  type="submit"
                  disabled={loading || (!!regConfirm && regConfirm !== regPassword)}
                  className="w-full rounded-md bg-[#3a7d4c] py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#2d6340] disabled:opacity-50"
                >
                  {loading ? 'Creating account…' : 'Create Account'}
                </button>

                <p className="text-center text-[11px] text-[#b09880]">
                  Already have an account?{' '}
                  <button type="button" onClick={() => { setTab('signin'); resetMessages(); }} className="font-semibold text-[#d4651a] hover:underline">
                    Sign in
                  </button>
                </p>
              </form>
            )}
          </div>
        </div>

        <p className="mt-4 text-center text-[11px] text-[#b09880]">
          By signing in you agree to our Terms of Service
        </p>
      </div>
    </div>
  );
}
