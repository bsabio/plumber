'use client';

import { useState, useRef, useEffect } from 'react';
import { useChatContext } from '@/context/chat-context';
import MessageBubble from './MessageBubble';
import SuggestionChips from './SuggestionChips';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function HeroChat() {
  const { messages, isLoading, sendMessage } = useChatContext();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on mount
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

  return (
    <div className="flex h-[calc(100vh-3.5rem-3rem)] flex-col pt-14 pb-12">
      {/* Chat header */}
      <div className="flex items-center justify-center py-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            <span className="bg-gradient-to-r from-primary via-blue-400 to-cyan-400 bg-clip-text text-transparent">
              Virtual Employee
            </span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your AI-powered plumbing assistant — available 24/7
          </p>
        </div>
      </div>

      {/* Messages area */}
      <ScrollArea className="flex-1 custom-scrollbar">
        <div className="mx-auto max-w-2xl space-y-1 pb-4">
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
          {isLoading && (
            <div className="flex gap-3 px-4 py-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/20 text-sm">
                🔧
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

      {/* Suggestion chips */}
      <div className="mx-auto w-full max-w-2xl py-3">
        <SuggestionChips />
      </div>

      {/* Input area */}
      <div className="mx-auto w-full max-w-2xl px-4 pb-2">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            id="hero-chat-input"
            placeholder="Describe your plumbing issue..."
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
              <span className="text-lg">➤</span>
            )}
          </Button>
        </div>
        <p className="mt-2 text-center text-[10px] text-muted-foreground/60">
          Powered by MCP · Drizzle ORM · Next.js
        </p>
      </div>
    </div>
  );
}
