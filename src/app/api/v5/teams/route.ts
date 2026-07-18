import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import { GAMES } from '@/lib/config';
import { makeSlug } from '@/lib/slug';
import { createServiceClient } from '@/lib/supabase';
import type { GameKey } from '@/types';

export async function GET(request: NextRequest) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) return access.response;
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('team_members')
    .select('roster_role,status,team:teams(id,game,platform,tag,roster_status,captain_user_id,workspace:workspaces(id,name,slug,status,verification_status))')
    .eq('user_id', access.profile.id)
    .in('status', ['active', 'benched']);
  if (error) {
    return NextResponse.json({ teams: [], migration_pending: error.code === '42P01' });
  }
  return NextResponse.json({ teams: data ?? [], migration_pending: false });
}

export async function POST(request: NextRequest) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) return access.response;
  const user = access.profile;
  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; }
  catch { return NextResponse.json({ error: 'Send valid team details.' }, { status: 400 }); }

  const name = String(body.name ?? `${user.username} squad`).trim();
  const tag = String(body.tag ?? '').trim().toUpperCase();
  const game = String(body.game ?? '') as GameKey;
  const platform = String(body.platform ?? GAMES[game]?.platforms?.[0] ?? '').trim();
  if (name.length < 2 || name.length > 120) return NextResponse.json({ error: 'Team name must be between 2 and 120 characters.' }, { status: 400 });
  if (tag && (tag.length < 2 || tag.length > 8)) return NextResponse.json({ error: 'Team tag must be 2 to 8 characters.' }, { status: 400 });
  if (!GAMES[game]) return NextResponse.json({ error: 'Choose a supported game.' }, { status: 400 });

  const supabase = createServiceClient();
  const slug = `${makeSlug(name)}-${crypto.randomUUID().slice(0, 6)}`;
  const { data: workspace, error: workspaceError } = await supabase.from('workspaces').insert({
    type: 'team', owner_id: user.id, name, slug, status: 'active', verification_status: 'unverified',
    is_public: false,
  }).select('id,name,slug,status,verification_status').single();
  if (workspaceError || !workspace) return NextResponse.json({ error: workspaceError?.code === '42P01' ? 'V5 team storage is not ready yet.' : 'Team could not be created.' }, { status: workspaceError?.code === '42P01' ? 503 : 409 });

  const { data: team, error: teamError } = await supabase.from('teams').insert({
    workspace_id: workspace.id, game, platform: platform || null, tag: tag || null,
    roster_status: 'building', captain_user_id: user.id,
  }).select('id,workspace_id,game,platform,tag,roster_status,captain_user_id').single();
  if (teamError || !team) {
    await supabase.from('workspaces').delete().eq('id', workspace.id).eq('owner_id', user.id);
    return NextResponse.json({ error: 'Team roster could not be created.' }, { status: 500 });
  }

  const [{ error: workspaceMemberError }, { error: teamMemberError }] = await Promise.all([
    supabase.from('workspace_members').insert({ workspace_id: workspace.id, user_id: user.id, role: 'captain', status: 'active', permissions: ['team:*'], joined_at: new Date().toISOString() }),
    supabase.from('team_members').insert({ team_id: team.id, user_id: user.id, roster_role: 'captain', status: 'active', joined_at: new Date().toISOString() }),
  ]);
  if (workspaceMemberError || teamMemberError) {
    await supabase.from('teams').delete().eq('id', team.id).eq('captain_user_id', user.id);
    await supabase.from('workspaces').delete().eq('id', workspace.id).eq('owner_id', user.id);
    return NextResponse.json({ error: 'Captain membership could not be created.' }, { status: 500 });
  }

  await supabase.from('workspace_audit_events').insert({ workspace_id: workspace.id, actor_user_id: user.id, action: 'team.created', subject_type: 'team', subject_id: team.id, reason: 'Created a team workspace', after_summary: { name, game, tag: tag || null } });
  return NextResponse.json({ team: { ...team, workspace }, role: 'captain' }, { status: 201 });
}
