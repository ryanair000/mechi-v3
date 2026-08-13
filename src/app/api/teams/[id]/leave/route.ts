import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import { createServiceClient } from '@/lib/supabase';
import { getTeamOperationErrorMessage } from '@/lib/team-roster';
import { getTeamAccess } from '@/lib/teams';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) return access.response;
  const { id } = await params;
  const supabase = createServiceClient();
  const teamAccess = await getTeamAccess(supabase, id, access.profile.id);
  if (!teamAccess?.membership) return NextResponse.json({ error: 'You are not an active member of this team.' }, { status: 404 });
  if (String(teamAccess.team.owner_id) === access.profile.id) {
    return NextResponse.json({ error: 'Transfer team ownership before leaving.' }, { status: 409 });
  }
  const { data, error } = await supabase
    .rpc('leave_player_team', {
      p_team_id: id,
      p_actor_id: access.profile.id,
    })
    .single();
  if (error || !data) {
    const message = getTeamOperationErrorMessage(error);
    return NextResponse.json(
      { error: message },
      { status: message.includes('Transfer') ? 409 : message.includes('not found') ? 404 : 500 }
    );
  }
  return NextResponse.json({ status: 'left' });
}
