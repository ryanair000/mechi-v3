import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import { createServiceClient } from '@/lib/supabase';
import { CONFIRMED_PAYMENT_STATUSES } from '@/lib/tournament-metrics';
import {
  formatTournamentDateTime,
  getTournamentCheckInDate,
  parseTournamentSchedule,
} from '@/lib/tournament-schedule';

type TournamentCheckInRow = {
  id: string;
  title: string;
  status: string;
  scheduled_for: string | null;
};

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const access = await requireActiveAccessProfile(_request);
  if (access.response) {
    return access.response;
  }

  const { slug } = await params;
  const supabase = createServiceClient();

  try {
    const { data: tournamentRaw, error: tournamentError } = await supabase
      .from('tournaments')
      .select('id, title, status, scheduled_for')
      .eq('slug', slug)
      .single();

    const tournament = tournamentRaw as TournamentCheckInRow | null;
    if (tournamentError || !tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }

    if (!['open', 'full', 'active'].includes(tournament.status)) {
      return NextResponse.json(
        { error: 'Check-in is not available for this tournament' },
        { status: 400 }
      );
    }

    const scheduledAt = parseTournamentSchedule(tournament.scheduled_for);
    const checkInOpensAt = getTournamentCheckInDate(scheduledAt);
    if (checkInOpensAt && Date.now() < checkInOpensAt.getTime()) {
      return NextResponse.json(
        {
          error: `Check-in opens ${formatTournamentDateTime(checkInOpensAt, 'before kickoff')}`,
        },
        { status: 400 }
      );
    }

    const checkedInAt = new Date().toISOString();
    const { data: player, error: playerError } = await supabase
      .from('tournament_players')
      .update({
        check_in_status: 'checked_in',
        checked_in_at: checkedInAt,
      })
      .eq('tournament_id', tournament.id)
      .eq('user_id', access.profile.id)
      .in('payment_status', [...CONFIRMED_PAYMENT_STATUSES])
      .select('id, check_in_status, checked_in_at')
      .maybeSingle();

    if (playerError) {
      return NextResponse.json({ error: 'Could not check in' }, { status: 500 });
    }

    if (!player) {
      return NextResponse.json(
        { error: 'Join and confirm your slot before checking in' },
        { status: 404 }
      );
    }

    return NextResponse.json({ status: 'checked_in', player });
  } catch (error) {
    console.error('[Tournament CheckIn] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
