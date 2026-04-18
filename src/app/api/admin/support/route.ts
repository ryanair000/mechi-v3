import { NextRequest, NextResponse } from 'next/server';
import { getRequestAccessProfile, hasModeratorAccess } from '@/lib/access';
import { getSupportThreadList } from '@/lib/support-inbox';
import type { SupportThreadStatus } from '@/types';

function parseStatus(value: string | null): SupportThreadStatus | 'all' {
  if (
    value === 'open' ||
    value === 'waiting_on_ai' ||
    value === 'waiting_on_human' ||
    value === 'resolved' ||
    value === 'blocked'
  ) {
    return value;
  }

  return 'all';
}

export async function GET(request: NextRequest) {
  const user = await getRequestAccessProfile(request);
  if (!user || !hasModeratorAccess(user) || user.is_banned) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { searchParams } = request.nextUrl;
    const status = parseStatus(searchParams.get('status'));
    const query = searchParams.get('q');
    const limit = Math.min(Math.max(Number(searchParams.get('limit') ?? '40'), 1), 100);
    const offset = Math.max(Number(searchParams.get('offset') ?? '0'), 0);

    const result = await getSupportThreadList({
      status,
      query,
      limit,
      offset,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('[Admin Support GET] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
