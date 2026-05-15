import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { users } from '@/db/schema';
import {
  OAUTH_STATE_COOKIE_NAME,
  buildSessionCookie,
  clearCookie,
  parseCookies,
} from '@/lib/auth-session';
import { env, getAuthSecret } from '@/lib/env';
import { createLogger } from '@/lib/logger';

const log = createLogger('auth/google/callback');

const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

function verifyOAuthState(state: string, secret: string): boolean {
  if (!state) return false;
  const parts = state.split('.');
  if (parts.length !== 3) return false;
  const [nonce, expStr, sig] = parts;
  const exp = parseInt(expStr, 10);
  if (!Number.isFinite(exp)) return false;
  if (exp < Math.floor(Date.now() / 1000)) return false;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${nonce}.${expStr}`)
    .digest('base64url');
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  const clientId = env.GOOGLE_CLIENT_ID;
  const clientSecret = env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: 'Missing Google OAuth env vars' },
      { status: 500 },
    );
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  const cookies = parseCookies(request.headers.get('cookie'));
  const stateCookie = cookies[OAUTH_STATE_COOKIE_NAME];

  const authSecret = getAuthSecret();
  if (
    !code ||
    !state ||
    !stateCookie ||
    state !== stateCookie ||
    !verifyOAuthState(state, authSecret)
  ) {
    const redirect = new URL('/login?error=oauth_state', request.nextUrl.origin);
    const response = NextResponse.redirect(redirect);
    response.headers.append('Set-Cookie', clearCookie(OAUTH_STATE_COOKIE_NAME));
    return response;
  }

  const redirectUri = new URL('/api/auth/google/callback', request.nextUrl.origin).toString();

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  if (!tokenRes.ok) {
    const redirect = new URL('/login?error=oauth_token', request.nextUrl.origin);
    const response = NextResponse.redirect(redirect);
    response.headers.append('Set-Cookie', clearCookie(OAUTH_STATE_COOKIE_NAME));
    return response;
  }

  const tokenData = await tokenRes.json();
  const idToken = tokenData.id_token as string | undefined;

  if (!idToken) {
    const redirect = new URL('/login?error=oauth_token', request.nextUrl.origin);
    const response = NextResponse.redirect(redirect);
    response.headers.append('Set-Cookie', clearCookie(OAUTH_STATE_COOKIE_NAME));
    return response;
  }

  const infoRes = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
  );

  if (!infoRes.ok) {
    const redirect = new URL('/login?error=oauth_verify', request.nextUrl.origin);
    const response = NextResponse.redirect(redirect);
    response.headers.append('Set-Cookie', clearCookie(OAUTH_STATE_COOKIE_NAME));
    return response;
  }

  const info = await infoRes.json();
  const googleSub: string | undefined = typeof info.sub === 'string' ? info.sub : undefined;
  const emailRaw: string | undefined = typeof info.email === 'string' ? info.email : undefined;
  const nameRaw: string | undefined = typeof info.name === 'string' ? info.name : undefined;

  if (!emailRaw) {
    const redirect = new URL('/login?error=oauth_no_email', request.nextUrl.origin);
    const response = NextResponse.redirect(redirect);
    response.headers.append('Set-Cookie', clearCookie(OAUTH_STATE_COOKIE_NAME));
    return response;
  }

  const email = emailRaw.toLowerCase();
  const name = nameRaw || email.split('@')[0];

  // Upsert a DB user keyed by email. The session's `sub` must be the DB
  // `users.id` (not Google's `sub`) so that downstream FK constraints
  // (tickets.user_id -> users.id, etc.) line up.
  let dbUser: { id: string; role: 'anon' | 'authenticated' | 'admin' | 'technician' } | null = null;
  try {
    const existing = await db
      .select({ id: users.id, role: users.role })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existing[0]) {
      dbUser = existing[0];
    } else {
      const id = `user_${crypto.randomBytes(8).toString('hex')}`;
      await db.insert(users).values({
        id,
        name,
        email,
        role: 'authenticated',
        createdAt: new Date().toISOString(),
      });
      dbUser = { id, role: 'authenticated' };
    }
  } catch (err) {
    log.error('oauth user upsert failed', err);
    const redirect = new URL('/login?error=oauth_db', request.nextUrl.origin);
    const response = NextResponse.redirect(redirect);
    response.headers.append('Set-Cookie', clearCookie(OAUTH_STATE_COOKIE_NAME));
    return response;
  }

  // #region agent log — verify session.sub is the DB id, not Google's sub
  fetch('http://127.0.0.1:7582/ingest/dd9ece85-55f8-447a-bccf-22903c8b3d8e', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '3fb259' },
    body: JSON.stringify({
      sessionId: '3fb259',
      hypothesisId: 'H1',
      location: 'auth/google/callback/route.ts:160',
      message: 'oauth session resolved',
      data: {
        googleSubLen: googleSub?.length ?? 0,
        googleSubIsNumeric: googleSub ? /^\d+$/.test(googleSub) : false,
        dbUserId: dbUser.id,
        dbUserIdPrefix: dbUser.id.startsWith('user_'),
        role: dbUser.role,
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion

  const payload = {
    sub: dbUser.id,
    email,
    name,
    role: dbUser.role,
  };

  const response = NextResponse.redirect(new URL('/', request.nextUrl.origin));
  response.headers.append('Set-Cookie', buildSessionCookie(payload, authSecret, SESSION_MAX_AGE));
  response.headers.append('Set-Cookie', clearCookie(OAUTH_STATE_COOKIE_NAME));

  return response;
}
