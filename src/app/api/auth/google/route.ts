import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { OAUTH_STATE_COOKIE_NAME, serializeCookie } from '@/lib/auth-session';
import { env, getAuthSecret } from '@/lib/env';

// Short-lived OAuth state token so a stolen state cookie can't be replayed.
const OAUTH_STATE_MAX_AGE = 10 * 60;

export async function GET(request: NextRequest) {
  const clientId = env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: 'Missing GOOGLE_CLIENT_ID' }, { status: 500 });
  }

  // Sign the state value with the auth secret. The expiry is encoded into
  // the value itself so the callback can verify it without trusting the
  // browser's Max-Age alone.
  const nonce = crypto.randomBytes(16).toString('hex');
  const exp = Math.floor(Date.now() / 1000) + OAUTH_STATE_MAX_AGE;
  const body = `${nonce}.${exp}`;
  const sig = crypto.createHmac('sha256', getAuthSecret()).update(body).digest('base64url');
  const state = `${body}.${sig}`;

  const redirectUri = new URL('/api/auth/google/callback', request.nextUrl.origin).toString();

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', 'openid email profile');
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('access_type', 'offline');
  authUrl.searchParams.set('prompt', 'consent');

  const response = NextResponse.redirect(authUrl.toString());
  response.headers.append(
    'Set-Cookie',
    serializeCookie(OAUTH_STATE_COOKIE_NAME, state, {
      httpOnly: true,
      secure: env.isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: OAUTH_STATE_MAX_AGE,
    }),
  );

  return response;
}
