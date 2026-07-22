import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import { createServiceClient } from '@/lib/supabase';
import { getV5WorkspaceAccess } from '@/lib/v5-workspace-access';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; invitationId: string }> }
) {
  const session = await requireActiveAccessProfile(request);
  if (session.response) return session.response;
  const { id, invitationId } = await params;
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Send a valid revocation request.' }, { status: 400 });
  }
  const reason = String(body.reason ?? '').trim().slice(0, 300);
  if (reason.length < 5) {
    return NextResponse.json({ error: 'Give a reason before revoking this invitation.' }, { status: 400 });
  }

  const supabase = createServiceClient();
  const access = await getV5WorkspaceAccess({
    supabase,
    user: session.profile,
    workspaceId: id,
    permission: 'workspace:invitations:write',
    mutation: true,
  });
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { error } = await supabase.rpc('revoke_v5_workspace_invitation', {
    p_workspace_id: id,
    p_invitation_id: invitationId,
    p_actor_id: session.profile.id,
    p_reason: reason,
  });
  if (error) {
    const status = error.code === 'P0002' ? 404 : 409;
    return NextResponse.json({ error: 'Invitation could not be revoked.' }, { status });
  }
  return new NextResponse(null, { status: 204 });
}
