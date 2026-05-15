import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { z } from 'zod';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { buildSessionCookie } from '@/lib/auth-session';
import { getAuthSecret } from '@/lib/env';
import { createLogger } from '@/lib/logger';

const log = createLogger('auth/register');

const RegisterSchema = z.object({
  name: z.string().trim().min(1, 'Name is required.'),
  email: z.string().trim().email('Please enter a valid email address.'),
  password: z.string().min(6, 'Password must be at least 6 characters.'),
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

    const parsed = RegisterSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          issues: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const { name, email, password } = parsed.data;

    const existingRows = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);
    const existing = existingRows[0];
    if (existing) {
      return NextResponse.json(
        { error: 'An account with this email already exists.' },
        { status: 409 },
      );
    }

    const id = `user_${crypto.randomBytes(8).toString('hex')}`;
    const passwordHash = hashPassword(password);
    await db.insert(users).values({
      id,
      name,
      email: email.toLowerCase(),
      role: 'authenticated',
      passwordHash,
      createdAt: new Date().toISOString(),
    });

    const sessionCookie = buildSessionCookie(
      { sub: id, name, email: email.toLowerCase(), role: 'authenticated' },
      getAuthSecret(),
      SESSION_MAX_AGE,
    );

    const response = NextResponse.json({ success: true, name });
    response.headers.append('Set-Cookie', sessionCookie);
    return response;
  } catch (err) {
    log.error(err);
    return NextResponse.json({ error: 'Registration failed. Please try again.' }, { status: 500 });
  }
}
