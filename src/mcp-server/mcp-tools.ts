/**
 * ═══════════════════════════════════════════════════════════════
 *  Antigravity MCP Tools — Pipe Dream Plumbing Virtual Employee
 * ═══════════════════════════════════════════════════════════════
 *
 *  Strictly-typed MCP tool definitions with Zod input validation.
 *  Each tool declares its schema, role restrictions, and handler.
 */

import { z } from 'zod';
import { db } from '@/db';
import { tickets, appointments, newsletterContent } from '@/db/schema';
import { eq, desc, and, ne, gte, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import type { ToolResult } from '@/lib/types';

// ═══════════════════════════════════════════════════════════════
//  1. get_newsletter_advice
// ═══════════════════════════════════════════════════════════════

/**
 * Input schema — strict Zod validation for get_newsletter_advice.
 *
 * @field topic     - Optional keyword to filter articles (e.g. "frozen pipes")
 * @field category  - Optional enum restricting to a specific content category
 * @field limit     - Maximum number of articles to return (1–20, default 5)
 */
export const GetNewsletterAdviceInputSchema = z.object({
  topic: z
    .string()
    .trim()
    .max(200, 'Topic must be 200 characters or fewer')
    .optional()
    .describe('Optional keyword to filter newsletter articles by topic'),
  category: z
    .enum(['tip', 'promotion', 'update', 'faq', 'seasonal'])
    .optional()
    .describe('Filter by newsletter category'),
  limit: z
    .number()
    .int('Limit must be an integer')
    .min(1, 'Limit must be at least 1')
    .max(20, 'Limit must be 20 or fewer')
    .default(5)
    .describe('Maximum number of articles to return'),
});

export type GetNewsletterAdviceInput = z.infer<typeof GetNewsletterAdviceInputSchema>;

/**
 * get_newsletter_advice
 * Queries the SQLite newsletter_content table for plumbing tips/articles
 * to provide expert context in chat.
 *
 * Roles: anon, authenticated, admin
 */
export async function getNewsletterAdvice(
  rawInput: unknown
): Promise<ToolResult> {
  // ── Validate input ──
  const parsed = GetNewsletterAdviceInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      toolName: 'get_newsletter_advice',
      success: false,
      data: { validationErrors: parsed.error.flatten().fieldErrors },
      message: `❌ Invalid input: ${parsed.error.issues.map((i) => i.message).join('; ')}`,
    };
  }

  const { topic, category, limit } = parsed.data;

  try {
    // Build query dynamically
    let query = db
      .select()
      .from(newsletterContent)
      .where(eq(newsletterContent.isActive, true))
      .orderBy(desc(newsletterContent.publishedAt))
      .limit(limit);

    // Apply category filter
    if (category) {
      query = db
        .select()
        .from(newsletterContent)
        .where(
          and(
            eq(newsletterContent.isActive, true),
            eq(newsletterContent.category, category)
          )
        )
        .orderBy(desc(newsletterContent.publishedAt))
        .limit(limit);
    }

    let results = query.all();

    // Apply topic keyword filter in-memory (SQLite LIKE via JS)
    if (topic) {
      const lowerTopic = topic.toLowerCase();
      results = results.filter(
        (article) =>
          article.title.toLowerCase().includes(lowerTopic) ||
          article.body.toLowerCase().includes(lowerTopic)
      );
    }

    // Format as expert advice context
    const adviceContext = results.map((article) => ({
      id: article.id,
      title: article.title,
      category: article.category,
      body: article.body,
      publishedAt: article.publishedAt,
    }));

    return {
      toolName: 'get_newsletter_advice',
      success: true,
      data: adviceContext as unknown as Record<string, unknown>[],
      message:
        results.length > 0
          ? `📰 Found ${results.length} expert article(s)${topic ? ` related to "${topic}"` : ''}${category ? ` in category "${category}"` : ''}.`
          : `📰 No articles found${topic ? ` for topic "${topic}"` : ''}. Try a broader search.`,
    };
  } catch (error) {
    return {
      toolName: 'get_newsletter_advice',
      success: false,
      data: {},
      message: `Error querying newsletter: ${(error as Error).message}`,
    };
  }
}

