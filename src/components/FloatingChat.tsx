'use client';

import { useState, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useChatContext } from '@/context/chat-context';
import MessageBubble from './MessageBubble';
import SuggestionChips from './SuggestionChips';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export default function FloatingChat() {
  const pathname = usePathname();
  const { messages, isLoading, sendMessage, role } = useChatContext();
  const [input, setInput] = useState('');
  const [open, setOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ALL hooks must be called before any early return (Rules of Hooks)
  const isHome = pathname === '/';

  useEffect(() => {
    if (!isHome && open) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [messages, open, isHome]);

  useEffect(() => {
    if (!isHome && open) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [open, isHome]);

  // Don't render on home page (hero chat is there)
  if (isHome) return null;

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

  const roleLabel = role === 'anon' ? 'Guest' : role === 'authenticated' ? 'Customer' : 'Admin';

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {/* FAB button */}
      <SheetTrigger
        className={cn(
          'fixed bottom-16 right-6 z-40',
          'flex h-14 w-14 items-center justify-center',
          'rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30',
          'transition-all duration-300 hover:scale-110 hover:shadow-xl hover:shadow-primary/40',
          'active:scale-95',
        )}
      >
        <span className="text-2xl">💬</span>
        {messages.length > 1 && (
          <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-green-500 border-2 border-background animate-pulse" />
        )}
      </SheetTrigger>

      {/* Chat panel */}
      <SheetContent
        side="right"
        className="w-full sm:w-[420px] p-0 flex flex-col bg-background border-l border-border/50"
        showCloseButton={true}
      >
        <SheetHeader className="p-4 pb-3 border-b border-border/30 glass">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2 text-base">
              <span>🔧</span>
              <span className="bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent font-bold">
                Pipe Dream Plumbing
              </span>
            </SheetTitle>
            <Badge variant="secondary" className="text-xs">{roleLabel}</Badge>
          </div>
          <p className="text-xs text-muted-foreground">Virtual Employee Assistant</p>
        </SheetHeader>

        {/* Messages */}
        <ScrollArea className="flex-1 custom-scrollbar">
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

        {/* Chips */}
        <div className="py-2 px-2">
          <SuggestionChips />
        </div>

        {/* Input */}
        <div className="p-3 pt-0 border-t border-border/30">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              id="floating-chat-input"
              placeholder="Ask me anything..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              className="flex-1 h-10 bg-input/50 border-border/50 text-sm"
              autoComplete="off"
            />
            <Button
              id="floating-send-button"
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              size="sm"
              className="h-10 px-4 shadow-sm"
            >
              ➤
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
