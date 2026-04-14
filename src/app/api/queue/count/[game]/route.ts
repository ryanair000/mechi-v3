import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { GAMES } from '@/lib/config';
import type { GameKey } from '@/types';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ game: string }> }
) {
  const { game } = await params;

  if (!game || !GAMES[game as GameKey]) {
    return NextResponse.json({ error: 'Invalid game' }, { status: 400 });
  }

  try {
    const supabase = createServiceClient();

    const { count, error } = await supabase
      .from('queue')
      .select('*', { count: 'exact', head: true })
      .eq('game', game)
      .eq('status', 'waiting');

    if (error) {
      return NextResponse.json({ error: 'Failed to get count' }, { status: 500 });
    }

    return NextResponse.json({ count: count ?? 0, game });
  } catch (err) {
    console.error('[Queue Count] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
