import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import { createServiceClient } from '@/lib/supabase';
import { makeSlug } from '@/lib/slug';
import { cleanTeamDescription, cleanTeamName, TEAM_SELECT } from '@/lib/teams';

export async function GET(request: NextRequest) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) return access.response;
  const supabase = createServiceClient();

  const [{ data: memberships, error: memberError }, { data: invitations, error: inviteError }] =
    await Promise.all([
      supabase
        .from('team_members')
        .select(`id, role, joined_at, team:team_id(${TEAM_SELECT})`)
        .eq('user_id', access.profile.id)
        .eq('status', 'active')
        .order('joined_at', { ascending: false }),
      supabase
        .from('team_invitations')
        .select(`id, status, expires_at, created_at, team:team_id(${TEAM_SELECT}), inviter:inviter_id(id, username, avatar_url)`)
        .eq('invitee_id', access.profile.id)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false }),
    ]);

  if (memberError || inviteError) {
    return NextResponse.json({ error: 'Could not load your teams.' }, { status: 500 });
  }

  return NextResponse.json({ memberships: memberships ?? [], invitations: invitations ?? [] });
}

export async function POST(request: NextRequest) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) return access.response;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const name = cleanTeamName(body.name);
  const description = cleanTeamDescription(body.description);
  const region = String(body.region ?? 'Kenya').trim().slice(0, 80) || 'Kenya';

  if (name.length < 2) {
    return NextResponse.json({ error: 'Team name must have at least 2 characters.' }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data: team, error: teamError } = await supabase
    .from('teams')
    .insert({
      name,
      slug: makeSlug(name),
      description,
      region,
      visibility: body.visibility === 'private' ? 'private' : 'public',
      recruiting: Boolean(body.recruiting),
      owner_id: access.profile.id,
    })
    .select(TEAM_SELECT)
    .single();

  if (teamError || !team) {
    return NextResponse.json({ error: 'Could not create the team.' }, { status: 500 });
  }

  const { error: memberError } = await supabase.from('team_members').insert({
    team_id: team.id,
    user_id: access.profile.id,
    role: 'captain',
    status: 'active',
  });

  if (memberError) {
    await supabase.from('teams').delete().eq('id', team.id).eq('owner_id', access.profile.id);
    return NextResponse.json({ error: 'Could not create the captain membership.' }, { status: 500 });
  }

  await supabase.from('team_audit_logs').insert({
    team_id: team.id,
    actor_id: access.profile.id,
    action: 'team_created',
    subject_user_id: access.profile.id,
    details: { name },
  });

  return NextResponse.json({ team, role: 'captain' }, { status: 201 });
}

