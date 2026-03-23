import type { UserRole, IntentType, ToolResult, ChatResponse } from '@/lib/types';
import { hasPermission, getAccessDeniedMessage } from '@/mcp-server/auth';
import {
  queryTickets,
  getTicketDetail,
  createTicket,
  queryAppointments,
  scheduleAppointment,
  getNewsletter,
  manageUsers,
} from '@/mcp-server/tools';
import {
  getNewsletterAdvice,
  createServiceTicket,
  checkPlumberAvailability,
  generateBusinessMetrics,
} from '@/mcp-server/mcp-tools';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Intent classification patterns.
 * Maps keyword groups to intent types.
 * New Zod-validated tools are matched first (higher priority).
 */
const INTENT_PATTERNS: { intent: IntentType; keywords: string[] }[] = [
  // ── New Zod-validated MCP tools (higher priority) ──
  {
    intent: 'generate_business_metrics',
    keywords: [
      'business metrics', 'metrics', 'dashboard', 'analytics',
      'report', 'graph', 'chart', 'statistics', 'stats',
      'ticket breakdown', 'open vs closed',
    ],
  },
  {
    intent: 'check_plumber_availability',
    keywords: [
      'availability', 'available', 'open slots', 'free slots',
      'when can', 'next available', 'check availability',
    ],
  },
  {
    intent: 'create_service_ticket',
    keywords: [
      'service ticket', 'submit service', 'file a ticket',
      'report service issue', 'need service',
    ],
  },
  {
    intent: 'get_newsletter_advice',
    keywords: [
      'plumbing advice', 'expert advice', 'plumbing tips',
      'newsletter advice', 'what do you recommend',
      'any tips', 'best practice',
    ],
  },
  // ── Legacy tools ──
  {
    intent: 'create_ticket',
    keywords: [
      'create ticket', 'new ticket', 'submit ticket', 'report issue',
      'report problem', 'i have a', 'leaking', 'broken', 'clogged',
      'not working', 'flooding', 'burst', 'dripping',
    ],
  },
  {
    intent: 'query_tickets',
    keywords: [
      'show tickets', 'my tickets', 'list tickets', 'all tickets',
      'ticket status', 'view tickets', 'open tickets',
    ],
  },
  {
    intent: 'get_ticket_detail',
    keywords: ['ticket detail', 'ticket info', 'ticket #', 'ticket id'],
  },
  {
    intent: 'schedule_appointment',
    keywords: [
      'schedule', 'book', 'appointment', 'set up a visit',
      'come out', 'send someone',
    ],
  },
  {
    intent: 'query_appointments',
    keywords: [
      'my appointments', 'show appointments', 'list appointments',
      'upcoming appointments', 'all appointments',
    ],
  },
  {
    intent: 'get_newsletter',
    keywords: [
      'newsletter', 'tips', 'faq', 'advice', 'promotion',
      'news', 'article', 'help with', 'how to', 'what should',
      'when should', 'recommend',
    ],
  },
  {
    intent: 'manage_users',
    keywords: [
      'show users', 'list users', 'all users', 'manage users',
      'user list', 'view users',
    ],
  },
];

/**
 * Classify a user message into an intent.
 */
function classifyIntent(message: string): IntentType {
  const lowerMsg = message.toLowerCase();

  for (const pattern of INTENT_PATTERNS) {
    for (const keyword of pattern.keywords) {
      if (lowerMsg.includes(keyword)) {
        return pattern.intent;
      }
    }
  }

  return 'general_help';
}

/**
 * Extract parameters from a message for ticket creation.
 */
function extractTicketParams(message: string) {
  // Simple extraction — the message itself becomes the description
  const subject = message.length > 60 ? message.slice(0, 60) + '...' : message;
  
  let priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium';
  const lower = message.toLowerCase();
  if (lower.includes('emergency') || lower.includes('urgent') || lower.includes('flooding') || lower.includes('burst')) {
    priority = 'urgent';
  } else if (lower.includes('bad') || lower.includes('serious') || lower.includes('dangerous')) {
    priority = 'high';
  } else if (lower.includes('minor') || lower.includes('small') || lower.includes('slight')) {
    priority = 'low';
  }

  return { subject, description: message, priority };
}

