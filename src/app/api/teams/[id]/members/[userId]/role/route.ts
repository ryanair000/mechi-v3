import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import { createNotification } from '@/lib/notifications';
import { createServiceClient } from '@/lib/supabase';
import { getTeamOperationErrorMessage } from '@/lib/team-roster';
import { getTeamAccess } from '@/lib/teams';
import type { TeamMemberRole } from '@/types';

const ROLES: TeamMemberRole[] = ['captain', 'starter', 'substitute', 'member'];

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string; userId: string }> }) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) return access.response;
  const { id, userId } = await params;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const role = String(body.role ?? '') as TeamMemberRole;
  if (!ROLES.includes(role)) return NextResponse.json({ error: 'Choose a valid team role.' }, { status: 400 });
  const supabase = createServiceClient();
  const teamAccess = await getTeamAccess(supabase, id, access.profile.id);
  if (!teamAccess) return NextResponse.json({ error: 'Team not found.' }, { status: 404 });
  if (!teamAccess.canManage) return NextResponse.json({ error: 'Only a captain can change team roles.' }, { status: 403 });
  if (String(teamAccess.team.owner_id) === userId && role !== 'captain') {
    return NextResponse.json({ error: 'Transfer team ownership before changing the owner role.' }, { status: 409 });
  }

  const { data, error } = await supabase
    .rpc('set_team_member_role', {
      p_team_id: id,
      p_actor_id: access.profile.id,
      p_user_id: userId,
      p_role: role,
    })
    .single();
  if (error || !data) {
    const message = getTeamOperationErrorMessage(error);
    return NextResponse.json(
      { error: message },
      { status: message.includes('Only') ? 403 : message.includes('not found') ? 404 : 409 }
    );
  }
  const member = data as { member_id: string; user_id: string; member_role: string };
  await createNotification(
    { user_id: userId, type: 'team_role_changed', title: `Your role in ${String(teamAccess.team.name)} changed`, body: `You are now ${role}.`, href: `/teams?team=${id}`, metadata: { team_id: id, role } },
    supabase
  );
  return NextResponse.json({ member: { id: member.member_id, user_id: member.user_id, role: member.member_role } });
}
