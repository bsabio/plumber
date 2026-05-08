'use client';

import { useState, useRef, useEffect } from 'react';
import { useChatContext } from '@/context/chat-context';
import MessageBubble from './MessageBubble';
import GeminiKeyInline from '@/components/GeminiKeyInline';
import CalendarScheduler from '@/components/CalendarScheduler';
import { TicketIcon, CalendarIcon, ResolveIcon, SendIcon, WrenchIcon } from '@/components/Icons';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// ── Core actions — the three things this app is built to do ──
const CORE_ACTIONS = [
  {
    id: 'create',
    Icon: TicketIcon,
    title: 'Create a Ticket',
    description: 'Report a plumbing issue and log it as a support ticket in the system.',
    color: 'border-orange-300 bg-orange-50 hover:bg-orange-100',
    iconColor: 'text-[#d4651a]',
    prompt: 'I have a plumbing emergency — my pipe is leaking under the kitchen sink at 123 Main St. High urgency.',
  },
  {
    id: 'schedule',
    Icon: CalendarIcon,
    title: 'Schedule an Appointment',
    description: 'Book a technician visit and check available time slots.',
    color: 'border-green-300 bg-green-50 hover:bg-green-100',
    iconColor: 'text-[#3a7d4c]',
    prompt: 'Schedule a plumbing service appointment for tomorrow morning. Check what slots are available.',
  },
  {
    id: 'resolve',
    Icon: ResolveIcon,
    title: 'Resolve a Ticket',
    description: 'Mark an open support ticket as resolved once the issue is fixed.',
    color: 'border-amber-300 bg-amber-50 hover:bg-amber-100',
    iconColor: 'text-[#c49a3c]',
    prompt: 'Show my open tickets and mark the most recent one as resolved.',
  },
];

export default function HeroChat() {
  const { messages, isLoading, sendMessage } = useChatContext();
  const [input, setInput] = useState('');
  const [showCalendar, setShowCalendar] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Only show hero cards when chat only has the welcome message
  const showHero = messages.length <= 1;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    sendMessage(input.trim());
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const prefill = (prompt: string) => {
    setInput(prompt);
    inputRef.current?.focus();
  };

  const handleCoreAction = (action: typeof CORE_ACTIONS[number]) => {
    if (action.id === 'schedule') {
      setShowCalendar(true);
    } else {
      prefill(action.prompt);
    }
  };

  return (
    <div className="flex h-[calc(100vh-3.5rem-3rem)] flex-col pt-14 pb-12">
      {/* Calendar modal */}
      {showCalendar && <CalendarScheduler onClose={() => setShowCalendar(false)} />}

      {/* ── Chat header ── */}
      <div className="flex items-center justify-center py-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl text-[#d4651a]">
              Virtual Dispatcher
            </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            AI-powered plumbing support — create tickets, schedule visits, resolve issues
          </p>
        </div>
      </div>

      {/* ── Core action cards (only on empty chat) ── */}
      {showHero && (
        <div className="mx-auto w-full max-w-2xl px-4 pb-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground/60">
            Core Functions
          </p>
          <div className="grid grid-cols-3 gap-3">
            {CORE_ACTIONS.map((action) => (
              <button
                key={action.id}
                id={`core-action-${action.id}`}
                onClick={() => handleCoreAction(action)}
                disabled={isLoading}
                className={`group relative flex flex-col gap-2 rounded-lg border p-4 text-left transition-all duration-150 disabled:opacity-40 ${action.color}`}
              >
                <action.Icon size={22} className={action.iconColor} />
                <span className="text-sm font-semibold leading-tight text-foreground">
                  {action.title}
                </span>
                <span className="text-[11px] leading-snug text-muted-foreground">
                  {action.description}
                </span>
                <span className="mt-auto text-[11px] font-semibold text-[#d4651a] opacity-0 transition-opacity group-hover:opacity-100">
                  Try it
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Messages area ── */}
      <ScrollArea className="flex-1 custom-scrollbar">
        <div className="mx-auto max-w-2xl space-y-1 pb-4">
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
          {isLoading && (
            <div className="flex gap-3 px-4 py-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#e8f5ec]">
                <WrenchIcon size={14} className="text-[#3a7d4c]" />
              </div>
              <div className="rounded-2xl rounded-bl-md bg-card border border-border/50 px-4 py-3">
                <div className="flex gap-1.5">
                  <span className="typing-dot h-2 w-2 rounded-full bg-muted-foreground/60" />
                  <span className="typing-dot h-2 w-2 rounded-full bg-muted-foreground/60" />
                  <span className="typing-dot h-2 w-2 rounded-full bg-muted-foreground/60" />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* ── Quick action chips (after chat starts) ── */}
      {!showHero && (
        <div className="mx-auto w-full max-w-2xl px-4 pb-2">
          <div className="flex flex-wrap gap-2">
            {CORE_ACTIONS.map((action) => (
              <button
                key={action.id}
                onClick={() => handleCoreAction(action)}
                disabled={isLoading}
                className="flex items-center gap-1.5 rounded-full border border-[#d9cec2] bg-[#f4ede4] px-3 py-1.5 text-xs font-medium text-[#2c2416] transition-all hover:bg-[#e8ddd0] disabled:opacity-40"
              >
                <action.Icon size={13} className={action.iconColor} />
                {action.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Gemini API key ── */}
      <div className="mx-auto w-full max-w-2xl px-4">
        <GeminiKeyInline />
      </div>

      {/* ── Input area ── */}
      <div className="mx-auto w-full max-w-2xl px-4 pb-2">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            id="hero-chat-input"
            placeholder="Describe your issue, or click a core function above…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            className="flex-1 h-11 bg-input/50 border-border/50 focus-visible:ring-primary/50"
            autoComplete="off"
          />
          <Button
            id="hero-send-button"
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            size="default"
            className="h-11 px-5 shadow-md shadow-primary/20"
          >
            {isLoading ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
            ) : (
              <SendIcon size={16} className="text-white" />
            )}
          </Button>
        </div>
        <p className="mt-2 text-center text-[10px] text-muted-foreground/60">
          MCP Tools: create_ticket · schedule_appointment · update_ticket_status
        </p>
      </div>
    </div>
  );
}
