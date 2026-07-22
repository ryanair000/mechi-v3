import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import { createNotification } from '@/lib/notifications';
import { createServiceClient } from '@/lib/supabase';
import { recordTeamAudit } from '@/lib/teams';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) return access.response;
  const { id } = await params;
  const supabase = createServiceClient();
  const { data: invitation } = await supabase
    .from('team_invitations')
    .select('id, team_id, invitee_id, inviter_id, status, expires_at, team:team_id(id, name)')
    .eq('id', id)
    .maybeSingle();
  if (!invitation) return NextResponse.json({ error: 'Invitation not found.' }, { status: 404 });
  if (invitation.invitee_id !== access.profile.id) return NextResponse.json({ error: 'This invitation belongs to another player.' }, { status: 403 });
  if (invitation.status !== 'pending') return NextResponse.json({ error: 'This invitation is no longer waiting for a response.' }, { status: 409 });
  if (new Date(invitation.expires_at).getTime() <= Date.now()) {
    await supabase.from('team_invitations').update({ status: 'expired', responded_at: new Date().toISOString() }).eq('id', id);
    return NextResponse.json({ error: 'This invitation expired. Ask the captain to send another one.' }, { status: 410 });
  }

  const { error: memberError } = await supabase.from('team_members').upsert(
    { team_id: invitation.team_id, user_id: access.profile.id, role: 'member', status: 'active', joined_at: new Date().toISOString(), left_at: null },
    { onConflict: 'team_id,user_id' }
  );
  if (memberError) return NextResponse.json({ error: 'Could not join the team.' }, { status: 500 });

  const { data: updated, error: invitationError } = await supabase
    .from('team_invitations')
    .update({ status: 'accepted', responded_at: new Date().toISOString() })
    .eq('id', id)
    .eq('status', 'pending')
    .select('id')
    .maybeSingle();
  if (invitationError || !updated) {
    await supabase.from('team_members').update({ status: 'left', left_at: new Date().toISOString() }).eq('team_id', invitation.team_id).eq('user_id', access.profile.id);
    return NextResponse.json({ error: 'The invitation changed before it could be accepted.' }, { status: 409 });
  }

  const team = invitation.team as unknown as { id: string; name: string } | null;
  await Promise.all([
    createNotification(
      {
        user_id: invitation.inviter_id,
        type: 'team_invitation_accepted',
        title: `${access.profile.username} joined ${team?.name ?? 'your team'}`,
        body: 'The player is now available for team setup and rosters.',
        href: `/teams?team=${invitation.team_id}`,
        metadata: { team_id: invitation.team_id, user_id: access.profile.id },
      },
      supabase
    ),
    recordTeamAudit(supabase, { teamId: invitation.team_id, actorId: access.profile.id, action: 'invitation_accepted', subjectUserId: access.profile.id }),
  ]);
  return NextResponse.json({ status: 'accepted', team_id: invitation.team_id });
}

