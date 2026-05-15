import crypto from 'crypto';
import { env } from '@/lib/env';

export const SESSION_COOKIE_NAME = 'pd_session';
export const OAUTH_STATE_COOKIE_NAME = 'pd_oauth_state';
export const USER_LLM_KEY_COOKIE_NAME = 'pd_user_llm_key';

type CookieOptions = {
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'lax' | 'strict' | 'none';
  path?: string;
  maxAge?: number;
};

function base64urlEncode(input: string | Buffer): string {
  return Buffer.from(input).toString('base64url');
}

function base64urlDecode(input: string): string {
  return Buffer.from(input, 'base64url').toString('utf8');
}

/**
 * Create an HMAC-signed token (`base64url(body).base64url(sig)`). The payload
 * is stored as-is — callers that need session semantics should use
 * `createSessionToken` so `iat` and `exp` are populated automatically.
 */
export function createSignedToken(payload: Record<string, unknown>, secret: string): string {
  const body = base64urlEncode(JSON.stringify(payload));
  const signature = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  return `${body}.${signature}`;
}

/**
 * Verify the signature on a token and return the decoded payload, or `null`
 * if the signature is bad or the body isn't valid JSON. **Callers must check
 * `exp` separately if the token represents a session** — prefer
 * `verifySessionToken` which performs that check.
 */
export function verifySignedToken(token: string, secret: string): Record<string, unknown> | null {
  if (!token || typeof token !== 'string') return null;
  const [body, signature] = token.split('.');
  if (!body || !signature) return null;
  const expected = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  try {
    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expected);
    if (sigBuf.length !== expBuf.length) return null;
    if (!crypto.timingSafeEqual(sigBuf, expBuf)) return null;
  } catch {
    return null;
  }
  try {
    return JSON.parse(base64urlDecode(body)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Create a session token with `iat` and `exp` automatically populated.
 */
export function createSessionToken(
  payload: Record<string, unknown>,
  secret: string,
  maxAgeSeconds: number,
): string {
  const now = Math.floor(Date.now() / 1000);
  const enriched = { ...payload, iat: now, exp: now + maxAgeSeconds };
  return createSignedToken(enriched, secret);
}

/**
 * Verify a session token. Returns `null` if signature is bad, `exp` is
 * missing, or `exp` is in the past (i.e. expired).
 */
export function verifySessionToken(
  token: string,
  secret: string,
): Record<string, unknown> | null {
  const payload = verifySignedToken(token, secret);
  if (!payload) return null;
  const exp = typeof payload.exp === 'number' ? payload.exp : 0;
  if (!exp) return null;
  if (exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}

export function parseCookies(cookieHeader: string | null): Record<string, string> {
  if (!cookieHeader) return {};
  return cookieHeader.split(';').reduce<Record<string, string>>((acc, part) => {
    const [key, ...rest] = part.trim().split('=');
    if (!key) return acc;
    acc[key] = decodeURIComponent(rest.join('='));
    return acc;
  }, {});
}

export function serializeCookie(name: string, value: string, options: CookieOptions = {}): string {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  if (options.maxAge !== undefined) parts.push(`Max-Age=${options.maxAge}`);
  if (options.path) parts.push(`Path=${options.path}`);
  if (options.httpOnly) parts.push('HttpOnly');
  if (options.secure) parts.push('Secure');
  if (options.sameSite) parts.push(`SameSite=${options.sameSite}`);
  return parts.join('; ');
}

export function buildSessionCookie(
  payload: Record<string, unknown>,
  secret: string,
  maxAgeSeconds: number,
): string {
  const token = createSessionToken(payload, secret, maxAgeSeconds);
  return serializeCookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: maxAgeSeconds,
  });
}

export function clearCookie(name: string): string {
  return serializeCookie(name, '', {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

// ── Encrypted-value cookies (AES-256-GCM keyed on AUTH_SECRET) ──

function deriveAesKey(secret: string): Buffer {
  // Use a stable subkey rather than the raw secret directly so AUTH_SECRET
  // can rotate independent of any specific use case.
  return crypto.createHash('sha256').update(`pd-cookie::${secret}`).digest();
}

/**
 * Encrypt an arbitrary string with AES-256-GCM keyed on `secret`. Returns a
 * compact `iv.ciphertext.tag` payload (all base64url) suitable for a cookie.
 */
export function encryptSecret(plaintext: string, secret: string): string {
  const key = deriveAesKey(secret);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64url')}.${enc.toString('base64url')}.${tag.toString('base64url')}`;
}

/**
 * Decrypt a token produced by `encryptSecret`. Returns `null` on any
 * malformed/tampered input.
 */
export function decryptSecret(token: string, secret: string): string | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const key = deriveAesKey(secret);
    const iv = Buffer.from(parts[0], 'base64url');
    const data = Buffer.from(parts[1], 'base64url');
    const tag = Buffer.from(parts[2], 'base64url');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    const dec = Buffer.concat([decipher.update(data), decipher.final()]);
    return dec.toString('utf8');
  } catch {
    return null;
  }
}
