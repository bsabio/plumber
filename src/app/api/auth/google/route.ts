import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { OAUTH_STATE_COOKIE_NAME, serializeCookie } from '@/lib/auth-session';

export async function GET(request: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: 'Missing GOOGLE_CLIENT_ID' }, { status: 500 });
  }

  const state = crypto.randomBytes(16).toString('hex');
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
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 600,
    })
  );

  return response;
}
