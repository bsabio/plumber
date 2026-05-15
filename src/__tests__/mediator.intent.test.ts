import { describe, it, expect, vi, beforeEach } from 'vitest';

// The mediator imports `@/db` which talks to Neon Postgres. We mock it so
// the test file is hermetic — the intent classifier doesn't actually touch
// the DB, but importing the module triggers the Neon driver setup.
//
// The Neon HTTP driver is fully async, so every leaf builder is thenable
// and resolves to an empty array.
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

import { classifyIntent } from '@/lib/mediator';

describe('classifyIntent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const cases: { name: string; input: string; expected: string }[] = [
    // High-priority MCP intents
    {
      name: 'business metrics keyword',
      input: 'Show me the business metrics for last month',
      expected: 'generate_business_metrics',
    },
    {
      name: 'summarize problems',
      input: 'Can you summarize tickets for me?',
      expected: 'summarize_ticket_problems',
    },
    {
      name: 'suggest response',
      input: 'Suggest a response for ticket about a leak',
      expected: 'suggest_ticket_response',
    },
    {
      name: 'availability question',
      input: 'Check availability for next Tuesday please',
      expected: 'check_plumber_availability',
    },

    // Update ticket status — UUID + status word heuristic
    {
      name: 'UUID + resolve word',
      input: 'Please mark ticket 12345678-aaaa-bbbb-cccc-1234567890ab as resolved',
      expected: 'update_ticket_status',
    },
    {
      name: 'UUID + close word',
      input: 'close ticket 12345678-aaaa-bbbb-cccc-1234567890ab',
      expected: 'update_ticket_status',
    },

    // Legacy
    {
      name: 'create ticket from issue description',
      input: 'I have a leaking faucet in the kitchen',
      expected: 'create_ticket',
    },
    {
      name: 'list my tickets',
      input: 'show me my tickets please',
      expected: 'query_tickets',
    },

    // Greetings
    { name: 'greeting hello', input: 'hello!', expected: 'general_help' },
    { name: 'greeting thanks', input: 'thank you', expected: 'general_help' },

    // Plumbing question → newsletter advice
    {
      name: 'plumbing how-to question',
      input: 'how do I unclog a drain?',
      expected: 'get_newsletter_advice',
    },

    // Regression for the Monday-leak bug — must NOT be schedule_appointment.
    {
      name: 'past-tense "I had a leak Monday" should NOT be scheduling',
      input: 'I had a leak Monday',
      expected: 'general_help',
    },
    {
      name: 'leaking faucet on monday — issue, not schedule',
      input: 'I noticed a leaking faucet on Monday',
      expected: 'create_ticket',
    },
    {
      name: 'plain "Monday" without scheduling verb should not schedule',
      input: 'something weird happened Monday',
      expected: 'general_help',
    },

    // Explicit scheduling intent
    {
      name: 'explicit schedule with day',
      input: 'I want to schedule a visit for Monday',
      expected: 'schedule_appointment',
    },
    {
      name: 'book for tomorrow',
      input: 'book a visit tomorrow morning',
      expected: 'schedule_appointment',
    },
  ];

  for (const c of cases) {
    it(c.name, () => {
      expect(classifyIntent(c.input)).toBe(c.expected);
    });
  }
});
