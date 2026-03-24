'use client';

import { useState, useRef, useEffect } from 'react';
import { useChatContext } from '@/context/chat-context';
import MessageBubble from '@/components/MessageBubble';
import SuggestionChips from '@/components/SuggestionChips';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface AdminChatProps {
  /** Pre-filled message from ticket click */
  prefillMessage?: string;
  onPrefillConsumed?: () => void;
}

export default function AdminChat({ prefillMessage, onPrefillConsumed }: AdminChatProps) {
  const { messages, isLoading, sendMessage, role } = useChatContext();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle prefill from ticket click
  useEffect(() => {
    if (prefillMessage) {
      sendMessage(prefillMessage);
      onPrefillConsumed?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefillMessage]);

  // Focus input
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

  const roleLabel = role === 'admin' ? 'Admin' : role === 'authenticated' ? 'Customer' : 'Guest';

  return (
    <Card className="glass border-border/40 flex flex-col h-full">
      <CardHeader className="pb-2 pt-3 px-4 border-b border-border/30">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <span>💬</span>
            <span>Operator Chat</span>
          </CardTitle>
          <Badge variant="secondary" className="text-xs">{roleLabel}</Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Ask to summarize problems, suggest responses, or run analytics
        </p>
      </CardHeader>

      {/* Messages */}
      <CardContent className="flex-1 p-0 overflow-hidden">
        <ScrollArea className="h-full custom-scrollbar">
          <div className="space-y-1 pb-4">
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
      </CardContent>

      {/* Chips */}
      <div className="py-2 px-2 border-t border-border/20">
        <SuggestionChips />
      </div>

      {/* Input */}
      <div className="p-3 pt-0 border-t border-border/20">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            id="admin-chat-input"
            placeholder="Summarize problems, suggest response..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            className="flex-1 h-10 bg-input/50 border-border/50 text-sm"
            autoComplete="off"
          />
          <Button
            id="admin-send-button"
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            size="sm"
            className="h-10 px-4 shadow-sm"
          >
            ➤
          </Button>
        </div>
      </div>
    </Card>
  );
}
