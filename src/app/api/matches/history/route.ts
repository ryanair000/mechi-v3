import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import { createServiceClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) {
    return access.response;
  }

  const authUser = access.profile;

  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '20'), 50);
    const offset = parseInt(searchParams.get('offset') ?? '0');

    const supabase = createServiceClient();

    const { data: matches, error } = await supabase
      .from('matches')
      .select('*')
      .or(`player1_id.eq.${authUser.id},player2_id.eq.${authUser.id}`)
      .in('status', ['completed', 'disputed', 'cancelled'])
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch matches' }, { status: 500 });
    }

    if (!matches || matches.length === 0) {
      return NextResponse.json({ matches: [] });
    }

    // Collect all unique player IDs
    const playerIds = [...new Set(matches.flatMap((m: { player1_id: string; player2_id: string }) => [m.player1_id, m.player2_id]))];

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, game_ids, platforms')
      .in('id', playerIds);

    const profileMap = Object.fromEntries(
      (profiles ?? []).map((p: { id: string; username: string; game_ids: Record<string, string>; platforms: string[] }) => [p.id, p])
    );

    const enriched = matches.map((m: { player1_id: string; player2_id: string }) => ({
      ...m,
      player1: profileMap[m.player1_id] ?? null,
      player2: profileMap[m.player2_id] ?? null,
    }));

    return NextResponse.json({ matches: enriched });
  } catch (err) {
    console.error('[Match History] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