/**
 * Extract parameters from a message for appointment scheduling.
 */
function extractAppointmentParams(message: string) {
  // Extract date patterns (simple extraction)
  const dateMatch = message.match(/(\d{4}-\d{2}-\d{2})/);
  const dayMatch = message.match(/(?:next\s+|this\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i);
  
  let date = dateMatch?.[1] || '';
  if (!date && dayMatch) {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const targetDay = days.indexOf(dayMatch[1].toLowerCase());
    const today = new Date();
    const currentDay = today.getDay();
    let daysUntil = targetDay - currentDay;
    if (daysUntil <= 0) daysUntil += 7;
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + daysUntil);
    date = targetDate.toISOString().split('T')[0];
  }
  if (!date) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    date = tomorrow.toISOString().split('T')[0];
  }

  // Extract time
  const timeMatch = message.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)?/i);
  let time = '09:00';
  if (timeMatch) {
    let hours = parseInt(timeMatch[1]);
    const minutes = timeMatch[2] || '00';
    const period = timeMatch[3]?.toLowerCase();
    if (period === 'pm' && hours < 12) hours += 12;
    if (period === 'am' && hours === 12) hours = 0;
    time = `${hours.toString().padStart(2, '0')}:${minutes}`;
  }

  // Extract service type
  let serviceType: 'repair' | 'installation' | 'inspection' | 'emergency' | 'maintenance' = 'repair';
  const lower = message.toLowerCase();
  if (lower.includes('install')) serviceType = 'installation';
  else if (lower.includes('inspect')) serviceType = 'inspection';
  else if (lower.includes('emergency') || lower.includes('urgent')) serviceType = 'emergency';
  else if (lower.includes('maintenance') || lower.includes('checkup')) serviceType = 'maintenance';

  return { date, time, serviceType, notes: message };
}

/**
 * Extract a date from a chat message for availability checks.
 */
function extractDateFromMessage(message: string): string {
  const dateMatch = message.match(/(\d{4}-\d{2}-\d{2})/);
  if (dateMatch) return dateMatch[1];

  const dayMatch = message.match(/(?:next\s+|this\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i);
  if (dayMatch) {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const targetDay = days.indexOf(dayMatch[1].toLowerCase());
    const today = new Date();
    const currentDay = today.getDay();
    let daysUntil = targetDay - currentDay;
    if (daysUntil <= 0) daysUntil += 7;
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + daysUntil);
    return targetDate.toISOString().split('T')[0];
  }

  if (message.toLowerCase().includes('tomorrow')) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  }

  if (message.toLowerCase().includes('today')) {
    return new Date().toISOString().split('T')[0];
  }

  // Default to tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split('T')[0];
}

/**
 * Get a fallback userId for a given role.
 * In production, this would come from a real auth session.
 */
function getFallbackUserId(role: UserRole): string {
  const user = db
    .select()
    .from(users)
    .where(eq(users.role, role))
    .limit(1)
    .get();
  return user?.id || 'unknown';
}

/**
 * Get fallback contact info for a role (from the DB user record).
 */
function getFallbackContactInfo(userId: string) {
  const user = db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .get();

  return {
    contactName: user?.name || 'Unknown Customer',
    contactEmail: user?.email || 'unknown@example.com',
    contactPhone: user?.phone || undefined,
  };
}

/**
 * Mediate — The core function that receives a chat message and routes
 * it through the MCP tool system.
 */
