import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import { createServiceClient } from '@/lib/supabase';
import { getTeamAccess } from '@/lib/v5-team-access';

export async function GET(request: NextRequest, context: { params: Promise<{ teamId: string }> }) {
  const access = await requireActiveAccessProfile(request); if (access.response) return access.response;
  const { teamId } = await context.params; const supabase = createServiceClient(); const result = await getTeamAccess(supabase, access.profile, teamId);
  if (!result) return NextResponse.json({ error: 'This team is unavailable.' }, { status: 404 });
  const { data: members } = await supabase.from('team_members').select('id,user_id,roster_role,status,user:profiles(username,selected_games,game_ids)').eq('team_id', teamId).in('status', ['active','benched']);
  const active = members ?? []; const starters = active.filter((member) => ['captain','starter'].includes(member.roster_role));
  const missingGame = active.filter((member) => { const raw = member.user as unknown; const profile = (Array.isArray(raw) ? raw[0] : raw) as { selected_games?: string[]; game_ids?: Record<string,string> } | null; return !profile?.selected_games?.includes(result.team.game) || !profile.game_ids?.[result.team.game]; });
  const checks = [
    { key: 'captain', label: 'Captain assigned', complete: active.some((member) => member.roster_role === 'captain') },
    { key: 'players', label: 'At least two match-ready players', complete: starters.length >= 2 },
    { key: 'game_accounts', label: 'Game IDs connected', complete: active.length > 0 && missingGame.length === 0, affected: missingGame.map((member) => member.user_id) },
    { key: 'team_identity', label: 'Team name, game and tag saved', complete: Boolean(result.workspace.name && result.team.game && result.team.tag) },
  ];
  return NextResponse.json({ ready: checks.every((check) => check.complete), checks, active_count: active.length, starter_count: starters.length });
}
