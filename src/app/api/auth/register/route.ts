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
    const { name, email, password } = await request.json() as {
      name: string; email: string; password: string;
    };

    if (!name?.trim() || !email?.trim() || !password) {
      return NextResponse.json({ error: 'Name, email, and password are required.' }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters.' }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
    }

    // Check if email already registered
    const existing = await db.select().from(users).where(eq(users.email, email.toLowerCase())).get();
    if (existing) {
      return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 });
    }

    // Create the user
    const id = `user_${crypto.randomBytes(8).toString('hex')}`;
    const passwordHash = hashPassword(password);
    await db.insert(users).values({
      id,
      name: name.trim(),
      email: email.toLowerCase(),
      role: 'authenticated',
      passwordHash,
      createdAt: new Date().toISOString(),
    });

    // Auto sign-in after registration
    const authSecret = process.env.AUTH_SECRET || 'dev-secret';
    const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7; // 7 days
    const sessionCookie = buildSessionCookie(
      { sub: id, name: name.trim(), email: email.toLowerCase(), role: 'authenticated', exp },
      authSecret,
      60 * 60 * 24 * 7,
    );

    const response = NextResponse.json({ success: true, name: name.trim() });
    response.headers.append('Set-Cookie', sessionCookie);
    return response;
  } catch (err) {
    console.error('[register]', err);
    return NextResponse.json({ error: 'Registration failed. Please try again.' }, { status: 500 });
  }
}
