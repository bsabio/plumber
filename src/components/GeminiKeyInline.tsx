'use client';

import { useEffect, useState } from 'react';
import { useChatContext } from '@/context/chat-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface GeminiKeyInlineProps {
  className?: string;
}

export default function GeminiKeyInline({ className }: GeminiKeyInlineProps) {
  const { apiKey, setApiKey } = useChatContext();
  const [open, setOpen] = useState(false);
  const [draftKey, setDraftKey] = useState(apiKey ?? '');
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    setDraftKey(apiKey ?? '');
  }, [apiKey]);

  const handleSave = () => {
    setApiKey(draftKey.trim());
  };

  const handleClear = () => {
    setDraftKey('');
    setApiKey('');
  };

  const hasKey = !!apiKey && apiKey.trim().length > 0;
  const isDirty = (draftKey ?? '').trim() !== (apiKey ?? '').trim();

  return (
    <div className={cn('rounded-lg border border-border/40 bg-card/40 p-3', className)}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium">Gemini API key</span>
          <Badge variant={hasKey ? 'secondary' : 'outline'}>
            {hasKey ? 'Saved locally' : 'Not set'}
          </Badge>
        </div>
        <Button
          size="xs"
          variant="ghost"
          onClick={() => setOpen((prev) => !prev)}
        >
          {open ? 'Hide' : 'Set key'}
        </Button>
      </div>

      {open && (
        <div className="mt-3 space-y-2">
          <div className="flex gap-2">
            <Input
              type={showKey ? 'text' : 'password'}
              value={draftKey}
              onChange={(e) => setDraftKey(e.target.value)}
              placeholder="AIza..."
              autoComplete="off"
              className="flex-1"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowKey((prev) => !prev)}
              className="shrink-0"
            >
              {showKey ? 'Hide' : 'Show'}
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handleSave} disabled={!isDirty}>
              Save
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleClear}
              disabled={!draftKey}
            >
              Clear
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Stored in this browser and sent only with your chat requests.
          </p>
        </div>
      )}
    </div>
  );
}