// ═══════════════════════════════════════════════════════════════
//  2. create_service_ticket
// ═══════════════════════════════════════════════════════════════

/**
 * Input schema — strict Zod validation for create_service_ticket.
 *
 * @field problemDescription - Detailed description of the plumbing issue
 * @field urgencyLevel       - Enum: low | medium | high | urgent
 * @field contactName        - Customer's full name
 * @field contactEmail       - Customer's email (validated format)
 * @field contactPhone       - Customer's phone number (optional)
 * @field address            - Service address (optional)
 */
export const CreateServiceTicketInputSchema = z.object({
  problemDescription: z
    .string()
    .trim()
    .min(10, 'Problem description must be at least 10 characters')
    .max(2000, 'Problem description must be 2000 characters or fewer')
    .describe('Detailed description of the plumbing issue'),
  urgencyLevel: z
    .enum(['low', 'medium', 'high', 'urgent'], {
      error: 'Urgency level must be one of: low, medium, high, urgent',
    })
    .describe('How urgent the issue is'),
  contactName: z
    .string()
    .trim()
    .min(2, 'Contact name must be at least 2 characters')
    .max(100, 'Contact name must be 100 characters or fewer')
    .describe('Full name of the customer'),
  contactEmail: z
    .string()
    .trim()
    .email('Must be a valid email address')
    .describe('Customer email for follow-up'),
  contactPhone: z
    .string()
    .trim()
    .regex(
      /^[\d\s\-\(\)\+]{7,20}$/,
      'Phone number must be 7–20 characters containing digits, spaces, hyphens, or parentheses'
    )
    .optional()
    .describe('Optional customer phone number'),
  address: z
    .string()
    .trim()
    .min(5, 'Address must be at least 5 characters')
    .max(300, 'Address must be 300 characters or fewer')
    .optional()
    .describe('Service address where the issue is located'),
});

export type CreateServiceTicketInput = z.infer<typeof CreateServiceTicketInputSchema>;

/**
 * create_service_ticket
 * Takes a user's problem description, urgency level, and contact info
 * to create a row in the tickets table.
 *
 * Roles: authenticated, admin
 */
export async function createServiceTicket(
  rawInput: unknown,
  userId: string
): Promise<ToolResult> {
  // ── Validate input ──
  const parsed = CreateServiceTicketInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      toolName: 'create_service_ticket',
      success: false,
      data: { validationErrors: parsed.error.flatten().fieldErrors },
      message: `❌ Invalid input: ${parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`,
    };
  }

  const { problemDescription, urgencyLevel, contactName, contactEmail, contactPhone, address } =
    parsed.data;

  try {
    const now = new Date().toISOString();

    // Derive a concise subject from the description
    const subject =
      problemDescription.length > 80
        ? problemDescription.slice(0, 77) + '...'
        : problemDescription;

    const newTicket = {
      id: uuidv4(),
      userId,
      subject,
      description: [
        problemDescription,
        '',
        `── Contact Info ──`,
        `Name:  ${contactName}`,
        `Email: ${contactEmail}`,
        contactPhone ? `Phone: ${contactPhone}` : null,
        address ? `Service Address: ${address}` : null,
      ]
        .filter(Boolean)
        .join('\n'),
      priority: urgencyLevel,
      status: 'open' as const,
      createdAt: now,
      updatedAt: now,
    };

    db.insert(tickets).values(newTicket).run();

    return {
      toolName: 'create_service_ticket',
      success: true,
      data: {
        ticketId: newTicket.id,
        subject: newTicket.subject,
        urgencyLevel,
        status: 'open',
        contactName,
        contactEmail,
        ...(contactPhone && { contactPhone }),
        ...(address && { address }),
        createdAt: now,
      },
      message: `✅ Service ticket created successfully!\n\n🎫 **Ticket ID:** ${newTicket.id.slice(0, 8)}...\n📋 **Subject:** ${subject}\n🔴 **Urgency:** ${urgencyLevel}\n📧 **Contact:** ${contactName} (${contactEmail})\n\nOur team will review your issue and reach out shortly.`,
    };
  } catch (error) {
    return {
      toolName: 'create_service_ticket',
      success: false,
      data: {},
      message: `Error creating service ticket: ${(error as Error).message}`,
    };
  }
}

