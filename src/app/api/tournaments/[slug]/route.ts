import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase';
import { CONFIRMED_PAYMENT_STATUSES, mapTournamentMatchRelations } from '@/lib/tournaments';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const authUser = getAuthUser(request);

  try {
    const supabase = createServiceClient();
    const { data: tournament, error } = await supabase
      .from('tournaments')
      .select('*, organizer:organizer_id(id, username, email), winner:winner_id(id, username)')
      .eq('slug', slug)
      .single();

    if (error || !tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }

    const { data: players } = await supabase
      .from('tournament_players')
      .select('*, user:user_id(id, username, email, phone)')
      .eq('tournament_id', tournament.id)
      .order('joined_at', { ascending: true });

    const { data: matches } = await supabase
      .from('tournament_matches')
      .select('*, player1:player1_id(id, username), player2:player2_id(id, username), winner:winner_id(id, username)')
      .eq('tournament_id', tournament.id)
      .order('round', { ascending: true })
      .order('slot', { ascending: true });

    const playerRows = players ?? [];
    const confirmedCount = playerRows.filter((player) =>
      CONFIRMED_PAYMENT_STATUSES.includes(
        player.payment_status as (typeof CONFIRMED_PAYMENT_STATUSES)[number]
      )
    ).length;
    const viewerPlayer = authUser
      ? playerRows.find((player) => player.user_id === authUser.sub) ?? null
      : null;

    return NextResponse.json({
      tournament: {
        ...tournament,
        confirmed_count: confirmedCount,
        slots_left: Math.max(0, tournament.size - confirmedCount),
      },
      players: playerRows,
      matches: (matches ?? []).map(mapTournamentMatchRelations),
      viewer: {
        joined: Boolean(viewerPlayer),
        isOrganizer: authUser?.sub === tournament.organizer_id,
        paymentStatus: viewerPlayer?.payment_status ?? null,
      },
    });
  } catch (err) {
    console.error('[Tournament GET] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
