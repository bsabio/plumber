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