// ═══════════════════════════════════════════════════════════════
//  3. check_plumber_availability
// ═══════════════════════════════════════════════════════════════

/**
 * Input schema — strict Zod validation for check_plumber_availability.
 *
 * @field date        - The date to check (YYYY-MM-DD format)
 * @field serviceType - Optional filter by service type
 */
export const CheckPlumberAvailabilityInputSchema = z.object({
  date: z
    .string()
    .trim()
    .regex(
      /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/,
      'Date must be in YYYY-MM-DD format (e.g. 2026-03-20)'
    )
    .refine(
      (d) => {
        const parsed = new Date(d);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return parsed >= today;
      },
      { message: 'Date must be today or in the future' }
    )
    .describe('The date to check availability for (YYYY-MM-DD)'),
  serviceType: z
    .enum(['repair', 'installation', 'inspection', 'emergency', 'maintenance'], {
      error: 'Service type must be one of: repair, installation, inspection, emergency, maintenance',
    })
    .optional()
    .describe('Optional filter by type of plumbing service'),
});

export type CheckPlumberAvailabilityInput = z.infer<typeof CheckPlumberAvailabilityInputSchema>;

// Business hours slots (9 AM – 5 PM in 1-hour increments)
const BUSINESS_SLOTS = [
  '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00',
];

/**
 * check_plumber_availability
 * Checks the appointments table against standard time slots for a given
 * date and returns which slots are open vs booked.
 *
 * Roles: authenticated, admin
 */
export async function checkPlumberAvailability(
  rawInput: unknown
): Promise<ToolResult> {
  // ── Validate input ──
  const parsed = CheckPlumberAvailabilityInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      toolName: 'check_plumber_availability',
      success: false,
      data: { validationErrors: parsed.error.flatten().fieldErrors },
      message: `❌ Invalid input: ${parsed.error.issues.map((i) => i.message).join('; ')}`,
    };
  }

  const { date, serviceType } = parsed.data;

  try {
    // Fetch existing appointments for the requested date
    let bookedAppointments;
    if (serviceType) {
      bookedAppointments = db
        .select()
        .from(appointments)
        .where(
          and(
            eq(appointments.date, date),
            eq(appointments.serviceType, serviceType),
            ne(appointments.status, 'cancelled')
          )
        )
        .all();
    } else {
      bookedAppointments = db
        .select()
        .from(appointments)
        .where(
          and(
            eq(appointments.date, date),
            ne(appointments.status, 'cancelled')
          )
        )
        .all();
    }

    // Determine which slots are booked
    const bookedTimes = new Set(bookedAppointments.map((a) => a.time));

    // Build availability map
    const slots = BUSINESS_SLOTS.map((time) => ({
      time,
      available: !bookedTimes.has(time),
      status: bookedTimes.has(time) ? 'booked' as const : 'open' as const,
    }));

    const openSlots = slots.filter((s) => s.available);
    const bookedSlots = slots.filter((s) => !s.available);

    const dayName = new Date(date + 'T12:00:00').toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

    return {
      toolName: 'check_plumber_availability',
      success: true,
      data: {
        date,
        dayName,
        serviceType: serviceType || 'all',
        totalSlots: BUSINESS_SLOTS.length,
        openCount: openSlots.length,
        bookedCount: bookedSlots.length,
        slots,
        openSlots: openSlots.map((s) => s.time),
        bookedSlots: bookedSlots.map((s) => s.time),
      },
      message:
        openSlots.length > 0
          ? `📅 **Availability for ${dayName}:**\n\n✅ **${openSlots.length} open slot(s):** ${openSlots.map((s) => s.time).join(', ')}\n❌ **${bookedSlots.length} booked slot(s):** ${bookedSlots.length > 0 ? bookedSlots.map((s) => s.time).join(', ') : 'none'}${serviceType ? `\n🔧 Filtered by: ${serviceType}` : ''}`
          : `📅 **No open slots on ${dayName}.** All time slots are booked.${serviceType ? ` (filtered by: ${serviceType})` : ''}\n\nTry checking another date!`,
    };
  } catch (error) {
    return {
      toolName: 'check_plumber_availability',
      success: false,
      data: {},
      message: `Error checking availability: ${(error as Error).message}`,
    };
  }
}

