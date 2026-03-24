'use client';

import type { ChatMessage } from '@/lib/types';
import ToolResultCard from './ToolResultCard';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface MessageBubbleProps {
  message: ChatMessage;
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div
      className={cn(
        'flex gap-3 px-4 py-2 animate-in fade-in slide-in-from-bottom-2 duration-300',
        isUser ? 'flex-row-reverse' : 'flex-row',
      )}
    >
      {/* Avatar */}
      <Avatar className="h-8 w-8 shrink-0 shadow-md">
        <AvatarFallback
          className={cn(
            'text-sm',
            isUser
              ? 'bg-primary/20 text-primary'
              : 'bg-blue-500/20 text-blue-400',
          )}
        >
          {isUser ? '👤' : '🔧'}
        </AvatarFallback>
      </Avatar>

      {/* Bubble */}
      <div
        className={cn(
          'max-w-[80%] rounded-2xl px-4 py-3 shadow-sm',
          isUser
            ? 'bg-primary text-primary-foreground rounded-br-md'
            : 'bg-card border border-border/50 rounded-bl-md',
        )}
      >
        {/* Content */}
        <div className="text-sm leading-relaxed space-y-1">
          {message.content.split('\n').map((line, idx) => {
            const parts = line.split(/(\*\*.*?\*\*)/g);
            return (
              <p key={idx}>
                {parts.map((part, pIdx) => {
                  if (part.startsWith('**') && part.endsWith('**')) {
                    return (
                      <strong key={pIdx} className="font-semibold">
                        {part.slice(2, -2)}
                      </strong>
                    );
                  }
                  return <span key={pIdx}>{part}</span>;
                })}
              </p>
            );
          })}
        </div>

        {/* Tool result */}
        {message.toolResult && (
          <div className="mt-3">
            <ToolResultCard result={message.toolResult} />
          </div>
        )}

        {/* Timestamp */}
        <p
          className={cn(
            'mt-1.5 text-[10px]',
            isUser ? 'text-primary-foreground/60' : 'text-muted-foreground',
          )}
        >
          {new Date(message.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </div>
    </div>
  );
}
