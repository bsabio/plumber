/**
 * MCP Server Index — Registers all tools and resources for the Virtual Employee system.
 *
 * This module serves as the central registry of MCP capabilities.
 * Tools and resources are exported for use by the mediator.
 */

// Re-export legacy tools
export {
  queryTickets,
  getTicketDetail,
  createTicket,
  queryAppointments,
  scheduleAppointment,
  getNewsletter,
  manageUsers,
} from './tools';

// Re-export Zod-validated MCP tools
export {
  getNewsletterAdvice,
  createServiceTicket,
  checkPlumberAvailability,
  generateBusinessMetrics,
  MCP_TOOL_DEFINITIONS,
  // Zod schemas (for external consumers)
  GetNewsletterAdviceInputSchema,
  CreateServiceTicketInputSchema,
  CheckPlumberAvailabilityInputSchema,
  GenerateBusinessMetricsInputSchema,
} from './mcp-tools';

// Re-export resources
export { getLatestNewsletter, getFAQ } from './resources';

// Re-export auth
export { hasPermission, getAccessDeniedMessage, getAvailableTools } from './auth';

/**
 * MCP Tool Registry — describes the available tools for the system.
 */
export const TOOL_REGISTRY = [
  // ── Legacy tools ──
  {
    name: 'query_tickets',
    description: 'List and filter support tickets. Returns tickets for a user or all tickets (admin).',
    roles: ['authenticated', 'admin'],
    parameters: ['userId', 'status', 'isAdmin'],
  },
  {
    name: 'get_ticket_detail',
    description: 'Get detailed information about a specific ticket by ID.',
    roles: ['authenticated', 'admin'],
    parameters: ['ticketId'],
  },
  {
    name: 'create_ticket',
    description: 'Create a new support ticket for a plumbing issue.',
    roles: ['authenticated', 'admin'],
    parameters: ['userId', 'subject', 'description', 'priority'],
  },
  {
    name: 'query_appointments',
    description: 'List scheduled appointments. Returns user\'s appointments or all (admin).',
    roles: ['authenticated', 'admin'],
    parameters: ['userId', 'isAdmin'],
  },
  {
    name: 'schedule_appointment',
    description: 'Book a new plumbing service appointment.',
    roles: ['authenticated', 'admin'],
    parameters: ['userId', 'date', 'time', 'serviceType', 'notes', 'address'],
  },
  {
    name: 'get_newsletter',
    description: 'Fetch newsletter content, tips, FAQs, and promotions.',
    roles: ['anon', 'authenticated', 'admin'],
    parameters: ['category'],
  },
  {
    name: 'manage_users',
    description: 'List or get details about system users.',
    roles: ['admin'],
    parameters: ['action', 'userId'],
  },
  // ── Zod-validated MCP tools ──
  {
    name: 'get_newsletter_advice',
    description: 'Queries the SQLite database for plumbing tips/articles from the newsletter to provide expert context in chat.',
    roles: ['anon', 'authenticated', 'admin'],
    parameters: ['topic', 'category', 'limit'],
    validated: true,
  },
  {
    name: 'create_service_ticket',
    description: 'Takes user problem description, urgency level, and contact info to create a row in the tickets table.',
    roles: ['authenticated', 'admin'],
    parameters: ['problemDescription', 'urgencyLevel', 'contactName', 'contactEmail', 'contactPhone', 'address'],
    validated: true,
  },
  {
    name: 'check_plumber_availability',
    description: 'Checks the appointments table for open time slots on a given date.',
    roles: ['authenticated', 'admin'],
    parameters: ['date', 'serviceType'],
    validated: true,
  },
  {
    name: 'generate_business_metrics',
    description: '(Admin Only) Returns a JSON object of ticket statuses (Open vs. Closed) formatted for a Shadcn/Recharts graph.',
    roles: ['admin'],
    parameters: ['dateFrom', 'dateTo'],
    validated: true,
  },
] as const;
