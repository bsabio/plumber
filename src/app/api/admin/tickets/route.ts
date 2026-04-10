import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { tickets } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    let results;
    if (status && ['open', 'in_progress', 'resolved', 'closed'].includes(status)) {
      results = db
        .select()
        .from(tickets)
        .where(eq(tickets.status, status as 'open' | 'in_progress' | 'resolved' | 'closed'))
        .orderBy(desc(tickets.createdAt))
        .all();
    } else {
      results = db.select().from(tickets).orderBy(desc(tickets.createdAt)).all();
    }

    return NextResponse.json({ tickets: results, total: results.length });
  } catch (error) {
    console.error('Admin tickets API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tickets' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { ticketId, newStatus } = body;

    // Validate input
    if (!ticketId || typeof ticketId !== 'string') {
      return NextResponse.json(
        { error: 'ticketId is required' },
        { status: 400 }
      );
    }

    const validStatuses = ['open', 'in_progress', 'resolved', 'closed'];
    if (!newStatus || !validStatuses.includes(newStatus)) {
      return NextResponse.json(
        { error: `newStatus must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    // Check ticket exists
    const existing = db
      .select()
      .from(tickets)
      .where(eq(tickets.id, ticketId))
      .get();

    if (!existing) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      );
    }

    // Update
    const now = new Date().toISOString();
    db.update(tickets)
      .set({
        status: newStatus as 'open' | 'in_progress' | 'resolved' | 'closed',
        updatedAt: now,
      })
      .where(eq(tickets.id, ticketId))
      .run();

    return NextResponse.json({
      success: true,
      ticketId,
      previousStatus: existing.status,
      newStatus,
      updatedAt: now,
    });
  } catch (error) {
    console.error('Admin ticket update error:', error);
    return NextResponse.json(
      { error: 'Failed to update ticket' },
      { status: 500 }
    );
  }
}
