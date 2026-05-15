/**
 * In-memory token-bucket rate limiter.
 *
 * NOTE: This is single-instance only — buckets live in process memory and
 * vanish on restart. On Vercel's serverless runtime each invocation may hit
 * a different lambda instance, so the limit is effectively per-instance.
 *
 * TODO: For real multi-instance deployments replace this with Upstash
 *       (`@upstash/ratelimit` + `@upstash/redis`) — it works on Edge/Node and
 *       gives you cross-instance, persistent counters. Drop-in replacement:
 *       wrap a `Ratelimit.slidingWindow(20, '60 s')` instance and return the
 *       same `{ allowed, remaining, retryAfterSec }` shape.
 */

export interface RateLimitOptions {
  /** Bucket capacity (max burst). */
  capacity: number;
  /** Tokens added per second. `capacity / windowSec` works well. */
  refillPerSec: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  /** Seconds until the next token becomes available (0 when `allowed`). */
  retryAfterSec: number;
}

interface Bucket {
  tokens: number;
  updatedAt: number;
}

const buckets = new Map<string, Bucket>();

/**
 * Attempt to consume a single token from the bucket identified by `key`.
 */
export function rateLimit(key: string, options: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key) ?? { tokens: options.capacity, updatedAt: now };

  const elapsedSec = (now - bucket.updatedAt) / 1000;
  const refill = elapsedSec * options.refillPerSec;
  const tokens = Math.min(options.capacity, bucket.tokens + refill);

  if (tokens >= 1) {
    const after: Bucket = { tokens: tokens - 1, updatedAt: now };
    buckets.set(key, after);
    return { allowed: true, remaining: Math.floor(after.tokens), retryAfterSec: 0 };
  }

  const after: Bucket = { tokens, updatedAt: now };
  buckets.set(key, after);
  const retryAfterSec = Math.ceil((1 - tokens) / options.refillPerSec);
  return { allowed: false, remaining: 0, retryAfterSec };
}

/**
 * Convenience: 20 requests per 60 seconds. Returns the IP or 'anon' as the
 * bucket key extracted from `x-forwarded-for`.
 */
export function chatRateLimit(headers: Headers): RateLimitResult {
  const fwd = headers.get('x-forwarded-for') || '';
  const ip = fwd.split(',')[0]?.trim() || 'anon';
  return rateLimit(`chat:${ip}`, { capacity: 20, refillPerSec: 20 / 60 });
}

/** For tests only — wipe all buckets. */
export function _resetRateLimitForTests(): void {
  buckets.clear();
}
