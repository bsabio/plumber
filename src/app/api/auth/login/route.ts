import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { buildSessionCookie } from '@/lib/auth-session';

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json() as { email: string; password: string };

    if (!email?.trim() || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
    }

    // Look up user
    const user = await db.select().from(users).where(eq(users.email, email.toLowerCase())).get();
    if (!user) {
      return NextResponse.json({ error: 'No account found with this email.' }, { status: 401 });
    }

    // Check password
    const storedHash = user.passwordHash;
    if (!storedHash) {
      // This user signed up via Google — no password set
      return NextResponse.json({
        error: 'This account uses Google sign-in. Please use "Continue with Google".',
      }, { status: 401 });
    }

    if (storedHash !== hashPassword(password)) {
      return NextResponse.json({ error: 'Incorrect password.' }, { status: 401 });
    }

    // Issue session
    const authSecret = process.env.AUTH_SECRET || 'dev-secret';
    const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7;
    const sessionCookie = buildSessionCookie(
      { sub: user.id, name: user.name, email: user.email, role: user.role, exp },
      authSecret,
      60 * 60 * 24 * 7,
    );

    const response = NextResponse.json({ success: true, name: user.name });
    response.headers.append('Set-Cookie', sessionCookie);
    return response;
  } catch (err) {
    console.error('[login]', err);
    return NextResponse.json({ error: 'Sign-in failed. Please try again.' }, { status: 500 });
  }
}
