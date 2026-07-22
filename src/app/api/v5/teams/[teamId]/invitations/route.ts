import { createHash, randomBytes } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import { createServiceClient } from '@/lib/supabase';
import { getTeamAccess } from '@/lib/v5-team-access';
import { cleanText } from '@/lib/v5-workspace-access';

const ROLES = new Set(['manager','starter','substitute','analyst','member']);
export async function POST(request: NextRequest, context: { params: Promise<{ teamId: string }> }) {
  const access = await requireActiveAccessProfile(request); if (access.response) return access.response;
  const { teamId } = await context.params; const supabase = createServiceClient(); const result = await getTeamAccess(supabase, access.profile, teamId);
  if (!result) return NextResponse.json({ error: 'This team is unavailable.' }, { status: 404 });
  if (!result.canManage) return NextResponse.json({ error: 'Only the captain or manager can invite players.' }, { status: 403 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const identity = cleanText(body?.identity, 160); const role = cleanText(body?.role || 'member', 30);
  if (identity.length < 2 || !ROLES.has(role)) return NextResponse.json({ error: 'Enter a username or email and choose a role.' }, { status: 400 });
  const byEmail = identity.includes('@');
  const { data: invitedUser } = await supabase.from('profiles').select('id,username,email').ilike(byEmail ? 'email' : 'username', identity).maybeSingle();
  if (!invitedUser && !byEmail) return NextResponse.json({ error: 'No player has that username.' }, { status: 404 });
  if (invitedUser?.id === access.profile.id) return NextResponse.json({ error: 'You are already on this team.' }, { status: 409 });
  if (invitedUser) {
    const { data: member } = await supabase.from('team_members').select('id,status').eq('team_id', teamId).eq('user_id', invitedUser.id).maybeSingle();
    if (member && !['left','removed'].includes(member.status)) return NextResponse.json({ error: 'That player is already on the roster.' }, { status: 409 });
  }
  const rawToken = randomBytes(32).toString('hex'); const tokenHash = createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + 7 * 86400000).toISOString();
  const { data, error } = await supabase.from('workspace_invitations').insert({ workspace_id: result.workspace.id, invited_by: access.profile.id, invited_user_id: invitedUser?.id ?? null, invited_email: invitedUser ? null : identity.toLowerCase(), role, permissions: role === 'manager' ? ['team:*'] : ['team:view'], token_hash: tokenHash, expires_at: expiresAt }).select('id,invited_user_id,invited_email,role,status,expires_at,created_at').single();
  if (error) return NextResponse.json({ error: 'Invitation could not be sent.' }, { status: 500 });
  if (invitedUser) await supabase.from('notifications').insert({ user_id: invitedUser.id, type: 'team_invitation', title: `${result.workspace.name} invited you`, body: `Join as ${role}.`, href: '/app/player/teams' });
  await supabase.from('workspace_audit_events').insert({ workspace_id: result.workspace.id, actor_user_id: access.profile.id, action: 'team.invitation_created', subject_type: 'workspace_invitation', subject_id: data.id, after_summary: { invited_user_id: invitedUser?.id ?? null, invited_email: invitedUser ? null : identity.toLowerCase(), role } });
  return NextResponse.json({ invitation: data, invite_token: invitedUser ? undefined : rawToken }, { status: 201 });
}
