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
      p_response: 'accepted',
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
  if (result.invitation_status === 'expired') {
    return NextResponse.json(
      { error: 'This invitation expired. Ask the captain to send another one.' },
      { status: 410 }
    );
  }
  await createNotification(
    {
      user_id: result.inviter_id,
      type: 'team_invitation_accepted',
      title: `${access.profile.username} joined ${result.team_name}`,
      body: 'The player is now available for team setup and rosters.',
      href: `/teams?team=${result.team_id}`,
      metadata: { team_id: result.team_id, user_id: access.profile.id },
    },
    supabase
  );
  return NextResponse.json({ status: 'accepted', team_id: result.team_id });
}
