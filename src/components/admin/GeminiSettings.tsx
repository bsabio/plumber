'use client';

import { useState } from 'react';
import { useChatContext } from '@/context/chat-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export default function GeminiSettings() {
  const { hasApiKey, setApiKey } = useChatContext();
  const [draftKey, setDraftKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const trimmed = draftKey.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      await setApiKey(trimmed);
      setDraftKey('');
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    setSaving(true);
    try {
      await setApiKey('');
      setDraftKey('');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="glass border-border/40">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">Gemini API Key</CardTitle>
          <Badge variant={hasApiKey ? 'secondary' : 'outline'}>
            {hasApiKey ? 'Configured ✓' : 'Not configured'}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Store your key on the server (encrypted with the session secret) to enable live Gemini responses.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <Input
              type={showKey ? 'text' : 'password'}
              value={draftKey}
              onChange={(e) => setDraftKey(e.target.value)}
              placeholder={hasApiKey ? 'Enter a new key to replace…' : 'AIza...'}
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
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!draftKey.trim() || saving}
            >
              Save key
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleClear}
              disabled={!hasApiKey || saving}
              className={cn(!hasApiKey && 'pointer-events-none')}
            >
              Clear
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          The key is encrypted with AES-256-GCM using your auth secret and stored in an HttpOnly cookie. It is never sent back to the browser.
        </p>
      </CardContent>
    </Card>
  );
}
