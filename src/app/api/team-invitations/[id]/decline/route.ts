import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import { createNotification } from '@/lib/notifications';
import { createServiceClient } from '@/lib/supabase';
import { getTeamOperationErrorMessage } from '@/lib/team-roster';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) return access.response;
  const { id } = await params;
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .rpc('respond_team_invitation', {
      p_invitation_id: id,
      p_actor_id: access.profile.id,
      p_response: 'declined',
    })
    .single();
  if (error || !data) {
    const message = getTeamOperationErrorMessage(error);
    return NextResponse.json(
      { error: message },
      { status: message.includes('another player') ? 403 : message.includes('not found') ? 404 : 409 }
    );
  }
  const result = data as {
    team_id: string;
    invitation_status: string;
    inviter_id: string;
    team_name: string;
  };
  await createNotification(
    {
      user_id: result.inviter_id,
      type: 'team_invitation_declined',
      title: `${access.profile.username} declined the team invitation`,
      body: `The invitation to ${result.team_name} is closed.`,
      href: `/teams?team=${result.team_id}`,
      metadata: { team_id: result.team_id, user_id: access.profile.id },
    },
    supabase
  );
  return NextResponse.json({ status: 'declined' });
}
