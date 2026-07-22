import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import { createNotification } from '@/lib/notifications';
import { createServiceClient } from '@/lib/supabase';
import { getTeamAccess, recordTeamAudit } from '@/lib/teams';
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

  const { data: member, error } = await supabase
    .from('team_members')
    .update({ role })
    .eq('team_id', id)
    .eq('user_id', userId)
    .eq('status', 'active')
    .select('id, user_id, role')
    .maybeSingle();
  if (error || !member) return NextResponse.json({ error: 'Active team member not found.' }, { status: 404 });
  await Promise.all([
    createNotification(
      { user_id: userId, type: 'team_role_changed', title: `Your role in ${String(teamAccess.team.name)} changed`, body: `You are now ${role}.`, href: `/teams?team=${id}`, metadata: { team_id: id, role } },
      supabase
    ),
    recordTeamAudit(supabase, { teamId: id, actorId: access.profile.id, action: 'member_role_changed', subjectUserId: userId, details: { role } }),
  ]);
  return NextResponse.json({ member });
}

