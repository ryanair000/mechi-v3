import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import { createServiceClient } from '@/lib/supabase';
import { getTeamAccess } from '@/lib/v5-team-access';
import { cleanText } from '@/lib/v5-workspace-access';

const ROLES = new Set(['manager','starter','substitute','analyst','member']);
const STATUSES = new Set(['active','benched','suspended','removed']);
export async function PATCH(request: NextRequest, context: { params: Promise<{ teamId: string; memberId: string }> }) {
  const access = await requireActiveAccessProfile(request); if (access.response) return access.response;
  const { teamId, memberId } = await context.params; const supabase = createServiceClient(); const result = await getTeamAccess(supabase, access.profile, teamId);
  if (!result) return NextResponse.json({ error: 'This team is unavailable.' }, { status: 404 });
  if (!result.canManage) return NextResponse.json({ error: 'Only the captain or manager can change roster roles.' }, { status: 403 });
  const { data: member } = await supabase.from('team_members').select('id,user_id,roster_role,status').eq('id', memberId).eq('team_id', teamId).maybeSingle();
  if (!member) return NextResponse.json({ error: 'Roster member not found.' }, { status: 404 });
  if (member.user_id === result.team.captain_user_id) return NextResponse.json({ error: 'Transfer captain ownership before changing the captain.' }, { status: 409 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null; const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if ('role' in (body ?? {})) { const role = cleanText(body?.role, 30); if (!ROLES.has(role)) return NextResponse.json({ error: 'Choose a valid roster role.' }, { status: 400 }); updates.roster_role = role; }
  if ('status' in (body ?? {})) { const status = cleanText(body?.status, 30); if (!STATUSES.has(status)) return NextResponse.json({ error: 'Choose a valid roster status.' }, { status: 400 }); updates.status = status; }
  const { data, error } = await supabase.from('team_members').update(updates).eq('id', memberId).eq('team_id', teamId).select('*').single();
  if (error) return NextResponse.json({ error: 'Roster member could not be updated.' }, { status: 500 });
  if (updates.roster_role || updates.status) await supabase.from('workspace_members').update({ role: updates.roster_role ?? member.roster_role, status: updates.status === 'removed' ? 'removed' : 'active', updated_at: new Date().toISOString() }).eq('workspace_id', result.workspace.id).eq('user_id', member.user_id);
  await supabase.from('workspace_audit_events').insert({ workspace_id: result.workspace.id, actor_user_id: access.profile.id, action: 'team.member_updated', subject_type: 'team_member', subject_id: memberId, before_summary: member, after_summary: data });
  return NextResponse.json({ member: data });
}
