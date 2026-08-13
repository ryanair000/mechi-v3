import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import { createNotification } from '@/lib/notifications';
import { createServiceClient } from '@/lib/supabase';
import { getTeamOperationErrorMessage } from '@/lib/team-roster';
import { getTeamAccess } from '@/lib/teams';

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

  const { data: invitationResult, error } = await supabase
    .rpc('create_team_invitation', {
      p_team_id: id,
      p_actor_id: access.profile.id,
      p_invitee_id: invitee.id,
    })
    .single();
  if (error || !invitationResult) {
    const message = getTeamOperationErrorMessage(error);
    const conflict =
      error?.code === '23505' ||
      ['already', 'pending'].some((word) => message.toLowerCase().includes(word));
    return NextResponse.json(
      { error: message },
      { status: conflict ? 409 : 500 }
    );
  }
  const result = invitationResult as {
    invitation_id: string;
    invitation_status: string;
    invitation_expires_at: string;
  };
  const invitation = {
    id: result.invitation_id,
    team_id: id,
    invitee_id: invitee.id,
    inviter_id: access.profile.id,
    status: result.invitation_status,
    expires_at: result.invitation_expires_at,
  };

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
  ]);

  return NextResponse.json({ invitation: { ...invitation, invitee } }, { status: 201 });
}
