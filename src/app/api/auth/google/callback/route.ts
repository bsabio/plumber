import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import {
  OAUTH_STATE_COOKIE_NAME,
  buildSessionCookie,
  clearCookie,
  parseCookies,
} from '@/lib/auth-session';
import { env, getAuthSecret } from '@/lib/env';

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
  const payload = {
    sub: info.sub,
    email: info.email,
    name: info.name,
  };

  const response = NextResponse.redirect(new URL('/', request.nextUrl.origin));
  response.headers.append('Set-Cookie', buildSessionCookie(payload, authSecret, SESSION_MAX_AGE));
  response.headers.append('Set-Cookie', clearCookie(OAUTH_STATE_COOKIE_NAME));

  return response;
}
