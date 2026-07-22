import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import { createNotification } from '@/lib/notifications';
import { createServiceClient } from '@/lib/supabase';
import { getTeamAccess, recordTeamAudit } from '@/lib/teams';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) return access.response;
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const username = String(body.username ?? '').trim().replace(/^@/, '').slice(0, 60);
  if (!username) return NextResponse.json({ error: 'Enter the player username.' }, { status: 400 });

  const supabase = createServiceClient();
  const teamAccess = await getTeamAccess(supabase, id, access.profile.id);
  if (!teamAccess) return NextResponse.json({ error: 'Team not found.' }, { status: 404 });
  if (!teamAccess.canManage) return NextResponse.json({ error: 'Only a captain can invite players.' }, { status: 403 });

  const { data: invitee } = await supabase
    .from('profiles')
    .select('id, username, avatar_url')
    .ilike('username', username)
    .maybeSingle();
  if (!invitee) return NextResponse.json({ error: 'No player uses that username.' }, { status: 404 });
  if (invitee.id === access.profile.id) return NextResponse.json({ error: 'You are already on this team.' }, { status: 400 });

  const { data: existingMember } = await supabase
    .from('team_members')
    .select('id')
    .eq('team_id', id)
    .eq('user_id', invitee.id)
    .eq('status', 'active')
    .maybeSingle();
  if (existingMember) return NextResponse.json({ error: 'That player is already on the team.' }, { status: 409 });

  const { data: invitation, error } = await supabase
    .from('team_invitations')
    .insert({ team_id: id, invitee_id: invitee.id, inviter_id: access.profile.id })
    .select('id, team_id, invitee_id, inviter_id, status, expires_at, created_at')
    .single();
  if (error || !invitation) {
    const duplicate = error?.code === '23505';
    return NextResponse.json(
      { error: duplicate ? 'That player already has a pending invitation.' : 'Could not send the invitation.' },
      { status: duplicate ? 409 : 500 }
    );
  }

  await Promise.all([
    createNotification(
      {
        user_id: invitee.id,
        type: 'team_invitation_received',
        title: `Join ${String(teamAccess.team.name)}`,
        body: `${access.profile.username} invited you to join the team.`,
        href: '/teams',
        metadata: { team_id: id, invitation_id: invitation.id },
      },
      supabase
    ),
    recordTeamAudit(supabase, {
      teamId: id,
      actorId: access.profile.id,
      action: 'invitation_sent',
      subjectUserId: invitee.id,
    }),
  ]);

  return NextResponse.json({ invitation: { ...invitation, invitee } }, { status: 201 });
}

