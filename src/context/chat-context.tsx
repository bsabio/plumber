'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import type { ChatMessage, UserRole, ChatResponse } from '@/lib/types';

/* ── Context shape ── */
interface ChatContextValue {
  messages: ChatMessage[];
  role: UserRole;
  setRole: (role: UserRole) => void;
  isLoading: boolean;
  suggestions: string[];
  sendMessage: (text: string) => Promise<void>;
  isExpanded: boolean;
  setIsExpanded: (v: boolean) => void;
}

const ChatContext = createContext<ChatContextValue | null>(null);

/* ── Default suggestions per role (dispatcher-focused) ── */
function getDefaultSuggestions(role: UserRole): string[] {
  switch (role) {
    case 'anon':
      return [
        'I have a leak',
        'My drain is clogged',
        'Schedule maintenance',
      ];
    case 'authenticated':
      return [
        'I have a leak',
        'Schedule a visit',
        'Check availability for next Tuesday',
        'Show my tickets',
      ];
    case 'admin':
      return [
        'Summarize user problems',
        'Show business metrics',
        'Show all tickets',
        'Check availability for next Monday',
      ];
  }
}

/* ── Welcome messages (dispatcher persona) ── */
function getWelcomeMessage(role: UserRole): string {
  switch (role) {
    case 'anon':
      return (
        '🔧 **Pipe Dream Plumbing — Dispatch**\n\n' +
        'Hey there! I\'m your virtual dispatcher. Tell me what\'s going on — ' +
        'leaking pipe, clogged drain, or just need a checkup — and I\'ll get you sorted fast.\n\n' +
        'What\'s the issue?'
      );
    case 'authenticated':
      return (
        '🔧 **Welcome back!** Pipe Dream Dispatch here.\n\n' +
        'Need to report a problem, check on a ticket, or book a technician? ' +
        'Just tell me what you need and I\'ll handle it.\n\n' +
        'What can I help with today?'
      );
    case 'admin':
      return (
        '⚡ **Operator Cockpit** — Dispatch ready.\n\n' +
        'You\'ve got full access. I can summarize open problems, draft customer responses, ' +
        'pull business metrics, or manage scheduling.\n\n' +
        'What do you need?'
      );
  }
}

/* ── Provider ── */
export function ChatProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<UserRole>('anon');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>(getDefaultSuggestions('anon'));
  const [isExpanded, setIsExpanded] = useState(false);

  // On role change — reset chat + suggestions
  const setRole = useCallback((newRole: UserRole) => {
    setRoleState(newRole);
    setSuggestions(getDefaultSuggestions(newRole));
    const welcome: ChatMessage = {
      id: `welcome-${newRole}-${Date.now()}`,
      role: 'assistant',
      content: getWelcomeMessage(newRole),
      timestamp: new Date().toISOString(),
    };
    setMessages([welcome]);
  }, []);

  // Send message via /api/chat
  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isLoading) return;

      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: trimmed,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setIsLoading(true);

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: trimmed, role }),
        });
        const data: ChatResponse = await res.json();

        const assistantMsg: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: data.message,
          timestamp: new Date().toISOString(),
          toolResult: data.toolResult,
        };
        setMessages((prev) => [...prev, assistantMsg]);

        // Update suggestions from server (dynamic chips)
        if (data.suggestedActions && data.suggestedActions.length > 0) {
          setSuggestions(data.suggestedActions);
        }
      } catch {
        const errMsg: ChatMessage = {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: '⚠️ Sorry, something went wrong. Please try again.',
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, errMsg]);
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, role]
  );

  // Initialise with welcome message on first mount
  useState(() => {
    const welcome: ChatMessage = {
      id: `welcome-anon-init`,
      role: 'assistant',
      content: getWelcomeMessage('anon'),
      timestamp: new Date().toISOString(),
    };
    setMessages([welcome]);
  });

  return (
    <ChatContext.Provider
      value={{
        messages,
        role,
        setRole,
        isLoading,
        suggestions,
        sendMessage,
        isExpanded,
        setIsExpanded,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

/* ── Hook ── */
export function useChatContext() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChatContext must be used within ChatProvider');
  return ctx;
}
