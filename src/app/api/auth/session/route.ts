import { NextRequest, NextResponse } from 'next/server';
import { parseCookies, SESSION_COOKIE_NAME, verifySignedToken } from '@/lib/auth-session';

export async function GET(request: NextRequest) {
  const authSecret = process.env.AUTH_SECRET;
  if (!authSecret) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  const cookies = parseCookies(request.headers.get('cookie'));
  const token = cookies[SESSION_COOKIE_NAME];
  if (!token) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  const payload = verifySignedToken(token, authSecret);
  if (!payload) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  const exp = typeof payload.exp === 'number' ? payload.exp : 0;
  if (exp && exp < Math.floor(Date.now() / 1000)) {
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
