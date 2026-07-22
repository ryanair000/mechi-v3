import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import { createServiceClient } from '@/lib/supabase';
import { getTeamAccess } from '@/lib/v5-team-access';
import { cleanText } from '@/lib/v5-workspace-access';

export async function POST(request: NextRequest, context: { params: Promise<{ teamId: string }> }) {
  const access = await requireActiveAccessProfile(request); if (access.response) return access.response;
  const { teamId } = await context.params; const supabase = createServiceClient(); const result = await getTeamAccess(supabase, access.profile, teamId);
  if (!result) return NextResponse.json({ error: 'This team is unavailable.' }, { status: 404 });
  if (!result.canManage) return NextResponse.json({ error: 'Only the captain or manager can lock the roster.' }, { status: 403 });
  const body = await request.json().catch(() => ({})) as Record<string, unknown>; const tournamentId = cleanText(body.tournament_id, 80) || null;
  const { data: members } = await supabase.from('team_members').select('user_id,roster_role,status,user:profiles(username,selected_games,game_ids)').eq('team_id', teamId).in('status', ['active','benched']).order('created_at');
  const active = members ?? []; const starters = active.filter((member) => ['captain','starter'].includes(member.roster_role));
  if (starters.length < 2) return NextResponse.json({ error: 'Assign at least two match-ready players before locking the roster.' }, { status: 409 });
  if (tournamentId) { const { data: tournament } = await supabase.from('tournaments').select('id,participant_type,team_size,game,status').eq('id', tournamentId).maybeSingle(); if (!tournament || tournament.participant_type !== 'team' || tournament.game !== result.team.game || !['open','full'].includes(tournament.status)) return NextResponse.json({ error: 'This team is not eligible for that tournament.' }, { status: 409 }); if (tournament.team_size && starters.length < tournament.team_size) return NextResponse.json({ error: `Assign at least ${tournament.team_size} starters for this tournament.` }, { status: 409 }); }
  const { data, error } = await supabase.from('team_roster_snapshots').insert({ team_id: teamId, tournament_id: tournamentId, created_by: access.profile.id, roster: active, lock_reason: cleanText(body.reason, 500) || (tournamentId ? 'Tournament entry' : 'Captain locked roster') }).select('*').single();
  if (error) return NextResponse.json({ error: 'Roster could not be locked.' }, { status: 500 });
  await supabase.from('teams').update({ roster_status: 'locked', updated_at: new Date().toISOString() }).eq('id', teamId);
  await supabase.from('workspace_audit_events').insert({ workspace_id: result.workspace.id, actor_user_id: access.profile.id, action: 'team.roster_locked', subject_type: 'roster_snapshot', subject_id: data.id, after_summary: { tournament_id: tournamentId, member_count: active.length } });
  return NextResponse.json({ snapshot: data }, { status: 201 });
}