export async function mediate(
  message: string,
  role: UserRole,
  userId?: string
): Promise<ChatResponse> {
  // 1. Classify intent
  const intent = classifyIntent(message);

  // 2. Check permissions
  if (!hasPermission(role, intent)) {
    return {
      message: getAccessDeniedMessage(role, intent),
      intent,
    };
  }

  // 3. Resolve userId if not provided
  const resolvedUserId = userId || getFallbackUserId(role);

  // 4. Dispatch to the appropriate MCP tool
  let toolResult: ToolResult;

  switch (intent) {
    // ── New Zod-validated MCP tools ──

    case 'get_newsletter_advice': {
      const lower = message.toLowerCase();
      let category: string | undefined;
      if (lower.includes('tip')) category = 'tip';
      else if (lower.includes('faq')) category = 'faq';
      else if (lower.includes('promo')) category = 'promotion';

      // Extract topic keywords (strip common filler words)
      const topicWords = message
        .replace(/\b(show|me|give|get|any|some|plumbing|advice|tips|newsletter|about|for|on|the|a|an|please|can|you|i|want|need)\b/gi, '')
        .trim();

      toolResult = await getNewsletterAdvice({
        topic: topicWords.length > 2 ? topicWords : undefined,
        category,
        limit: 5,
      });
      break;
    }

    case 'create_service_ticket': {
      const contactInfo = getFallbackContactInfo(resolvedUserId);

      let urgencyLevel: 'low' | 'medium' | 'high' | 'urgent' = 'medium';
      const lower = message.toLowerCase();
      if (lower.includes('emergency') || lower.includes('urgent') || lower.includes('flooding') || lower.includes('burst')) {
        urgencyLevel = 'urgent';
      } else if (lower.includes('bad') || lower.includes('serious')) {
        urgencyLevel = 'high';
      } else if (lower.includes('minor') || lower.includes('small')) {
        urgencyLevel = 'low';
      }

      toolResult = await createServiceTicket(
        {
          problemDescription: message,
          urgencyLevel,
          ...contactInfo,
        },
        resolvedUserId
      );
      break;
    }

    case 'check_plumber_availability': {
      const date = extractDateFromMessage(message);
      let serviceType: string | undefined;
      const lower = message.toLowerCase();
      if (lower.includes('repair')) serviceType = 'repair';
      else if (lower.includes('install')) serviceType = 'installation';
      else if (lower.includes('inspect')) serviceType = 'inspection';
      else if (lower.includes('emergency')) serviceType = 'emergency';
      else if (lower.includes('maintenance')) serviceType = 'maintenance';

      toolResult = await checkPlumberAvailability({
        date,
        ...(serviceType && { serviceType }),
      });
      break;
    }

    case 'generate_business_metrics': {
      toolResult = await generateBusinessMetrics({});
      break;
    }

    // ── Legacy tools ──

    case 'query_tickets':
      toolResult = await queryTickets({
        userId: resolvedUserId,
        isAdmin: role === 'admin',
      });
      break;

    case 'get_ticket_detail': {
      // Try to extract a ticket ID from the message
      const idMatch = message.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
      if (idMatch) {
        toolResult = await getTicketDetail(idMatch[0]);
      } else {
        toolResult = {
          toolName: 'get_ticket_detail',
          success: false,
          data: {},
          message: 'Please provide a valid ticket ID to look up.',
        };
      }
      break;
    }

    case 'create_ticket': {
      const ticketParams = extractTicketParams(message);
      toolResult = await createTicket({
        userId: resolvedUserId,
        ...ticketParams,
      });
      break;
    }

    case 'query_appointments':
      toolResult = await queryAppointments({
        userId: resolvedUserId,
        isAdmin: role === 'admin',
      });
      break;

    case 'schedule_appointment': {
      const apptParams = extractAppointmentParams(message);
      toolResult = await scheduleAppointment({
        userId: resolvedUserId,
        ...apptParams,
      });
      break;
    }

    case 'get_newsletter': {
      let category: string | undefined;
      const lower = message.toLowerCase();
      if (lower.includes('tip')) category = 'tip';
      else if (lower.includes('faq') || lower.includes('question') || lower.includes('when should')) category = 'faq';
      else if (lower.includes('promotion') || lower.includes('deal') || lower.includes('discount')) category = 'promotion';
      else if (lower.includes('news') || lower.includes('update')) category = 'update';

      toolResult = await getNewsletter(category ? { category } : undefined);
      break;
    }

    case 'manage_users':
      toolResult = await manageUsers({ action: 'list' });
      break;

    case 'general_help':
    default:
      return {
        message: getHelpMessage(role),
        intent: 'general_help',
      };
  }

  // 5. Build the response message
  const responseMessage = buildResponseMessage(intent, toolResult);

  return {
    message: responseMessage,
    toolResult,
    intent,
  };
}

