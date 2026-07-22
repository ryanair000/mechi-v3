import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import { createServiceClient } from '@/lib/supabase';
import { getTeamAccess, recordTeamAudit } from '@/lib/teams';

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
  const leftAt = new Date().toISOString();
  const { error } = await supabase.from('team_members').update({ status: 'left', left_at: leftAt }).eq('id', teamAccess.membership.id);
  if (error) return NextResponse.json({ error: 'Could not leave the team.' }, { status: 500 });
  await recordTeamAudit(supabase, { teamId: id, actorId: access.profile.id, action: 'member_left', subjectUserId: access.profile.id });
  return NextResponse.json({ status: 'left' });
}