// ═══════════════════════════════════════════════════════════════
//  4. generate_business_metrics  (Admin Only)
// ═══════════════════════════════════════════════════════════════

/**
 * Input schema — strict Zod validation for generate_business_metrics.
 *
 * @field dateFrom - Optional start date for the metrics window (YYYY-MM-DD)
 * @field dateTo   - Optional end date for the metrics window (YYYY-MM-DD)
 */
export const GenerateBusinessMetricsInputSchema = z
  .object({
    dateFrom: z
      .string()
      .trim()
      .regex(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, 'dateFrom must be YYYY-MM-DD')
      .optional()
      .describe('Start date for metrics window'),
    dateTo: z
      .string()
      .trim()
      .regex(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, 'dateTo must be YYYY-MM-DD')
      .optional()
      .describe('End date for metrics window'),
  })
  .refine(
    (data) => {
      if (data.dateFrom && data.dateTo) {
        return new Date(data.dateFrom) <= new Date(data.dateTo);
      }
      return true;
    },
    { message: 'dateFrom must be before or equal to dateTo' }
  );

export type GenerateBusinessMetricsInput = z.infer<typeof GenerateBusinessMetricsInputSchema>;

/**
 * Recharts-compatible data shape for the frontend graph.
 */
interface RechartsDataPoint {
  name: string;
  value: number;
  fill: string;
}

interface BusinessMetrics {
  ticketStatusBreakdown: RechartsDataPoint[];
  ticketPriorityBreakdown: RechartsDataPoint[];
  appointmentStatusBreakdown: RechartsDataPoint[];
  serviceTypeBreakdown: RechartsDataPoint[];
  summary: {
    totalTickets: number;
    openTickets: number;
    closedTickets: number;
    resolvedTickets: number;
    inProgressTickets: number;
    totalAppointments: number;
    upcomingAppointments: number;
  };
}

// Color palette for Recharts
const STATUS_COLORS: Record<string, string> = {
  open: '#22c55e',
  in_progress: '#f59e0b',
  resolved: '#3b82f6',
  closed: '#64748b',
  scheduled: '#8b5cf6',
  confirmed: '#22d3ee',
  completed: '#10b981',
  cancelled: '#ef4444',
};

const PRIORITY_COLORS: Record<string, string> = {
  low: '#22c55e',
  medium: '#f59e0b',
  high: '#f97316',
  urgent: '#ef4444',
};

const SERVICE_COLORS: Record<string, string> = {
  repair: '#3b82f6',
  installation: '#8b5cf6',
  inspection: '#22d3ee',
  emergency: '#ef4444',
  maintenance: '#f59e0b',
};

/**
 * generate_business_metrics
 * Returns a JSON object of ticket statuses (Open vs Closed) and other
 * metrics formatted for a Shadcn/Recharts graph component.
 *
 * Roles: admin ONLY
 */
