import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { users } from '@/db/schema';
import { mediate } from '@/lib/mediator';
import {
  clearCookie,
  parseCookies,
  SESSION_COOKIE_NAME,
  USER_LLM_KEY_COOKIE_NAME,
  decryptSecret,
  verifySessionToken,
} from '@/lib/auth-session';
import { env, getAuthSecret } from '@/lib/env';
import { chatRateLimit } from '@/lib/rate-limit';
import { createLogger } from '@/lib/logger';
import type { UserRole } from '@/lib/types';

const log = createLogger('api/chat');

// Hard cap on inbound message length so a hostile client can't push 1MB of
// text into the LLM.
const MAX_MESSAGE_LENGTH = 4000;

const ChatRequestSchema = z.object({
  message: z
    .string()
    .min(1, 'Message is required.')
    .transform((s) => s.slice(0, MAX_MESSAGE_LENGTH)),
  role: z.enum(['anon', 'authenticated', 'admin', 'technician']).default('anon'),
  userId: z.string().optional(),
  // Accept-but-ignore for backwards-compat with older clients. Key now
  // lives in the encrypted `pd_user_llm_key` cookie.
  apiKey: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const rl = chatRateLimit(request.headers);
    if (!rl.allowed) {
      return NextResponse.json(
        {
          error: 'Too many requests',
          message: 'Please slow down — give it a moment and try again.',
        },
        {
          status: 429,
          headers: { 'Retry-After': String(rl.retryAfterSec) },
        },
      );
    }

    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body.' },
        { status: 400 },
      );
    }

    const parsed = ChatRequestSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          issues: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const { message, role: claimedRole, userId: claimedUserId } = parsed.data;

    // Trust the signed session cookie over anything the client claims.
    // If the user is logged in, override role+userId from the session so a
    // user can't impersonate someone else by sending a different userId/role
    // in the request body.
    const cookies = parseCookies(request.headers.get('cookie'));
    let sessionRole: UserRole | undefined;
    let sessionUserId: string | undefined;
    let sessionValidatedAgainstDb = false;
    let staleSessionDetected = false;
    const sessionToken = cookies[SESSION_COOKIE_NAME];
    if (sessionToken && (env.AUTH_SECRET || !env.isProduction)) {
      try {
        const payload = verifySessionToken(sessionToken, getAuthSecret());
        if (payload) {
          const candidateSub = typeof payload.sub === 'string' ? payload.sub : undefined;
          // Defence in depth: a cookie can be cryptographically valid but
          // contain a stale `sub` that no longer maps to a DB row (e.g. an
          // older OAuth flow stored Google's numeric sub instead of the DB
          // users.id). Verify against the users table before trusting it.
          if (candidateSub) {
            const found = await db
              .select({ id: users.id, role: users.role })
              .from(users)
              .where(eq(users.id, candidateSub))
              .limit(1);
            if (found[0]) {
              sessionUserId = found[0].id;
              sessionRole = found[0].role as UserRole;
              sessionValidatedAgainstDb = true;
            } else {
              staleSessionDetected = true;
              log.warn('session sub does not match any users.id; treating as anon');
            }
          }
        }
      } catch (e) {
        log.warn('failed to verify session token', e);
      }
    }

    const role: UserRole = sessionRole ?? claimedRole;
    const userId = sessionUserId ?? claimedUserId;

    // #region agent log — verify chat sees correct userId/role from session
    fetch('http://127.0.0.1:7582/ingest/dd9ece85-55f8-447a-bccf-22903c8b3d8e', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '3fb259' },
      body: JSON.stringify({
        sessionId: '3fb259',
        hypothesisId: 'H5',
        location: 'api/chat/route.ts:resolved',
        message: 'chat resolved identity',
        data: {
          hasSessionToken: !!sessionToken,
          sessionValidatedAgainstDb,
          staleSessionDetected,
          hasSessionRole: !!sessionRole,
          hasSessionUserId: !!sessionUserId,
          userIdPrefix: typeof userId === 'string' ? userId.slice(0, 5) : null,
          userIdIsNumeric: typeof userId === 'string' ? /^\d+$/.test(userId) : false,
          role,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion

    // Pull the user-supplied Gemini key from the encrypted cookie if present.
    // We deliberately ignore any `apiKey` value in the request body to avoid
    // logging or echoing it.
    let userKey: string | undefined;
    try {
      const enc = cookies[USER_LLM_KEY_COOKIE_NAME];
      if (enc) {
        const dec = decryptSecret(enc, getAuthSecret());
        if (dec) userKey = dec;
      }
    } catch (e) {
      log.warn('failed to decrypt user llm key cookie', e);
    }

    const mediated = await mediate(message, role, userId, userKey);
    const response = NextResponse.json(mediated);
    if (staleSessionDetected) {
      // Force the browser to drop the bad cookie so the user gets a fresh
      // login on their next visit instead of looping on the same stale sub.
      response.headers.append('Set-Cookie', clearCookie(SESSION_COOKIE_NAME));
    }
    return response;
  } catch (error) {
    log.error('chat API error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message:
          'Something went wrong processing your request. Please try again.',
      },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'Pipe Dream Plumbing — Virtual Employee API',
    version: '1.0.0',
    endpoints: {
      chat: 'POST /api/chat — Send a chat message',
    },
  });
}
