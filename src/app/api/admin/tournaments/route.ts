import { NextRequest, NextResponse } from 'next/server';
import { getRequestAccessProfile, hasModeratorAccess } from '@/lib/access';
import { createServiceClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const user = await getRequestAccessProfile(request);
  if (!user || !hasModeratorAccess(user) || user.is_banned) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = Math.min(Math.max(Number(searchParams.get('limit') ?? 50), 1), 100);
    const offset = Math.max(Number(searchParams.get('offset') ?? 0), 0);
    const supabase = createServiceClient();

    let query = supabase
      .from('tournaments')
      .select(
        'id, slug, title, game, platform, region, size, entry_fee, prize_pool, platform_fee, status, created_at, started_at, ended_at, organizer:organizer_id(id, username), winner:winner_id(id, username)'
      )
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status && status !== 'all') query = query.eq('status', status);

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: 'Failed to fetch tournaments' }, { status: 500 });
    }

    const tournaments = (data ?? []) as Array<Record<string, unknown> & { id: string }>;
    if (!tournaments.length) {
      return NextResponse.json({ tournaments: [] });
    }

    const tournamentIds = tournaments.map((tournament) => tournament.id);
    const { data: players, error: playersError } = await supabase
      .from('tournament_players')
      .select('tournament_id')
      .in('tournament_id', tournamentIds)
      .in('payment_status', ['paid', 'free']);

    if (playersError) {
      return NextResponse.json({ error: 'Failed to fetch tournaments' }, { status: 500 });
    }

    const playerCounts = (players ?? []).reduce<Record<string, number>>((counts, player) => {
      const tournamentId = player.tournament_id as string | undefined;
      if (!tournamentId) return counts;
      counts[tournamentId] = (counts[tournamentId] ?? 0) + 1;
      return counts;
    }, {});

    return NextResponse.json({
      tournaments: tournaments.map((tournament) => ({
        ...tournament,
        player_count: playerCounts[tournament.id] ?? 0,
      })),
    });
  } catch (err) {
    console.error('[Admin Tournaments] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
