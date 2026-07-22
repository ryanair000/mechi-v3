import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import { GAMES } from '@/lib/config';
import { createServiceClient } from '@/lib/supabase';
import { getTeamAccess } from '@/lib/v5-team-access';
import { cleanText } from '@/lib/v5-workspace-access';
import type { GameKey } from '@/types';

export async function GET(request: NextRequest, context: { params: Promise<{ teamId: string }> }) {
  const access = await requireActiveAccessProfile(request); if (access.response) return access.response;
  const { teamId } = await context.params; const supabase = createServiceClient(); const result = await getTeamAccess(supabase, access.profile, teamId);
  if (!result) return NextResponse.json({ error: 'This team is unavailable.' }, { status: 404 });
  const [{ data: members }, { data: invitations }, { data: snapshots }, { data: entries }] = await Promise.all([
    supabase.from('team_members').select('id,user_id,roster_role,status,joined_at,user:profiles(id,username,region,selected_games,game_ids)').eq('team_id', teamId).order('created_at'),
    supabase.from('workspace_invitations').select('id,invited_user_id,invited_email,role,status,expires_at,created_at,invited_user:profiles!workspace_invitations_invited_user_id_fkey(id,username)').eq('workspace_id', result.workspace.id).order('created_at', { ascending: false }),
    supabase.from('team_roster_snapshots').select('id,tournament_id,roster,lock_reason,locked_at,unlocked_at').eq('team_id', teamId).is('unlocked_at', null).order('locked_at', { ascending: false }).limit(10),
    supabase.from('tournament_entries').select('id,tournament_id,status,payment_status,checked_in_at,created_at,tournament:tournaments(id,slug,title,status,scheduled_for,team_size)').eq('team_id', teamId).neq('status', 'withdrawn').order('created_at', { ascending: false }),
  ]);
  return NextResponse.json({ ...result, members: members ?? [], invitations: invitations ?? [], snapshots: snapshots ?? [], entries: entries ?? [] });
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ teamId: string }> }) {
  const access = await requireActiveAccessProfile(request); if (access.response) return access.response;
  const { teamId } = await context.params; const supabase = createServiceClient(); const result = await getTeamAccess(supabase, access.profile, teamId);
  if (!result) return NextResponse.json({ error: 'This team is unavailable.' }, { status: 404 });
  if (!result.canManage) return NextResponse.json({ error: 'Only the captain or manager can change the team.' }, { status: 403 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null; if (!body) return NextResponse.json({ error: 'Send valid team details.' }, { status: 400 });
  const teamUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() }; const workspaceUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if ('name' in body) { const name = cleanText(body.name, 120); if (name.length < 2) return NextResponse.json({ error: 'Team name must have at least 2 characters.' }, { status: 400 }); workspaceUpdates.name = name; }
  if ('tag' in body) { const tag = cleanText(body.tag, 8).toUpperCase(); if (tag && tag.length < 2) return NextResponse.json({ error: 'Team tag must be 2 to 8 characters.' }, { status: 400 }); teamUpdates.tag = tag || null; }
  if ('game' in body) { const game = cleanText(body.game, 50) as GameKey; if (!GAMES[game]) return NextResponse.json({ error: 'Choose a supported game.' }, { status: 400 }); teamUpdates.game = game; }
  if ('platform' in body) teamUpdates.platform = cleanText(body.platform, 50) || null;
  if ('description' in body) workspaceUpdates.description = cleanText(body.description, 1200) || null;
  const [{ error: teamError }, { error: workspaceError }] = await Promise.all([supabase.from('teams').update(teamUpdates).eq('id', teamId), supabase.from('workspaces').update(workspaceUpdates).eq('id', result.workspace.id)]);
  if (teamError || workspaceError) return NextResponse.json({ error: 'Team changes could not be saved.' }, { status: 500 });
  await supabase.from('workspace_audit_events').insert({ workspace_id: result.workspace.id, actor_user_id: access.profile.id, action: 'team.updated', subject_type: 'team', subject_id: teamId, after_summary: { ...teamUpdates, ...workspaceUpdates } });
  return NextResponse.json({ saved: true });
}
