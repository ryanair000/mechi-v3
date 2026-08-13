import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import { createNotifications } from '@/lib/notifications';
import { createServiceClient } from '@/lib/supabase';
import { getTeamOperationErrorMessage } from '@/lib/team-roster';
import {
  formatTournamentDateTime,
  getTournamentCheckInDate,
  parseTournamentSchedule,
} from '@/lib/tournament-schedule';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) return access.response;
  const { slug } = await params;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const teamId = String(body.team_id ?? '');
  if (!teamId) {
    return NextResponse.json({ error: 'Choose the team to check in.' }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data: tournament } = await supabase
    .from('tournaments')
    .select('id, title, status, scheduled_for, participant_mode')
    .eq('slug', slug)
    .maybeSingle();
  if (!tournament || tournament.participant_mode !== 'team') {
    return NextResponse.json({ error: 'Team tournament not found.' }, { status: 404 });
  }
  const scheduledAt = parseTournamentSchedule(tournament.scheduled_for);
  const opensAt = getTournamentCheckInDate(scheduledAt);
  if (opensAt && Date.now() < opensAt.getTime()) {
    return NextResponse.json(
      { error: `Team check-in opens ${formatTournamentDateTime(opensAt, 'before kickoff')}` },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .rpc('check_in_team_tournament', {
      p_tournament_id: tournament.id,
      p_team_id: teamId,
      p_actor_id: access.profile.id,
    })
    .single();
  if (error || !data) {
    const message = getTeamOperationErrorMessage(error);
    return NextResponse.json(
      { error: message },
      { status: error?.code === '42883' ? 503 : message.includes('Only') ? 403 : 409 }
    );
  }

  const { data: entry } = await supabase
    .from('tournament_team_entries')
    .select('roster_snapshot')
    .eq('id', (data as { entry_id: string }).entry_id)
    .single();
  const players =
    ((entry?.roster_snapshot as { players?: Array<{ user_id?: string }> } | null)?.players ?? []);
  await createNotifications(
    [
      ...new Set(players.map((player) => String(player.user_id ?? '')).filter(Boolean)),
    ].map((userId) => ({
      user_id: userId,
      type: 'team_tournament_checked_in' as const,
      title: `${String(tournament.title)} team check-in confirmed`,
      body: 'Your locked roster is ready for tournament operations.',
      href: `/t/${slug}`,
      metadata: { tournament_id: tournament.id, team_id: teamId },
    })),
    supabase
  );

  return NextResponse.json({ status: 'checked_in', entry: data });
}
