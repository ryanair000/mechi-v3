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
    .select('id, team_id, invitee_id, inviter_id, status, team:team_id(id, name)')
    .eq('id', id)
    .maybeSingle();
  if (!invitation) return NextResponse.json({ error: 'Invitation not found.' }, { status: 404 });
  if (invitation.invitee_id !== access.profile.id) return NextResponse.json({ error: 'This invitation belongs to another player.' }, { status: 403 });
  if (invitation.status !== 'pending') return NextResponse.json({ error: 'This invitation is no longer waiting for a response.' }, { status: 409 });

  const { data: updated } = await supabase
    .from('team_invitations')
    .update({ status: 'declined', responded_at: new Date().toISOString() })
    .eq('id', id)
    .eq('status', 'pending')
    .select('id')
    .maybeSingle();
  if (!updated) return NextResponse.json({ error: 'The invitation changed before it could be declined.' }, { status: 409 });
  const team = invitation.team as unknown as { id: string; name: string } | null;
  await Promise.all([
    createNotification(
      {
        user_id: invitation.inviter_id,
        type: 'team_invitation_declined',
        title: `${access.profile.username} declined the team invitation`,
        body: `The invitation to ${team?.name ?? 'your team'} is closed.`,
        href: `/teams?team=${invitation.team_id}`,
        metadata: { team_id: invitation.team_id, user_id: access.profile.id },
      },
      supabase
    ),
    recordTeamAudit(supabase, { teamId: invitation.team_id, actorId: access.profile.id, action: 'invitation_declined', subjectUserId: access.profile.id }),
  ]);
  return NextResponse.json({ status: 'declined' });
}

