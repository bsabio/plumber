import { NextRequest, NextResponse } from 'next/server';
import { mediate } from '@/lib/mediator';
import type { ChatRequest, UserRole } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json();

    // Validate required fields
    if (!body.message || typeof body.message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required and must be a string.' },
        { status: 400 }
      );
    }

    // Validate role
    const validRoles: UserRole[] = ['anon', 'authenticated', 'admin'];
    const role: UserRole = validRoles.includes(body.role) ? body.role : 'anon';

    // Send through the mediator
    const response = await mediate(body.message, role, body.userId);

    return NextResponse.json(response);
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Something went wrong processing your request. Please try again.',
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'Pipe Dream Plumbing — Virtual Employee API',
    version: '1.0.0',
    endpoints: {
      chat: 'POST /api/chat — Send a chat message',
    },
  });
}
