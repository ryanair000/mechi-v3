import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import { createServiceClient } from '@/lib/supabase';
import { makeSlug } from '@/lib/slug';
import { getTeamOperationErrorMessage } from '@/lib/team-roster';
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
  const { data: created, error: createError } = await supabase
    .rpc('create_player_team', {
      p_owner_id: access.profile.id,
      p_name: name,
      p_slug: makeSlug(name),
      p_description: description,
      p_region: region,
      p_visibility: body.visibility === 'private' ? 'private' : 'public',
      p_recruiting: Boolean(body.recruiting),
    })
    .single();

  if (createError || !created) {
    return NextResponse.json(
      { error: getTeamOperationErrorMessage(createError) },
      { status: createError?.code === '23505' ? 409 : 500 }
    );
  }

  const createdRow = created as { team_id: string };
  const { data: team, error: teamError } = await supabase
    .from('teams')
    .select(TEAM_SELECT)
    .eq('id', createdRow.team_id)
    .single();
  if (teamError || !team) {
    return NextResponse.json({ error: 'The team was created but could not be reloaded.' }, { status: 500 });
  }

  return NextResponse.json({ team, role: 'captain' }, { status: 201 });
}
