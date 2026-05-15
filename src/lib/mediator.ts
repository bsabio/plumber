import type { UserRole, IntentType, ToolResult, ChatResponse } from '@/lib/types';
import { hasPermission, getAccessDeniedMessage } from '@/mcp-server/auth';
import { getLeadCaptureNudge, getNewsletterTieIn } from '@/lib/system-prompt';
import { generateResponse } from '@/lib/ai-client';
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
  summarizeTicketProblems,
  suggestTicketResponse,
  updateTicketStatus,
  assignTechnician,
  getTechnicians,
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
    intent: 'summarize_ticket_problems',
    keywords: [
      'summarize problems', 'summarize tickets', 'problem summary',
      'summarize user problems', 'ticket summary', 'issue summary',
      'breakdown of problems', 'what are the problems', 'common issues',
    ],
  },
  {
    intent: 'suggest_ticket_response',
    keywords: [
      'suggest response', 'draft response', 'suggested response',
      'how to respond', 'response for ticket', 'recommend response',
      'what should i say', 'help me respond',
    ],
  },
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
      'works for me', 'that day', 'this week',
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
  {
    intent: 'update_ticket_status',
    keywords: [
      'update ticket', 'update this ticket', 'change status', 'mark ticket',
      'close ticket', 'close this ticket',
      'resolve ticket', 'resolve this ticket',
      'reopen ticket', 'reopen this ticket',
      'set ticket status', 'update status',
      'mark as resolved', 'mark as closed', 'mark as in progress',
      'mark it as', 'set to resolved', 'set to closed', 'set to open',
    ],
  },
  {
    intent: 'assign_technician',
    keywords: [
      'assign technician', 'assign to', 'dispatch technician',
      'send technician', 'who should handle', 'assign ticket',
      'assign joe', 'assign dan', 'assign maria',
      'dispatch to', 'send to technician',
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
  {
    intent: 'general_help',
    keywords: [
      'help', 'support', 'what can you do', 'menu', 'options',
      'how does this work', 'not sure',
    ],
  },
];

/**
 * Classify a user message into an intent. Exported for tests.
 */
export function classifyIntent(message: string): IntentType {
  const lowerMsg = message.toLowerCase();

  // ── UUID + status-word heuristic ──
  // If the message contains a UUID and a status-related word, it's almost
  // certainly an update_ticket_status request — catch it early.
  const hasUUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(message);
  if (hasUUID) {
    const statusWords = /\b(resolve|resolved|close|closed|reopen|reopened|mark|update|in.progress|complete|done|fixed)\b/;
    if (statusWords.test(lowerMsg)) {
      return 'update_ticket_status';
    }
    // UUID + technician-name heuristic
    const assignWords = /\b(assign|dispatch|send|give|allocate)\b/;
    const techNames = /\b(joe|dan|maria|ramirez|kowalski|santos|technician)\b/;
    if (assignWords.test(lowerMsg) || techNames.test(lowerMsg)) {
      return 'assign_technician';
    }
  }

  for (const pattern of INTENT_PATTERNS) {
    for (const keyword of pattern.keywords) {
      if (lowerMsg.includes(keyword)) {
        return pattern.intent;
      }
    }
  }

  // Day-name / "tomorrow" should only imply scheduling when paired with an
  // action verb. This avoids false positives on retrospective statements like
  // "I had a leak Monday" or "the drain started clogging tomorrow morning".
  const dayOrRelative = /\b(today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday|next week)\b/;
  const scheduleVerb = /\b(schedule|book|appointment|visit|come out|send|set up|reschedule)\b/;
  if (dayOrRelative.test(lowerMsg) && scheduleVerb.test(lowerMsg)) {
    return 'schedule_appointment';
  }

  // Fallback for greetings/social chat
  if (lowerMsg.match(/\b(hi|hello|hey|who are you|thanks|thank you|bye)\b/)) {
    return 'general_help';
  }

  // Fallback for plumbing-related questions → try newsletter RAG
  const plumbingTerms = /\b(pipe|plumb|drain|faucet|water|toilet|sink|shower|valve|sewer|septic|heater)\b/;
  if (plumbingTerms.test(lowerMsg) && (lowerMsg.includes('?') || lowerMsg.includes('how') || lowerMsg.includes('why'))) {
    return 'get_newsletter_advice';
  }

  // Everything else → LLM conversational handler
  return 'general_help';
}

/**
 * Extract parameters from a message for ticket creation. Exported for tests.
 */
export function extractTicketParams(message: string) {
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
 * Extract parameters from a message for appointment scheduling. Exported for tests.
 */
export function extractAppointmentParams(message: string) {
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

  // Extract time. Require either an explicit am/pm marker or an explicit
  // `HH:MM` form so we don't accidentally lift the year out of an ISO date.
  let time = '09:00';
  const timeAmPm = message.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i);
  const timeColon = !timeAmPm ? message.match(/\b(\d{1,2}):(\d{2})\b/) : null;
  const timeMatch = timeAmPm ?? timeColon;
  if (timeMatch) {
    let hours = parseInt(timeMatch[1], 10);
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
 * Extract a date from a chat message for availability checks. Exported for tests.
 */
export function extractDateFromMessage(message: string): string {
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
 *
 * Async because the Neon HTTP driver returns promises — there's no
 * synchronous read path. Callers in `mediate` await this.
 */
async function getFallbackUserId(role: UserRole): Promise<string> {
  try {
    const rows = await db
      .select()
      .from(users)
      .where(eq(users.role, role))
      .limit(1);
    return rows[0]?.id || 'unknown';
  } catch {
    return 'unknown';
  }
}

/**
 * Get fallback contact info for a role (from the DB user record).
 */
async function getFallbackContactInfo(userId: string): Promise<{
  contactName: string;
  contactEmail: string;
  contactPhone: string | undefined;
}> {
  try {
    const rows = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    const user = rows[0];

    return {
      contactName: user?.name || 'Unknown Customer',
      contactEmail: user?.email || 'unknown@example.com',
      contactPhone: user?.phone || undefined,
    };
  } catch {
    return {
      contactName: 'Unknown Customer',
      contactEmail: 'unknown@example.com',
      contactPhone: undefined,
    };
  }
}

/**
 * Mediate — The core function that receives a chat message and routes
 * it through the MCP tool system.
 */
export async function mediate(
  message: string,
  role: UserRole,
  userId?: string,
  apiKey?: string
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
  const resolvedUserId = userId || (await getFallbackUserId(role));

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
      const contactInfo = await getFallbackContactInfo(resolvedUserId);

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

    case 'summarize_ticket_problems': {
      const lower = message.toLowerCase();
      let statusFilter: 'open' | 'in_progress' | 'all' = 'open';
      if (lower.includes('all')) statusFilter = 'all';
      else if (lower.includes('in progress')) statusFilter = 'in_progress';
      toolResult = await summarizeTicketProblems({ statusFilter });
      break;
    }

    case 'suggest_ticket_response': {
      // Try to extract the ticket subject from the message
      const subjectMatch = message.match(/(?:response\s+(?:for|to)|respond\s+to)\s+["']?(.+?)(?:["']?$|\.|$)/i);
      const ticketSubject = subjectMatch?.[1]?.trim() || message.replace(/suggest\s+(?:a\s+)?response\s*/i, '').trim();
      toolResult = await suggestTicketResponse({ ticketSubject });
      break;
    }

    case 'update_ticket_status': {
      // Extract ticket ID (UUID) from the message
      const uuidMatch = message.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);

      // Extract the desired status
      const lower = message.toLowerCase();
      let newStatus: 'open' | 'in_progress' | 'resolved' | 'closed' = 'resolved';
      if (lower.includes('close') || lower.includes('closed')) {
        newStatus = 'closed';
      } else if (lower.includes('in progress') || lower.includes('in_progress') || lower.includes('working')) {
        newStatus = 'in_progress';
      } else if (lower.includes('reopen') || lower.includes('open')) {
        newStatus = 'open';
      } else if (lower.includes('resolve') || lower.includes('resolved') || lower.includes('done') || lower.includes('fixed')) {
        newStatus = 'resolved';
      }

      if (!uuidMatch) {
        toolResult = {
          toolName: 'update_ticket_status',
          success: false,
          data: {},
          message: 'Please provide the ticket ID (UUID) you want to update. Example: "Update ticket abc12345-... to resolved"',
        };
      } else {
        toolResult = await updateTicketStatus({
          ticketId: uuidMatch[0],
          newStatus,
        });
      }
      break;
    }

    case 'assign_technician': {
      // Extract ticket UUID from message
      const uuidMatch = message.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);

      if (!uuidMatch) {
        toolResult = {
          toolName: 'assign_technician',
          success: false,
          data: {},
          message: 'Please provide the ticket ID (UUID) and specify which technician to assign. Example: "Assign ticket [UUID] to Joe"',
        };
        break;
      }

      // Resolve technician by name from the message
      const technicians = await getTechnicians();
      const lowerMsg = message.toLowerCase();
      const matched = technicians.find((t) =>
        lowerMsg.includes(t.name.split(' ')[0].toLowerCase()) ||
        lowerMsg.includes(t.name.toLowerCase())
      );

      if (!matched) {
        const techList = technicians
          .map((t) => `• **${t.name}** (${t.specialty ?? 'General'}) — ID: \`${t.id}\``)
          .join('\n');
        toolResult = {
          toolName: 'assign_technician',
          success: false,
          data: { technicians },
          message: `Please specify which technician to assign. Available technicians:\n\n${techList}`,
        };
        break;
      }

      toolResult = await assignTechnician({
        ticketId: uuidMatch[0],
        technicianId: matched.id,
      });
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
      // PIVOT: If user wants to "book" but hasn't given a date, check availability first
      const lower = message.toLowerCase();
      const hasDate = lower.match(/\b(today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d{4}-\d{2}-\d{2})\b/);
      
      if (!hasDate) {
        // Run availability check instead of attempting to book
        const date = extractDateFromMessage('tomorrow');
        toolResult = await checkPlumberAvailability({ date });
        // Let the LLM craft the scheduling response with availability data
        const pivotContext = formatToolContext('check_plumber_availability', toolResult);
        const pivotMessage = await generateResponse(message, role, pivotContext, { apiKeyOverride: apiKey });
        return {
          message: pivotMessage,
          toolResult,
          intent: 'check_plumber_availability',
          suggestedActions: getSuggestedActions('check_plumber_availability', role, toolResult),
        };
      }

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
    default: {
      // No tool needed — pure conversation
      const llmResponse = await generateResponse(message, role, undefined, { apiKeyOverride: apiKey });
      return {
        message: llmResponse,
        intent: 'general_help',
        suggestedActions: ['Any plumbing tips?', 'I have a leak', 'Schedule maintenance'],
      };
    }
  }

  // 5. Build response — use LLM with tool data as context, but fall back
  //    to the tool's own message if the LLM returns a generic fallback.
  const toolContext = formatToolContext(intent, toolResult);
  let llmMessage = await generateResponse(message, role, toolContext, { apiKeyOverride: apiKey });

  // Detect if the LLM returned a generic fallback that ignores the tool result.
  // This happens when the API key is missing, the LLM call fails, or the
  // conversational fallback fires — all of which discard the tool context.
  const genericFallbackSignals = [
    "i'm specialized in plumbing dispatch",
    'specialized in plumbing',
    "i don't know much about other topics",
    'expert at pipes and drains',
    'is something going on at your place',
  ];
  const lowerLLM = llmMessage.toLowerCase();
  const isGenericFallback = genericFallbackSignals.some((sig) => lowerLLM.includes(sig));

  if (isGenericFallback && toolResult.success) {
    // The tool worked — use its own message instead of the irrelevant fallback
    llmMessage = buildResponseMessage(intent, toolResult);
  }

  // Strip hallucinated tool calls / code blocks that the LLM sometimes generates
  // (e.g. <tool_code>...</tool_code>, ```python...```, print(...))
  llmMessage = llmMessage
    .replace(/<tool_code>[\s\S]*?<\/tool_code>/gi, '')
    .replace(/<tool_code_output>[\s\S]*?<\/tool_code_output>/gi, '')
    .replace(/```(?:python|js|javascript|typescript)?\n[\s\S]*?```/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // If stripping left the message empty or too short, fall back to the tool message
  if (llmMessage.length < 10 && toolResult.success) {
    llmMessage = buildResponseMessage(intent, toolResult);
  }

  return {
    message: llmMessage,
    toolResult,
    intent,
    suggestedActions: getSuggestedActions(intent, role, toolResult),
  };
}

/**
 * Format tool result data into a context string for the LLM.
 * This gives the LLM the real data so it can craft a tailored response.
 */
function formatToolContext(intent: IntentType, result: ToolResult): string {
  const lines: string[] = [
    `Tool: ${result.toolName}`,
    `Success: ${result.success}`,
    `Intent: ${intent}`,
    `Raw result: ${result.message}`,
  ];

  // Include structured data so the LLM has the full picture
  if (result.data && Object.keys(result.data).length > 0) {
    lines.push(`Data: ${JSON.stringify(result.data, null, 2)}`);
  }

  lines.push('');
  lines.push('Instructions: Use the above data to craft your response. Present the information naturally in your dispatcher persona. Do not say "according to the database" — just present the info directly. If the tool failed, let the user know and suggest alternatives.');

  return lines.join('\n');
}

/**
 * Return contextual follow-up suggestions based on what just happened.
 */
function getSuggestedActions(intent: IntentType, role: UserRole, toolResult?: ToolResult): string[] {
  // For availability results, present time slots as booking chips
  if (intent === 'check_plumber_availability' && toolResult?.success) {
    const data = toolResult.data as Record<string, unknown>;
    const openSlots = (data.openSlots || []) as string[];
    if (openSlots.length > 0) {
      const date = (data.date as string) || 'next available';
      const slotChips = openSlots.slice(0, 3).map((time) => `Book ${date} at ${time}`);
      slotChips.push('Check another date');
      return slotChips;
    }
    return ['Check another date', 'I have a leak', 'Any plumbing tips?'];
  }

  // Lead capture: after reporting issues, nudge toward booking
  const leadCapture: Record<string, string[]> = {
    create_ticket: ['Check availability for next Tuesday', 'Show my tickets', 'Any plumbing tips?'],
    create_service_ticket: ['Check availability for next Tuesday', 'Show my tickets', 'Any plumbing tips?'],
  };

  const base: Record<string, string[]> = {
    ...leadCapture,
    query_tickets: ['I have a leak', 'Check availability for next Tuesday', 'Schedule a visit'],
    get_ticket_detail: ['Show my tickets', 'Schedule a visit'],
    schedule_appointment: ['Show my appointments', 'Any plumbing tips?'],
    query_appointments: ['Schedule a visit', 'Check availability for next Tuesday', 'Show my tickets'],
    get_newsletter: ['I have a leak', 'Schedule maintenance', 'When should I call a plumber?'],
    get_newsletter_advice: ['I have a leak', 'Schedule maintenance', 'When should I call a plumber?'],
    manage_users: ['Show all tickets', 'Show business metrics', 'Show all appointments'],
    generate_business_metrics: ['Show all tickets', 'Summarize user problems', 'Show all appointments'],
    summarize_ticket_problems: ['Show all tickets', 'Show business metrics', 'Show all users'],
    suggest_ticket_response: ['Summarize user problems', 'Show all tickets', 'Show business metrics'],
    update_ticket_status: ['Show my tickets', 'Show all tickets', 'Show business metrics'],
    assign_technician: ['Show all tickets', 'Show business metrics', 'Check availability'],
    general_help: [],
  };

  const suggestions = [...(base[intent] || [])];

  // Admin extras
  if (role === 'admin' && !suggestions.includes('Show business metrics') && intent !== 'generate_business_metrics') {
    suggestions.push('Show business metrics');
  }

  return suggestions.slice(0, 4);
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
      // Add value: tie in scheduling nudge
      return `${result.message}\n\n${getLeadCaptureNudge()}`;

    case 'create_service_ticket':
      // Lead capture: nudge toward booking after ticket creation
      return `${result.message}${getLeadCaptureNudge()}\n\n${getNewsletterTieIn('general')}`;

    case 'check_plumber_availability':
      // Present availability clearly — chips handle booking
      return result.message;

    case 'generate_business_metrics':
    case 'summarize_ticket_problems':
    case 'suggest_ticket_response':
      // Admin tools: pass through rich messages
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
      return `${result.message}\n\nOur team will review your issue shortly.${getLeadCaptureNudge()}\n\n${getNewsletterTieIn('general')}`;

    case 'update_ticket_status':
      return result.message;

    case 'assign_technician':
      return result.message;

    case 'query_appointments': {
      const items = Array.isArray(result.data) ? result.data : [];
      if (items.length === 0) return '📅 No appointments found.';
      const summary = items
        .map((a: Record<string, unknown>) => `• **${a.date}** at ${a.time} — ${a.serviceType} (${a.status})`)
        .join('\n');
      return `📅 **Appointments (${items.length}):**\n${summary}`;
    }

    case 'schedule_appointment':
      return `${result.message}\n\n✅ We'll send a confirmation once a technician is assigned.\n\n${getNewsletterTieIn('maintenance')}`;

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



