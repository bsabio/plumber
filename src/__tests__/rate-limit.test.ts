import { describe, it, expect, beforeEach } from 'vitest';
import { rateLimit, _resetRateLimitForTests } from '@/lib/rate-limit';

describe('rateLimit', () => {
  beforeEach(() => {
    _resetRateLimitForTests();
  });

  it('allows up to capacity then blocks', () => {
    const opts = { capacity: 3, refillPerSec: 0 };
    expect(rateLimit('a', opts).allowed).toBe(true);
    expect(rateLimit('a', opts).allowed).toBe(true);
    expect(rateLimit('a', opts).allowed).toBe(true);
    expect(rateLimit('a', opts).allowed).toBe(false);
  });

  it('returns retryAfter > 0 when blocked', () => {
    const opts = { capacity: 1, refillPerSec: 1 };
    expect(rateLimit('b', opts).allowed).toBe(true);
    const blocked = rateLimit('b', opts);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
  });

  it('separates buckets by key', () => {
    const opts = { capacity: 1, refillPerSec: 0 };
    expect(rateLimit('x', opts).allowed).toBe(true);
    expect(rateLimit('y', opts).allowed).toBe(true);
  });
});