/**
 * Build a human-friendly response message from the tool result.
 */
function buildResponseMessage(intent: IntentType, result: ToolResult): string {
  if (!result.success) {
    return `⚠️ ${result.message}`;
  }

  switch (intent) {
    // ── New MCP tools ──
    case 'get_newsletter_advice':
    case 'create_service_ticket':
    case 'check_plumber_availability':
    case 'generate_business_metrics':
      // These tools produce their own rich messages
      return result.message;

    // ── Legacy tools ──
    case 'query_tickets': {
      const items = Array.isArray(result.data) ? result.data : [];
      if (items.length === 0) return '📋 No tickets found.';
      const summary = items
        .map((t: Record<string, unknown>) => `• **${t.subject}** — Status: ${t.status}, Priority: ${t.priority}`)
        .join('\n');
      return `📋 **Your Tickets (${items.length}):**\n${summary}`;
    }

    case 'get_ticket_detail': {
      const t = result.data as Record<string, unknown>;
      return `🎫 **Ticket: ${t.subject}**\nStatus: ${t.status} | Priority: ${t.priority}\n\n${t.description}`;
    }

    case 'create_ticket':
      return `${result.message}\n\nOur team will review your issue and get back to you shortly.`;

    case 'query_appointments': {
      const items = Array.isArray(result.data) ? result.data : [];
      if (items.length === 0) return '📅 No appointments found.';
      const summary = items
        .map((a: Record<string, unknown>) => `• **${a.date}** at ${a.time} — ${a.serviceType} (${a.status})`)
        .join('\n');
      return `📅 **Appointments (${items.length}):**\n${summary}`;
    }

    case 'schedule_appointment':
      return `${result.message}\n\nWe'll send a confirmation once a technician is assigned.`;

    case 'get_newsletter': {
      const items = Array.isArray(result.data) ? result.data : [];
      if (items.length === 0) return '📰 No articles found.';
      const summary = items
        .map((a: Record<string, unknown>) => `### ${a.title}\n*${a.category}*\n\n${(a.body as string)?.slice(0, 200)}...`)
        .join('\n\n---\n\n');
      return `📰 **Pipe Dream Plumbing News:**\n\n${summary}`;
    }

    case 'manage_users': {
      const items = Array.isArray(result.data) ? result.data : [];
      if (items.length === 0) return '👥 No users found.';
      const summary = items
        .map((u: Record<string, unknown>) => `• **${u.name}** (${u.email}) — Role: ${u.role}`)
        .join('\n');
      return `👥 **System Users (${items.length}):**\n${summary}`;
    }

    default:
      return result.message;
  }
}

/**
 * Generate a context-aware help message based on the user's role.
 */
function getHelpMessage(role: UserRole): string {
  const base = `👋 **Welcome to Pipe Dream Plumbing Virtual Assistant!**\n\nI can help you with the following:\n`;

  const features = {
    anon: [
      '📰 **Get plumbing advice** — Try: "Any plumbing tips?"',
      '❓ **Browse FAQs** — Try: "When should I call a plumber?"',
      '\n💡 *Sign in to submit tickets, check availability, and book appointments!*',
    ],
    authenticated: [
      '📰 **Get plumbing advice** — Try: "Any plumbing tips?"',
      '🎫 **Submit a service ticket** — Try: "I need service for a leaking faucet"',
      '📋 **View your tickets** — Try: "Show my tickets"',
      '📅 **Check availability** — Try: "Check availability for next Tuesday"',
      '📅 **Book appointments** — Try: "Schedule an appointment for Tuesday"',
      '📅 **View appointments** — Try: "Show my appointments"',
    ],
    admin: [
      '📰 **Get plumbing advice** — Try: "Any plumbing tips?"',
      '🎫 **Manage all tickets** — Try: "Show all tickets"',
      '📅 **Check availability** — Try: "Check availability for next Monday"',
      '📅 **Manage all appointments** — Try: "Show all appointments"',
      '👥 **Manage users** — Try: "Show all users"',
      '📊 **Business metrics** — Try: "Show business metrics"',
      '...plus everything available to authenticated users',
    ],
  };

  return base + features[role].join('\n');
}

