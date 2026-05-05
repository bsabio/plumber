import crypto from 'crypto';

export const SESSION_COOKIE_NAME = 'pd_session';
export const OAUTH_STATE_COOKIE_NAME = 'pd_oauth_state';

type CookieOptions = {
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'lax' | 'strict' | 'none';
  path?: string;
  maxAge?: number;
};

function base64urlEncode(input: string | Buffer) {
  return Buffer.from(input).toString('base64url');
}

function base64urlDecode(input: string) {
  return Buffer.from(input, 'base64url').toString('utf8');
}

export function createSignedToken(payload: Record<string, unknown>, secret: string) {
  const body = base64urlEncode(JSON.stringify(payload));
  const signature = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('base64url');
  return `${body}.${signature}`;
}

export function verifySignedToken(token: string, secret: string) {
  const [body, signature] = token.split('.');
  if (!body || !signature) return null;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('base64url');
  try {
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
      return null;
    }
  } catch {
    return null;
  }
  try {
    return JSON.parse(base64urlDecode(body)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function parseCookies(cookieHeader: string | null) {
  if (!cookieHeader) return {} as Record<string, string>;
  return cookieHeader.split(';').reduce<Record<string, string>>((acc, part) => {
    const [key, ...rest] = part.trim().split('=');
    if (!key) return acc;
    acc[key] = decodeURIComponent(rest.join('='));
    return acc;
  }, {});
}

export function serializeCookie(name: string, value: string, options: CookieOptions = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  if (options.maxAge !== undefined) parts.push(`Max-Age=${options.maxAge}`);
  if (options.path) parts.push(`Path=${options.path}`);
  if (options.httpOnly) parts.push('HttpOnly');
  if (options.secure) parts.push('Secure');
  if (options.sameSite) parts.push(`SameSite=${options.sameSite}`);
  return parts.join('; ');
}

export function buildSessionCookie(payload: Record<string, unknown>, secret: string, maxAgeSeconds: number) {
  const token = createSignedToken(payload, secret);
  return serializeCookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: maxAgeSeconds,
  });
}

export function clearCookie(name: string) {
  return serializeCookie(name, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}