export async function generateBusinessMetrics(
  rawInput: unknown
): Promise<ToolResult> {
  // ── Validate input ──
  const parsed = GenerateBusinessMetricsInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      toolName: 'generate_business_metrics',
      success: false,
      data: { validationErrors: parsed.error.flatten().fieldErrors },
      message: `❌ Invalid input: ${parsed.error.issues.map((i) => i.message).join('; ')}`,
    };
  }

  const { dateFrom, dateTo } = parsed.data;

  try {
    // ── Ticket metrics ──
    let allTickets;
    if (dateFrom && dateTo) {
      allTickets = db
        .select()
        .from(tickets)
        .where(
          and(
            gte(tickets.createdAt, dateFrom),
            sql`${tickets.createdAt} <= ${dateTo + 'T23:59:59.999Z'}`
          )
        )
        .all();
    } else {
      allTickets = db.select().from(tickets).all();
    }

    // Count by status
    const statusCounts: Record<string, number> = {};
    const priorityCounts: Record<string, number> = {};
    for (const t of allTickets) {
      statusCounts[t.status] = (statusCounts[t.status] || 0) + 1;
      priorityCounts[t.priority] = (priorityCounts[t.priority] || 0) + 1;
    }

    const ticketStatusBreakdown: RechartsDataPoint[] = Object.entries(statusCounts).map(
      ([name, value]) => ({
        name: name.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase()),
        value,
        fill: STATUS_COLORS[name] || '#94a3b8',
      })
    );

    const ticketPriorityBreakdown: RechartsDataPoint[] = Object.entries(priorityCounts).map(
      ([name, value]) => ({
        name: name.replace(/^\w/, (c) => c.toUpperCase()),
        value,
        fill: PRIORITY_COLORS[name] || '#94a3b8',
      })
    );

    // ── Appointment metrics ──
    let allAppointments;
    if (dateFrom && dateTo) {
      allAppointments = db
        .select()
        .from(appointments)
        .where(
          and(
            gte(appointments.date, dateFrom),
            sql`${appointments.date} <= ${dateTo}`
          )
        )
        .all();
    } else {
      allAppointments = db.select().from(appointments).all();
    }

    const apptStatusCounts: Record<string, number> = {};
    const serviceTypeCounts: Record<string, number> = {};
    const today = new Date().toISOString().split('T')[0];
    let upcomingCount = 0;

    for (const a of allAppointments) {
      apptStatusCounts[a.status] = (apptStatusCounts[a.status] || 0) + 1;
      serviceTypeCounts[a.serviceType] = (serviceTypeCounts[a.serviceType] || 0) + 1;
      if (a.date >= today && a.status !== 'cancelled') upcomingCount++;
    }

    const appointmentStatusBreakdown: RechartsDataPoint[] = Object.entries(apptStatusCounts).map(
      ([name, value]) => ({
        name: name.replace(/^\w/, (c) => c.toUpperCase()),
        value,
        fill: STATUS_COLORS[name] || '#94a3b8',
      })
    );

    const serviceTypeBreakdown: RechartsDataPoint[] = Object.entries(serviceTypeCounts).map(
      ([name, value]) => ({
        name: name.replace(/^\w/, (c) => c.toUpperCase()),
        value,
        fill: SERVICE_COLORS[name] || '#94a3b8',
      })
    );

    const metrics: BusinessMetrics = {
      ticketStatusBreakdown,
      ticketPriorityBreakdown,
      appointmentStatusBreakdown,
      serviceTypeBreakdown,
      summary: {
        totalTickets: allTickets.length,
        openTickets: statusCounts['open'] || 0,
        closedTickets: statusCounts['closed'] || 0,
        resolvedTickets: statusCounts['resolved'] || 0,
        inProgressTickets: statusCounts['in_progress'] || 0,
        totalAppointments: allAppointments.length,
        upcomingAppointments: upcomingCount,
      },
    };

    const dateRange = dateFrom && dateTo ? ` (${dateFrom} → ${dateTo})` : ' (all time)';

    return {
      toolName: 'generate_business_metrics',
      success: true,
      data: metrics as unknown as Record<string, unknown>,
      message: `📊 **Business Metrics${dateRange}:**\n\n🎫 **Tickets:** ${allTickets.length} total — ${statusCounts['open'] || 0} open, ${statusCounts['in_progress'] || 0} in progress, ${statusCounts['resolved'] || 0} resolved, ${statusCounts['closed'] || 0} closed\n📅 **Appointments:** ${allAppointments.length} total — ${upcomingCount} upcoming\n\n*Data formatted for Shadcn/Recharts — ready for graph components.*`,
    };
  } catch (error) {
    return {
      toolName: 'generate_business_metrics',
      success: false,
      data: {},
      message: `Error generating metrics: ${(error as Error).message}`,
    };
  }
}

// ═══════════════════════════════════════════════════════════════
//  5. summarize_ticket_problems  (Admin Only)
// ═══════════════════════════════════════════════════════════════

/**
 * Input schema — no required inputs for summarize.
 */
export const SummarizeTicketProblemsInputSchema = z
  .object({
    statusFilter: z
      .enum(['open', 'in_progress', 'all'], {
        error: 'statusFilter must be "open", "in_progress", or "all"',
      })
      .optional()
      .default('open')
      .describe('Which ticket status to summarize'),
  });

export type SummarizeTicketProblemsInput = z.infer<typeof SummarizeTicketProblemsInputSchema>;

