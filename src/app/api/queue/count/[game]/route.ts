import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { GAMES } from '@/lib/config';
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

    let query = supabase
      .from('queue')
      .select('*', { count: 'exact', head: true })
      .eq('game', game)
      .eq('status', 'waiting');

    if (platform) {
      query = query.eq('platform', platform);
    }

    const { count, error } = await query;

    if (error) {
      return NextResponse.json({ error: 'Failed to get count' }, { status: 500 });
    }

    return NextResponse.json({ count: count ?? 0, game });
  } catch (err) {
    console.error('[Queue Count] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
