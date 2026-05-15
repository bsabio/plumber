import { describe, it, expect, vi } from 'vitest';

// The mediator pulls in `@/db` even when the helpers we exercise here are
// pure. Stub it with a promise-returning shape so any accidental await
// resolves cleanly.
function thenableEmpty() {
  return Promise.resolve([]);
}

vi.mock('@/db', () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: () => thenableEmpty(),
          orderBy: () => thenableEmpty(),
          then: (resolve: (rows: unknown[]) => unknown) => Promise.resolve([]).then(resolve),
        }),
        orderBy: () => thenableEmpty(),
        limit: () => thenableEmpty(),
      }),
    }),
  },
}));
vi.mock('@/db/schema', () => ({
  users: {},
  tickets: {},
  appointments: {},
  newsletterContent: {},
}));

import {
  extractTicketParams,
  extractAppointmentParams,
  extractDateFromMessage,
} from '@/lib/mediator';

describe('extractTicketParams', () => {
  it('infers urgent priority for "flooding"', () => {
    const r = extractTicketParams('My basement is flooding right now!');
    expect(r.priority).toBe('urgent');
    expect(r.description).toContain('flooding');
  });

  it('infers high priority for "serious"', () => {
    const r = extractTicketParams('I have a serious problem with my water heater');
    expect(r.priority).toBe('high');
  });

  it('infers low priority for "minor"', () => {
    const r = extractTicketParams('Minor drip from the laundry sink');
    expect(r.priority).toBe('low');
  });

  it('falls back to medium priority for plain messages', () => {
    const r = extractTicketParams('My faucet is making a noise');
    expect(r.priority).toBe('medium');
  });

  it('truncates long subjects', () => {
    const long = 'a'.repeat(120);
    const r = extractTicketParams(long);
    expect(r.subject.length).toBeLessThanOrEqual(63); // 60 + '...'
    expect(r.subject.endsWith('...')).toBe(true);
  });
});

describe('extractAppointmentParams', () => {
  it('parses ISO date', () => {
    const r = extractAppointmentParams('Please come on 2027-04-12 at 2pm');
    expect(r.date).toBe('2027-04-12');
    expect(r.time).toBe('14:00');
  });

  it('parses 12-hour AM time', () => {
    const r = extractAppointmentParams('book me at 9 am please for an inspection');
    expect(r.time).toBe('09:00');
    expect(r.serviceType).toBe('inspection');
  });

  it('detects installation service type', () => {
    const r = extractAppointmentParams('I need a new water heater installed');
    expect(r.serviceType).toBe('installation');
  });

  it('detects emergency service type', () => {
    const r = extractAppointmentParams('urgent emergency leak situation');
    expect(r.serviceType).toBe('emergency');
  });

  it('defaults to repair service type when nothing matches', () => {
    const r = extractAppointmentParams('please come by');
    expect(r.serviceType).toBe('repair');
  });
});

describe('extractDateFromMessage', () => {
  it('returns explicit ISO date verbatim', () => {
    expect(extractDateFromMessage('We need someone on 2028-12-01')).toBe('2028-12-01');
  });

  it('parses tomorrow', () => {
    const d = extractDateFromMessage('come by tomorrow please');
    const expected = new Date();
    expected.setDate(expected.getDate() + 1);
    expect(d).toBe(expected.toISOString().split('T')[0]);
  });

  it('parses today', () => {
    const d = extractDateFromMessage('I need help today');
    expect(d).toBe(new Date().toISOString().split('T')[0]);
  });

  it('returns a future date for next-monday-style input', () => {
    const d = extractDateFromMessage('please come Monday');
    expect(d).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const parsed = new Date(d + 'T00:00:00');
    expect(parsed.getDay()).toBe(1); // Monday
  });
});
