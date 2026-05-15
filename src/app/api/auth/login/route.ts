import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { z } from 'zod';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { buildSessionCookie } from '@/lib/auth-session';
import { getAuthSecret } from '@/lib/env';
import { createLogger } from '@/lib/logger';

const log = createLogger('auth/login');

const LoginSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address.'),
  password: z.string().min(1, 'Password is required.'),
});

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
    }

    const parsed = LoginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          issues: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const { email, password } = parsed.data;

    const userRows = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
    const user = userRows[0];
    if (!user) {
      return NextResponse.json({ error: 'No account found with this email.' }, { status: 401 });
    }

    const storedHash = user.passwordHash;
    if (!storedHash) {
      return NextResponse.json(
        {
          error: 'This account uses Google sign-in. Please use "Continue with Google".',
        },
        { status: 401 },
      );
    }

    if (storedHash !== hashPassword(password)) {
      return NextResponse.json({ error: 'Incorrect password.' }, { status: 401 });
    }

    const sessionCookie = buildSessionCookie(
      { sub: user.id, name: user.name, email: user.email, role: user.role },
      getAuthSecret(),
      SESSION_MAX_AGE,
    );

    const response = NextResponse.json({ success: true, name: user.name });
    response.headers.append('Set-Cookie', sessionCookie);
    return response;
  } catch (err) {
    log.error(err);
    return NextResponse.json({ error: 'Sign-in failed. Please try again.' }, { status: 500 });
  }
}
