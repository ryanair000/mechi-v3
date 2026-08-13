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
  const targetUserId = String(body.user_id ?? '');
  const supabase = createServiceClient();
  const teamAccess = await getTeamAccess(supabase, id, access.profile.id);
  if (!teamAccess) return NextResponse.json({ error: 'Team not found.' }, { status: 404 });
  if (String(teamAccess.team.owner_id) !== access.profile.id) return NextResponse.json({ error: 'Only the team owner can transfer ownership.' }, { status: 403 });
  if (!targetUserId || targetUserId === access.profile.id) return NextResponse.json({ error: 'Choose another active team member.' }, { status: 400 });
  const { data, error } = await supabase
    .rpc('transfer_team_ownership', {
      p_team_id: id,
      p_actor_id: access.profile.id,
      p_target_user_id: targetUserId,
    })
    .single();
  if (error || !data) {
    const message = getTeamOperationErrorMessage(error);
    return NextResponse.json(
      { error: message },
      { status: message.includes('Only') ? 403 : message.includes('not found') ? 404 : 409 }
    );
  }
  await createNotification(
    {
      user_id: targetUserId,
      type: 'team_role_changed',
      title: `You now own ${String(teamAccess.team.name)}`,
      body: 'You are the team owner and a captain.',
      href: `/teams?team=${id}`,
      metadata: { team_id: id, role: 'captain', ownership_transferred: true },
    },
    supabase
  );
  return NextResponse.json({ status: 'transferred', owner_id: targetUserId });
}
