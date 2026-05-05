'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function LoginPage() {
  return (
    <div className="flex min-h-[calc(100vh-3.5rem-3rem)] items-center justify-center pt-14 pb-12 px-4">
      <Card className="w-full max-w-md glass border-border/40">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-3xl">
            🔧
          </div>
          <CardTitle className="text-2xl font-bold">
            <span className="bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
              Sign In
            </span>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Access your Pipe Dream Plumbing account
          </p>
          <Badge variant="secondary" className="mx-auto">
            🧪 Demo — use the role switcher below
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            className="w-full h-11 shadow-md shadow-primary/20"
            size="lg"
            onClick={() => {
              window.location.href = '/api/auth/google';
            }}
          >
            Continue with Google
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            You will be redirected to Google to complete sign-in.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
