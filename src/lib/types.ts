// ── Shared Types for the Virtual Employee System ──

export type UserRole = 'anon' | 'authenticated' | 'admin';

export type IntentType =
  | 'query_tickets'
  | 'create_ticket'
  | 'get_ticket_detail'
  | 'query_appointments'
  | 'schedule_appointment'
  | 'get_newsletter'
  | 'manage_users'
  | 'get_newsletter_advice'
  | 'create_service_ticket'
  | 'check_plumber_availability'
  | 'generate_business_metrics'
  | 'general_help';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  toolResult?: ToolResult;
}

export interface ToolResult {
  toolName: string;
  success: boolean;
  data: Record<string, unknown> | Record<string, unknown>[];
  message: string;
}

export interface ChatRequest {
  message: string;
  role: UserRole;
  userId?: string;
}

export interface ChatResponse {
  message: string;
  toolResult?: ToolResult;
  intent: IntentType;
}

// Role permission map
export const ROLE_PERMISSIONS: Record<UserRole, IntentType[]> = {
  anon: ['get_newsletter', 'get_newsletter_advice', 'general_help'],
  authenticated: [
    'get_newsletter',
    'get_newsletter_advice',
    'general_help',
    'query_tickets',
    'create_ticket',
    'create_service_ticket',
    'get_ticket_detail',
    'query_appointments',
    'schedule_appointment',
    'check_plumber_availability',
  ],
  admin: [
    'get_newsletter',
    'get_newsletter_advice',
    'general_help',
    'query_tickets',
    'create_ticket',
    'create_service_ticket',
    'get_ticket_detail',
    'query_appointments',
    'schedule_appointment',
    'check_plumber_availability',
    'manage_users',
    'generate_business_metrics',
  ],
};
