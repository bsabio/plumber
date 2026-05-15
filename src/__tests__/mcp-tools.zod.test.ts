import { describe, it, expect, vi } from 'vitest';

// We only want to test the Zod schemas — not the DB-backed handlers.
// The simplest path is to validate the input schemas directly.

vi.mock('@/db', () => ({
  db: {},
}));

vi.mock('@/db/schema', () => ({
  users: {},
  tickets: {},
  appointments: {},
  newsletterContent: {},
}));

import {
  GetNewsletterAdviceInputSchema,
  CreateServiceTicketInputSchema,
  CheckPlumberAvailabilityInputSchema,
  GenerateBusinessMetricsInputSchema,
  SummarizeTicketProblemsInputSchema,
  SuggestTicketResponseInputSchema,
  UpdateTicketStatusInputSchema,
  AssignTechnicianInputSchema,
} from '@/mcp-server/mcp-tools';

describe('GetNewsletterAdviceInputSchema', () => {
  it('accepts empty input and defaults limit', () => {
    const r = GetNewsletterAdviceInputSchema.safeParse({});
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.limit).toBe(5);
  });

  it('rejects invalid category', () => {
    const r = GetNewsletterAdviceInputSchema.safeParse({ category: 'nonsense' });
    expect(r.success).toBe(false);
  });

  it('rejects oversize topic', () => {
    const r = GetNewsletterAdviceInputSchema.safeParse({ topic: 'a'.repeat(201) });
    expect(r.success).toBe(false);
  });
});

describe('CreateServiceTicketInputSchema', () => {
  const valid = {
    problemDescription: 'There is a major leak under my kitchen sink.',
    urgencyLevel: 'high' as const,
    contactName: 'Jane Doe',
    contactEmail: 'jane@example.com',
  };

  it('accepts valid input', () => {
    expect(CreateServiceTicketInputSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects short description', () => {
    expect(
      CreateServiceTicketInputSchema.safeParse({ ...valid, problemDescription: 'short' }).success,
    ).toBe(false);
  });

  it('rejects bad email', () => {
    expect(
      CreateServiceTicketInputSchema.safeParse({ ...valid, contactEmail: 'not-an-email' })
        .success,
    ).toBe(false);
  });

  it('rejects bad urgency', () => {
    expect(
      CreateServiceTicketInputSchema.safeParse({ ...valid, urgencyLevel: 'banana' }).success,
    ).toBe(false);
  });
});

describe('CheckPlumberAvailabilityInputSchema', () => {
  it('accepts a future ISO date', () => {
    const future = new Date();
    future.setFullYear(future.getFullYear() + 1);
    const iso = future.toISOString().split('T')[0];
    expect(CheckPlumberAvailabilityInputSchema.safeParse({ date: iso }).success).toBe(true);
  });

  it('rejects bad format', () => {
    expect(CheckPlumberAvailabilityInputSchema.safeParse({ date: '20/01/2025' }).success).toBe(false);
  });

  it('rejects past date', () => {
    expect(CheckPlumberAvailabilityInputSchema.safeParse({ date: '2000-01-01' }).success).toBe(false);
  });
});

describe('Other schemas', () => {
  it('GenerateBusinessMetricsInputSchema rejects reversed range', () => {
    const r = GenerateBusinessMetricsInputSchema.safeParse({
      dateFrom: '2026-12-01',
      dateTo: '2026-01-01',
    });
    expect(r.success).toBe(false);
  });

  it('SummarizeTicketProblemsInputSchema defaults to "open"', () => {
    const r = SummarizeTicketProblemsInputSchema.safeParse({});
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.statusFilter).toBe('open');
  });

  it('SuggestTicketResponseInputSchema requires subject', () => {
    expect(SuggestTicketResponseInputSchema.safeParse({}).success).toBe(false);
    expect(
      SuggestTicketResponseInputSchema.safeParse({ ticketSubject: 'leaking sink' }).success,
    ).toBe(true);
  });

  it('UpdateTicketStatusInputSchema requires a UUID and a valid status', () => {
    const r = UpdateTicketStatusInputSchema.safeParse({
      ticketId: 'not-a-uuid',
      newStatus: 'open',
    });
    expect(r.success).toBe(false);

    const r2 = UpdateTicketStatusInputSchema.safeParse({
      ticketId: '12345678-aaaa-bbbb-cccc-1234567890ab',
      newStatus: 'open',
    });
    expect(r2.success).toBe(true);
  });

  it('AssignTechnicianInputSchema validates both UUIDs', () => {
    const r = AssignTechnicianInputSchema.safeParse({
      ticketId: '12345678-aaaa-bbbb-cccc-1234567890ab',
      technicianId: '12345678-aaaa-bbbb-cccc-1234567890cd',
    });
    expect(r.success).toBe(true);
  });
});