/** Keyword-based issue classification */
const ISSUE_CATEGORIES: { category: string; keywords: string[]; icon: string }[] = [
  { category: 'Leaks', keywords: ['leak', 'drip', 'dripping', 'water damage', 'seeping', 'wet'], icon: '💧' },
  { category: 'Clogs', keywords: ['clog', 'block', 'backed up', 'slow drain', 'overflow', 'plugged'], icon: '🚫' },
  { category: 'Installations', keywords: ['install', 'replace', 'new', 'upgrade', 'setup', 'mount'], icon: '🔧' },
  { category: 'Emergency', keywords: ['emergency', 'burst', 'flood', 'urgent', 'broken pipe', 'no water'], icon: '🚨' },
  { category: 'Maintenance', keywords: ['maintenance', 'inspect', 'check', 'routine', 'annual', 'service'], icon: '🛠️' },
];

function classifyIssue(text: string): string {
  const lower = text.toLowerCase();
  for (const cat of ISSUE_CATEGORIES) {
    if (cat.keywords.some((kw) => lower.includes(kw))) return cat.category;
  }
  return 'Other';
}

/**
 * summarize_ticket_problems
 * Aggregates tickets, groups by problem type, returns a structured summary.
 */
export async function summarizeTicketProblems(
  rawInput: unknown
): Promise<ToolResult> {
  const parsed = SummarizeTicketProblemsInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      toolName: 'summarize_ticket_problems',
      success: false,
      data: { validationErrors: parsed.error.flatten().fieldErrors },
      message: `❌ Invalid input: ${parsed.error.issues.map((i) => i.message).join('; ')}`,
    };
  }

  const { statusFilter } = parsed.data;

  try {
    let allTickets;
    if (statusFilter === 'all') {
      allTickets = db.select().from(tickets).orderBy(desc(tickets.createdAt)).all();
    } else {
      allTickets = db
        .select()
        .from(tickets)
        .where(eq(tickets.status, statusFilter as 'open' | 'in_progress'))
        .orderBy(desc(tickets.createdAt))
        .all();
    }

    if (allTickets.length === 0) {
      return {
        toolName: 'summarize_ticket_problems',
        success: true,
        data: { categories: [], totalTickets: 0 },
        message: `📋 No ${statusFilter} tickets found to summarize.`,
      };
    }

    // Group by issue category
    const groups: Record<string, { count: number; tickets: typeof allTickets; priority: Record<string, number> }> = {};
    for (const t of allTickets) {
      const category = classifyIssue(`${t.subject} ${t.description}`);
      if (!groups[category]) groups[category] = { count: 0, tickets: [], priority: {} };
      groups[category].count++;
      groups[category].tickets.push(t);
      groups[category].priority[t.priority] = (groups[category].priority[t.priority] || 0) + 1;
    }

    // Build summary
    const categories = Object.entries(groups)
      .sort((a, b) => b[1].count - a[1].count)
      .map(([category, data]) => {
        const catInfo = ISSUE_CATEGORIES.find((c) => c.category === category);
        const icon = catInfo?.icon || '📌';
        const topTickets = data.tickets.slice(0, 3).map((t) => ({
          subject: t.subject,
          priority: t.priority,
          status: t.status,
          id: t.id,
        }));
        return { category, icon, count: data.count, priorityBreakdown: data.priority, topTickets };
      });

    const summaryLines = categories.map(
      (c) => `${c.icon} **${c.category}:** ${c.count} ticket(s) — ${Object.entries(c.priorityBreakdown).map(([p, n]) => `${n} ${p}`).join(', ')}`
    );

    return {
      toolName: 'summarize_ticket_problems',
      success: true,
      data: { categories, totalTickets: allTickets.length, filter: statusFilter } as unknown as Record<string, unknown>,
      message: `📊 **Problem Summary (${statusFilter} tickets — ${allTickets.length} total):**\n\n${summaryLines.join('\n')}\n\n💡 *Click a ticket in the table for response suggestions.*`,
    };
  } catch (error) {
    return {
      toolName: 'summarize_ticket_problems',
      success: false,
      data: {},
      message: `Error summarizing tickets: ${(error as Error).message}`,
    };
  }
}


// ═══════════════════════════════════════════════════════════════
//  6. suggest_ticket_response  (Admin Only)
// ═══════════════════════════════════════════════════════════════

/**
 * Input schema for suggest_ticket_response.
 */
