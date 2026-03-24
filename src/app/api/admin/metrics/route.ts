import { NextRequest, NextResponse } from 'next/server';
import { generateBusinessMetrics } from '@/mcp-server/mcp-tools';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dateFrom = searchParams.get('dateFrom') || undefined;
    const dateTo = searchParams.get('dateTo') || undefined;

    const result = await generateBusinessMetrics({ dateFrom, dateTo });

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json(result.data);
  } catch (error) {
    console.error('Admin metrics API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate metrics' },
      { status: 500 }
    );
  }
}
