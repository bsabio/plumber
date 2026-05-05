import { NextResponse } from 'next/server';
import { clearCookie, SESSION_COOKIE_NAME } from '@/lib/auth-session';

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.headers.append('Set-Cookie', clearCookie(SESSION_COOKIE_NAME));
  return response;
}
