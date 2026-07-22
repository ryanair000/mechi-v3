import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import { createServiceClient } from '@/lib/supabase';

export async function PATCH(request: NextRequest, context: { params: Promise<{ invitationId: string }> }) {
  const access = await requireActiveAccessProfile(request); if (access.response) return access.response;
  const { invitationId } = await context.params; const body = await request.json().catch(() => null) as { action?: string } | null;
  if (!['accept','decline'].includes(body?.action ?? '')) return NextResponse.json({ error: 'Choose accept or decline.' }, { status: 400 });
  const supabase = createServiceClient(); const { data: invitation } = await supabase.from('workspace_invitations').select('id,workspace_id,role,status,expires_at,workspace:workspaces(id,type)').eq('id', invitationId).eq('invited_user_id', access.profile.id).maybeSingle();
  if (!invitation || invitation.status !== 'pending') return NextResponse.json({ error: 'This invitation is no longer available.' }, { status: 404 });
  if (new Date(invitation.expires_at).getTime() < Date.now()) { await supabase.from('workspace_invitations').update({ status: 'expired', responded_at: new Date().toISOString() }).eq('id', invitationId); return NextResponse.json({ error: 'This invitation expired.' }, { status: 410 }); }
  const accepted = body?.action === 'accept'; const now = new Date().toISOString();
  if (accepted) {
    const { error: memberError } = await supabase.from('workspace_members').upsert({ workspace_id: invitation.workspace_id, user_id: access.profile.id, role: invitation.role, status: 'active', permissions: invitation.role === 'manager' ? ['team:*'] : ['team:view'], joined_at: now, updated_at: now }, { onConflict: 'workspace_id,user_id' });
    if (memberError) return NextResponse.json({ error: 'The invitation could not be accepted.' }, { status: 500 });
    const workspaceValue = invitation.workspace as unknown; const workspace = (Array.isArray(workspaceValue) ? workspaceValue[0] : workspaceValue) as { type?: string } | null;
    if (workspace?.type === 'team') { const { data: team } = await supabase.from('teams').select('id').eq('workspace_id', invitation.workspace_id).single(); if (team) await supabase.from('team_members').upsert({ team_id: team.id, user_id: access.profile.id, roster_role: invitation.role, status: 'active', joined_at: now, updated_at: now }, { onConflict: 'team_id,user_id' }); }
  }
  await supabase.from('workspace_invitations').update({ status: accepted ? 'accepted' : 'declined', responded_at: now }).eq('id', invitationId);
  await supabase.from('workspace_audit_events').insert({ workspace_id: invitation.workspace_id, actor_user_id: access.profile.id, action: `invitation.${accepted ? 'accepted' : 'declined'}`, subject_type: 'workspace_invitation', subject_id: invitationId });
  return NextResponse.json({ status: accepted ? 'accepted' : 'declined' });
}
