import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import { createServiceClient } from '@/lib/supabase';
import { getTeamAccess, getTeamReadiness } from '@/lib/teams';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) return access.response;
  const { id } = await params;
  const supabase = createServiceClient();
  const teamAccess = await getTeamAccess(supabase, id, access.profile.id);
  if (!teamAccess?.membership) {
    return NextResponse.json(
      { error: 'Join this team to view team tournaments.' },
      { status: 403 }
    );
  }

  const [
    { data: tournaments, error },
    { data: entries, error: entriesError },
  ] = await Promise.all([
    supabase
      .from('tournaments')
      .select(
        'id, slug, title, game, platform, region, size, team_size, entry_fee, status, scheduled_for'
      )
      .eq('participant_mode', 'team')
      .eq('approval_status', 'approved')
      .eq('status', 'open')
      .order('scheduled_for', { ascending: true, nullsFirst: false })
      .limit(12),
    supabase
      .from('tournament_team_entries')
      .select(
        'id, tournament_id, payment_status, payment_authorization_url, check_in_status, roster_locked_at, joined_at'
      )
      .eq('team_id', id)
      .order('joined_at', { ascending: false }),
  ]);

  if (error || entriesError) {
    return NextResponse.json(
      { error: 'Could not load team tournaments. Apply the latest Supabase migration.' },
      { status: 503 }
    );
  }

  const entryByTournament = new Map(
    (entries ?? []).map((entry) => [String(entry.tournament_id), entry])
  );
  const options = await Promise.all(
    (tournaments ?? []).map(async (tournament) => ({
      ...tournament,
      entry: (() => {
        const entry = entryByTournament.get(String(tournament.id));
        if (!entry) return null;
        return {
          ...entry,
          payment_authorization_url: teamAccess.canManage
            ? entry.payment_authorization_url
            : null,
        };
      })(),
      readiness: await getTeamReadiness(
        supabase,
        id,
        String(tournament.game),
        Number(tournament.team_size ?? 2),
        tournament.platform ? String(tournament.platform) : null
      ),
    }))
  );

  return NextResponse.json({
    can_manage: teamAccess.canManage,
    tournaments: options,
  });
}