export const SuggestTicketResponseInputSchema = z
  .object({
    ticketSubject: z
      .string()
      .min(2, 'ticketSubject must be at least 2 characters')
      .describe('The subject or description of the ticket to suggest a response for'),
  });

export type SuggestTicketResponseInput = z.infer<typeof SuggestTicketResponseInputSchema>;

/**
 * suggest_ticket_response
 * Reads the ticket details + relevant newsletter content and generates
 * a suggested operator response with recommended service type and priority.
 */
export async function suggestTicketResponse(
  rawInput: unknown
): Promise<ToolResult> {
  const parsed = SuggestTicketResponseInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      toolName: 'suggest_ticket_response',
      success: false,
      data: { validationErrors: parsed.error.flatten().fieldErrors },
      message: `❌ Invalid input: ${parsed.error.issues.map((i) => i.message).join('; ')}`,
    };
  }

  const { ticketSubject } = parsed.data;

  try {
    // Find ticket by subject (fuzzy match)
    const allTickets = db.select().from(tickets).all();
    const matchedTicket = allTickets.find(
      (t) =>
        t.subject.toLowerCase().includes(ticketSubject.toLowerCase()) ||
        ticketSubject.toLowerCase().includes(t.subject.toLowerCase())
    );

    // Get relevant newsletter content for advice
    const issueType = classifyIssue(ticketSubject);
    const relevantArticles = db
      .select()
      .from(newsletterContent)
      .where(eq(newsletterContent.isActive, true))
      .all()
      .filter((a) => {
        const combined = `${a.title} ${a.body}`.toLowerCase();
        const searchTerms = ticketSubject.toLowerCase().split(' ').filter((w) => w.length > 3);
        return searchTerms.some((term) => combined.includes(term)) || combined.includes(issueType.toLowerCase());
      })
      .slice(0, 2);

    // Build suggested response
    const priorityMap: Record<string, string> = {
      Leaks: 'high',
      Clogs: 'medium',
      Emergency: 'urgent',
      Installations: 'medium',
      Maintenance: 'low',
      Other: 'medium',
    };

    const serviceMap: Record<string, string> = {
      Leaks: 'repair',
      Clogs: 'repair',
      Emergency: 'emergency',
      Installations: 'installation',
      Maintenance: 'maintenance',
      Other: 'inspection',
    };

    const suggestedPriority = priorityMap[issueType] || 'medium';
    const suggestedService = serviceMap[issueType] || 'inspection';

    const responseData = {
      ticketInfo: matchedTicket
        ? { id: matchedTicket.id, subject: matchedTicket.subject, status: matchedTicket.status, priority: matchedTicket.priority, description: matchedTicket.description }
        : { subject: ticketSubject, note: 'No exact ticket match found — using subject for analysis' },
      issueCategory: issueType,
      suggestedPriority,
      suggestedServiceType: suggestedService,
      relevantArticles: relevantArticles.map((a) => ({ title: a.title, category: a.category })),
    };

    // Generate the operator-facing message
    const ticketLine = matchedTicket
      ? `🎫 **Ticket:** "${matchedTicket.subject}" (${matchedTicket.status}, ${matchedTicket.priority} priority)`
      : `🎫 **Subject:** "${ticketSubject}"`;

    const articleLines = relevantArticles.length > 0
      ? `\n📰 **Related Articles:** ${relevantArticles.map((a) => `"${a.title}"`).join(', ')}`
      : '';

    const suggestedResponse = getSuggestedResponseText(issueType, ticketSubject, matchedTicket?.description);

    return {
      toolName: 'suggest_ticket_response',
      success: true,
      data: responseData as unknown as Record<string, unknown>,
      message: `💬 **Suggested Response for Operator:**\n\n${ticketLine}\n📋 **Issue Type:** ${issueType}\n⚡ **Recommended Priority:** ${suggestedPriority}\n🔧 **Service Type:** ${suggestedService}${articleLines}\n\n---\n\n📝 **Draft Response:**\n\n${suggestedResponse}`,
    };
  } catch (error) {
    return {
      toolName: 'suggest_ticket_response',
      success: false,
      data: {},
      message: `Error generating response suggestion: ${(error as Error).message}`,
    };
  }
}

