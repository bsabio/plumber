import { db } from '@/db';
import { users, tickets, appointments, newsletterContent } from '@/db/schema';
import type { Ticket, Appointment, NewsletterContent } from '@/db/schema';
import { eq, desc, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import type { ToolResult } from '@/lib/types';

// ── query_tickets ──
export async function queryTickets(params: {
  userId?: string;
  status?: string;
  isAdmin?: boolean;
}): Promise<ToolResult> {
  try {
    let results: Ticket[];
    if (params.isAdmin) {
      // Admin sees all tickets
      results = params.status
        ? db
            .select()
            .from(tickets)
            .where(eq(tickets.status, params.status as 'open' | 'in_progress' | 'resolved' | 'closed'))
            .orderBy(desc(tickets.createdAt))
            .all()
        : db.select().from(tickets).orderBy(desc(tickets.createdAt)).all();
    } else if (params.userId) {
      results = params.status
        ? db
            .select()
            .from(tickets)
            .where(
              and(
                eq(tickets.userId, params.userId),
                eq(tickets.status, params.status as 'open' | 'in_progress' | 'resolved' | 'closed')
              )
            )
            .orderBy(desc(tickets.createdAt))
            .all()
        : db
            .select()
            .from(tickets)
            .where(eq(tickets.userId, params.userId))
            .orderBy(desc(tickets.createdAt))
            .all();
    } else {
      results = [];
    }

    return {
      toolName: 'query_tickets',
      success: true,
      data: results as unknown as Record<string, unknown>[],
      message: `Found ${results.length} ticket(s).`,
    };
  } catch (error) {
    return {
      toolName: 'query_tickets',
      success: false,
      data: {},
      message: `Error querying tickets: ${(error as Error).message}`,
    };
  }
}

// ── get_ticket_detail ──
export async function getTicketDetail(ticketId: string): Promise<ToolResult> {
  try {
    const result = db
      .select()
      .from(tickets)
      .where(eq(tickets.id, ticketId))
      .get();

    if (!result) {
      return {
        toolName: 'get_ticket_detail',
        success: false,
        data: {},
        message: 'Ticket not found.',
      };
    }

    return {
      toolName: 'get_ticket_detail',
      success: true,
      data: result as unknown as Record<string, unknown>,
      message: `Ticket "${result.subject}" retrieved successfully.`,
    };
  } catch (error) {
    return {
      toolName: 'get_ticket_detail',
      success: false,
      data: {},
      message: `Error: ${(error as Error).message}`,
    };
  }
}

// ── create_ticket ──
export async function createTicket(params: {
  userId: string;
  subject: string;
  description: string;
  priority?: string;
}): Promise<ToolResult> {
  try {
    const now = new Date().toISOString();
    const newTicket = {
      id: uuidv4(),
      userId: params.userId,
      subject: params.subject,
      description: params.description,
      priority: (params.priority || 'medium') as 'low' | 'medium' | 'high' | 'urgent',
      status: 'open' as const,
      createdAt: now,
      updatedAt: now,
    };

    db.insert(tickets).values(newTicket).run();

    return {
      toolName: 'create_ticket',
      success: true,
      data: newTicket as unknown as Record<string, unknown>,
      message: `✅ Ticket "${params.subject}" created successfully with ID ${newTicket.id.slice(0, 8)}...`,
    };
  } catch (error) {
    return {
      toolName: 'create_ticket',
      success: false,
      data: {},
      message: `Error creating ticket: ${(error as Error).message}`,
    };
  }
}

// ── query_appointments ──
export async function queryAppointments(params: {
  userId?: string;
  isAdmin?: boolean;
}): Promise<ToolResult> {
  try {
    let results: Appointment[];
    if (params.isAdmin) {
      results = db
        .select()
        .from(appointments)
        .orderBy(desc(appointments.date))
        .all();
    } else if (params.userId) {
      results = db
        .select()
        .from(appointments)
        .where(eq(appointments.userId, params.userId))
        .orderBy(desc(appointments.date))
        .all();
    } else {
      results = [];
    }

    return {
      toolName: 'query_appointments',
      success: true,
      data: results as unknown as Record<string, unknown>[],
      message: `Found ${results.length} appointment(s).`,
    };
  } catch (error) {
    return {
      toolName: 'query_appointments',
      success: false,
      data: {},
      message: `Error querying appointments: ${(error as Error).message}`,
    };
  }
}

// ── schedule_appointment ──
export async function scheduleAppointment(params: {
  userId: string;
  date: string;
  time: string;
  serviceType: string;
  notes?: string;
  address?: string;
}): Promise<ToolResult> {
  try {
    const newAppt = {
      id: uuidv4(),
      userId: params.userId,
      date: params.date,
      time: params.time,
      serviceType: params.serviceType as 'repair' | 'installation' | 'inspection' | 'emergency' | 'maintenance',
      status: 'scheduled' as const,
      notes: params.notes || null,
      address: params.address || null,
      createdAt: new Date().toISOString(),
    };

    db.insert(appointments).values(newAppt).run();

    return {
      toolName: 'schedule_appointment',
      success: true,
      data: newAppt as unknown as Record<string, unknown>,
      message: `✅ Appointment scheduled for ${params.date} at ${params.time} (${params.serviceType}). ID: ${newAppt.id.slice(0, 8)}...`,
    };
  } catch (error) {
    return {
      toolName: 'schedule_appointment',
      success: false,
      data: {},
      message: `Error scheduling appointment: ${(error as Error).message}`,
    };
  }
}

// ── get_newsletter ──
export async function getNewsletter(params?: {
  category?: string;
}): Promise<ToolResult> {
  try {
    let results: NewsletterContent[];
    if (params?.category) {
      results = db
        .select()
        .from(newsletterContent)
        .where(
          and(
            eq(newsletterContent.isActive, true),
            eq(newsletterContent.category, params.category as 'tip' | 'promotion' | 'update' | 'faq' | 'seasonal')
          )
        )
        .orderBy(desc(newsletterContent.publishedAt))
        .all();
    } else {
      results = db
        .select()
        .from(newsletterContent)
        .where(eq(newsletterContent.isActive, true))
        .orderBy(desc(newsletterContent.publishedAt))
        .all();
    }

    return {
      toolName: 'get_newsletter',
      success: true,
      data: results as unknown as Record<string, unknown>[],
      message: `Found ${results.length} newsletter article(s).`,
    };
  } catch (error) {
    return {
      toolName: 'get_newsletter',
      success: false,
      data: {},
      message: `Error fetching newsletter: ${(error as Error).message}`,
    };
  }
}

// ── manage_users (admin only) ──
export async function manageUsers(params?: {
  action?: 'list' | 'get';
  userId?: string;
}): Promise<ToolResult> {
  try {
    if (params?.action === 'get' && params.userId) {
      const user = db
        .select()
        .from(users)
        .where(eq(users.id, params.userId))
        .get();

      if (!user) {
        return {
          toolName: 'manage_users',
          success: false,
          data: {},
          message: 'User not found.',
        };
      }

      return {
        toolName: 'manage_users',
        success: true,
        data: user as unknown as Record<string, unknown>,
        message: `User "${user.name}" retrieved.`,
      };
    }

    const allUsers = db.select().from(users).all();
    return {
      toolName: 'manage_users',
      success: true,
      data: allUsers as unknown as Record<string, unknown>[],
      message: `Found ${allUsers.length} user(s).`,
    };
  } catch (error) {
    return {
      toolName: 'manage_users',
      success: false,
      data: {},
      message: `Error managing users: ${(error as Error).message}`,
    };
  }
}
