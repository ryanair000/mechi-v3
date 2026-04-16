import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { GAMES } from '@/lib/config';
import { isMissingColumnError } from '@/lib/db-compat';
import type { GameKey } from '@/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ game: string }> }
) {
  const { game } = await params;
  const { searchParams } = new URL(request.url);
  const platform = searchParams.get('platform');

  if (!game || !GAMES[game as GameKey]) {
    return NextResponse.json({ error: 'Invalid game' }, { status: 400 });
  }

  try {
    const supabase = createServiceClient();

    const buildCountQuery = () =>
      supabase
      .from('queue')
      .select('id', { count: 'exact' })
      .eq('game', game)
      .eq('status', 'waiting')
      .limit(1);

    let query = buildCountQuery();
    if (platform) {
      query = query.eq('platform', platform);
    }

    let { count, error } = await query;

    if (error && platform && isMissingColumnError(error, 'queue.platform')) {
      ({ count, error } = await buildCountQuery());
    }

    if (error) {
      console.error('[Queue Count] Query error:', error);
      return NextResponse.json({ count: 0, game, degraded: true }, { status: 200 });
    }

    return NextResponse.json({ count: count ?? 0, game });
  } catch (err) {
    console.error('[Queue Count] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