function getSuggestedResponseText(issueType: string, subject: string, description?: string): string {
  const desc = description || subject;
  const templates: Record<string, string> = {
    Leaks: `Thank you for reporting your leak issue. Based on your description ("${desc.slice(0, 80)}..."), we recommend scheduling an **urgent repair visit**. Our technician will:\n\n1. Inspect the source of the leak\n2. Provide an on-site assessment\n3. Perform the repair or recommend next steps\n\n⏰ We can typically respond to leak issues within 24 hours. Would you like to confirm an appointment?`,
    Clogs: `We've received your report about a drainage issue. For clog problems, we recommend:\n\n1. **Avoid using chemical drain cleaners** — they can damage pipes\n2. Schedule a **professional drain clearing** appointment\n3. Our technician will use camera inspection if needed\n\n📅 We have availability this week. Shall we book a time slot?`,
    Emergency: `🚨 **URGENT:** Your issue has been flagged as an emergency. We are prioritizing your case.\n\n**Immediate steps:**\n1. Shut off the main water supply if possible\n2. Our emergency team will contact you within 30 minutes\n3. A technician will be dispatched ASAP\n\nPlease confirm your address and the best phone number to reach you.`,
    Installations: `Thank you for your installation request. Here's what we recommend:\n\n1. Schedule a **free consultation** at your property\n2. Our technician will assess the installation requirements\n3. We'll provide a detailed quote before any work begins\n\n📞 Would you like to schedule the consultation?`,
    Maintenance: `We appreciate you scheduling maintenance! Regular maintenance helps prevent costly repairs. Our service includes:\n\n1. Full plumbing system inspection\n2. Water pressure check\n3. Drain flow testing\n4. Fixture assessment\n\n📅 Our next available maintenance slot is this week. Would that work for you?`,
    Other: `Thank you for reaching out regarding "${subject}". We'd like to learn more about your issue so we can assist you properly.\n\nCould you provide:\n1. A detailed description of the problem\n2. When the issue started\n3. Your preferred appointment time\n\nWe'll have a specialist review your case and get back to you shortly.`,
  };

  return templates[issueType] || templates['Other'];
}


// ═══════════════════════════════════════════════════════════════
//  MCP Tool Definitions — for server registration
// ═══════════════════════════════════════════════════════════════

export const MCP_TOOL_DEFINITIONS = [
  {
    name: 'get_newsletter_advice',
    description:
      'Queries the SQLite database for plumbing tips/articles from the newsletter to provide expert context in chat.',
    inputSchema: GetNewsletterAdviceInputSchema,
    roles: ['anon', 'authenticated', 'admin'] as const,
    handler: getNewsletterAdvice,
  },
  {
    name: 'create_service_ticket',
    description:
      'Takes user problem description, urgency level, and contact info to create a row in the tickets table.',
    inputSchema: CreateServiceTicketInputSchema,
    roles: ['authenticated', 'admin'] as const,
    handler: createServiceTicket,
  },
  {
    name: 'check_plumber_availability',
    description:
      'Checks the appointments table for open time slots on a given date.',
    inputSchema: CheckPlumberAvailabilityInputSchema,
    roles: ['authenticated', 'admin'] as const,
    handler: checkPlumberAvailability,
  },
  {
    name: 'generate_business_metrics',
    description:
      '(Admin Only) Returns a JSON object of ticket statuses (Open vs. Closed) formatted for a Shadcn/Recharts graph.',
    inputSchema: GenerateBusinessMetricsInputSchema,
    roles: ['admin'] as const,
    handler: generateBusinessMetrics,
  },
  {
    name: 'summarize_ticket_problems',
    description:
      '(Admin Only) Aggregates open tickets, groups by problem type (leaks, clogs, installs, emergency), and returns a structured summary.',
    inputSchema: SummarizeTicketProblemsInputSchema,
    roles: ['admin'] as const,
    handler: summarizeTicketProblems,
  },
  {
    name: 'suggest_ticket_response',
    description:
      '(Admin Only) Takes a ticket subject, reads ticket details + newsletter content, and generates a suggested operator response.',
    inputSchema: SuggestTicketResponseInputSchema,
    roles: ['admin'] as const,
    handler: suggestTicketResponse,
  },
] as const;
