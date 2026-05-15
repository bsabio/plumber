import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  clearCookie,
  encryptSecret,
  parseCookies,
  serializeCookie,
  USER_LLM_KEY_COOKIE_NAME,
} from '@/lib/auth-session';
import { env, getAuthSecret } from '@/lib/env';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/settings/llm-key');

// Allow up to ~30 days for the encrypted key cookie.
const KEY_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

const PostBodySchema = z.object({
  apiKey: z.string().trim().min(8, 'API key looks too short.').max(512),
});

function setKeyCookie(value: string): string {
  return serializeCookie(USER_LLM_KEY_COOKIE_NAME, value, {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: KEY_COOKIE_MAX_AGE,
  });
}

export async function GET(request: NextRequest) {
  const cookies = parseCookies(request.headers.get('cookie'));
  const configured = !!cookies[USER_LLM_KEY_COOKIE_NAME];
  return NextResponse.json({ configured });
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const parsed = PostBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Invalid request',
        issues: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  try {
    const encrypted = encryptSecret(parsed.data.apiKey, getAuthSecret());
    const response = NextResponse.json({ configured: true });
    response.headers.append('Set-Cookie', setKeyCookie(encrypted));
    return response;
  } catch (e) {
    log.error('failed to encrypt user LLM key', e);
    return NextResponse.json(
      { error: 'Failed to store API key.' },
      { status: 500 },
    );
  }
}

export async function DELETE() {
  const response = NextResponse.json({ configured: false });
  response.headers.append(
    'Set-Cookie',
    clearCookie(USER_LLM_KEY_COOKIE_NAME),
  );
  return response;
}
