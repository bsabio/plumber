'use client';

import { useChatContext } from '@/context/chat-context';
import { cn } from '@/lib/utils';

export default function SuggestionChips() {
  const { suggestions, sendMessage, isLoading } = useChatContext();

  if (!suggestions.length) return null;

  return (
    <div className="flex flex-wrap gap-2 px-2">
      {suggestions.map((chip, idx) => (
        <button
          key={`${chip}-${idx}`}
          onClick={() => sendMessage(chip)}
          disabled={isLoading}
          className={cn(
            'rounded-full border border-primary/30 bg-primary/10 px-4 py-2',
            'text-sm font-medium text-primary transition-all duration-200',
            'hover:bg-primary/20 hover:border-primary/50 hover:scale-[1.03]',
            'active:scale-[0.97]',
            'disabled:opacity-40 disabled:cursor-not-allowed',
            'animate-in fade-in slide-in-from-bottom-2',
          )}
          style={{ animationDelay: `${idx * 75}ms`, animationFillMode: 'both' }}
        >
          {chip}
        </button>
      ))}
    </div>
  );
}
