import { NextRequest, NextResponse } from 'next/server';
import {
  parseCookies,
  SESSION_COOKIE_NAME,
  verifySessionToken,
} from '@/lib/auth-session';
import { env, getAuthSecret } from '@/lib/env';

export async function GET(request: NextRequest) {
  // If we have no AUTH_SECRET in production we already throw at boot. In dev
  // without a secret, treat the user as logged out rather than relying on the
  // dev fallback to verify tokens issued under a different fallback string.
  if (!env.AUTH_SECRET && env.isProduction) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  const cookies = parseCookies(request.headers.get('cookie'));
  const token = cookies[SESSION_COOKIE_NAME];
  if (!token) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  const payload = verifySessionToken(token, getAuthSecret());
  if (!payload) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  return NextResponse.json({
    user: {
      name: payload.name ?? null,
      email: payload.email ?? null,
      sub: payload.sub ?? null,
    },
  });
}
