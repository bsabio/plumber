'use client';

import { useEffect, useState } from 'react';
import { useChatContext } from '@/context/chat-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export default function GeminiSettings() {
  const { apiKey, setApiKey } = useChatContext();
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
    <Card className="glass border-border/40">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">Gemini API Key</CardTitle>
          <Badge variant={hasKey ? 'secondary' : 'outline'}>
            {hasKey ? 'Saved locally' : 'Not set'}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Store your key in this browser to enable live Gemini responses when running online.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-col gap-2">
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
              Save key
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleClear}
              disabled={!draftKey}
              className={cn(!draftKey && 'pointer-events-none')}
            >
              Clear
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          The key is stored in local storage and sent only with your chat requests. Reload the page if you switch accounts.
        </p>
      </CardContent>
    </Card>
  );
}
