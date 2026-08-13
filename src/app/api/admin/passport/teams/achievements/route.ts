import { NextRequest, NextResponse } from 'next/server';
import { hasModeratorAccess, requireActiveAccessProfile } from '@/lib/access';
import { issueTeamPassportAchievement } from '@/lib/passport-community';
import { createServiceClient } from '@/lib/supabase';

const SOURCES = ['tournament', 'match_series', 'organizer_manual', 'mechi_admin'] as const;

export async function POST(request: NextRequest) {
  const access = await requireActiveAccessProfile(request); if (access.response) return access.response;
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const teamId = String(body.team_id ?? ''); const tournamentId = typeof body.tournament_id === 'string' ? body.tournament_id : null;
  const sourceType = String(body.source_type ?? '') as (typeof SOURCES)[number];
  if (!teamId || !SOURCES.includes(sourceType) || String(body.title ?? '').trim().length < 2 || String(body.source_key ?? '').trim().length < 2) return NextResponse.json({ error: 'Team, title, source, and source key are required' }, { status: 400 });
  let allowed = hasModeratorAccess(access.profile);
  if (!allowed && tournamentId && sourceType !== 'mechi_admin') {
    const supabase = createServiceClient();
    const [{ data: tournament }, { data: entry }] = await Promise.all([
      supabase.from('tournaments').select('organizer_id').eq('id', tournamentId).maybeSingle(),
      supabase.from('tournament_team_entries').select('id').eq('tournament_id', tournamentId).eq('team_id', teamId).in('payment_status', ['paid', 'free']).maybeSingle(),
    ]);
    allowed = tournament?.organizer_id === access.profile.id && Boolean(entry);
  }
  if (!allowed) return NextResponse.json({ error: 'Organizer or moderator access required' }, { status: 403 });
  const result = await issueTeamPassportAchievement({ teamId, title: String(body.title), description: String(body.description ?? ''), game: typeof body.game === 'string' ? body.game : null, sourceType, sourceKey: String(body.source_key), occurredAt: typeof body.occurred_at === 'string' ? body.occurred_at : new Date().toISOString(), issuedBy: access.profile.id });
  return NextResponse.json(result.achievement ? { achievement: result.achievement } : { error: result.error }, { status: result.achievement ? 201 : 500 });
}
