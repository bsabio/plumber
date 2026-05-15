import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { mediate } from '@/lib/mediator';
import {
  parseCookies,
  USER_LLM_KEY_COOKIE_NAME,
  decryptSecret,
} from '@/lib/auth-session';
import { getAuthSecret } from '@/lib/env';
import { chatRateLimit } from '@/lib/rate-limit';
import { createLogger } from '@/lib/logger';

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

    const { message, role, userId } = parsed.data;

    // Pull the user-supplied Gemini key from the encrypted cookie if present.
    // We deliberately ignore any `apiKey` value in the request body to avoid
    // logging or echoing it.
    let userKey: string | undefined;
    try {
      const cookies = parseCookies(request.headers.get('cookie'));
      const enc = cookies[USER_LLM_KEY_COOKIE_NAME];
      if (enc) {
        const dec = decryptSecret(enc, getAuthSecret());
        if (dec) userKey = dec;
      }
    } catch (e) {
      log.warn('failed to decrypt user llm key cookie', e);
    }

    const response = await mediate(message, role, userId, userKey);
    return NextResponse.json(response);
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
