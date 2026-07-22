import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import { createServiceClient } from '@/lib/supabase';
import {
  getAssignableV5WorkspaceRole,
  getV5WorkspaceAccess,
} from '@/lib/v5-workspace-access';

function cleanReason(value: unknown) {
  return String(value ?? '').trim().slice(0, 300);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireActiveAccessProfile(request);
  if (session.response) return session.response;
  const { id } = await params;
  const supabase = createServiceClient();
  const access = await getV5WorkspaceAccess({
    supabase,
    user: session.profile,
    workspaceId: id,
    permission: 'workspace:members:read',
  });
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { data, error } = await supabase
    .from('workspace_members')
    .select(
      'id,user_id,role,status,permissions,joined_at,created_at,user:profiles!workspace_members_user_id_fkey(id,username,avatar_url)'
    )
    .eq('workspace_id', id)
    .neq('status', 'removed')
    .order('created_at', { ascending: true });
  if (error) {
    return NextResponse.json({ error: 'Workspace members could not be loaded.' }, { status: 500 });
  }
  return NextResponse.json({ members: data ?? [] });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireActiveAccessProfile(request);
  if (session.response) return session.response;
  const { id } = await params;
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Send a valid member update.' }, { status: 400 });
  }
  const userId = String(body.user_id ?? '').trim();
  const role = String(body.role ?? '').trim().toLowerCase();
  const status = String(body.status ?? 'active').trim().toLowerCase();
  const reason = cleanReason(body.reason);
  if (!userId || reason.length < 5 || !['active', 'suspended', 'removed'].includes(status)) {
    return NextResponse.json(
      { error: 'Member, valid status, and a reason of at least 5 characters are required.' },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();
  const access = await getV5WorkspaceAccess({
    supabase,
    user: session.profile,
    workspaceId: id,
    permission: 'workspace:members:write',
    mutation: true,
  });
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const roleGrant = getAssignableV5WorkspaceRole(access.access.workspace.type, role);
  if (!roleGrant) {
    return NextResponse.json({ error: 'Choose an allowed workspace role.' }, { status: 400 });
  }

  const { data, error } = await supabase.rpc('update_v5_workspace_member', {
    p_workspace_id: id,
    p_actor_id: session.profile.id,
    p_user_id: userId,
    p_role: roleGrant.role,
    p_permissions: roleGrant.permissions,
    p_status: status,
    p_reason: reason,
  });
  if (error || !data) {
    const responseStatus = error?.code === '42501' ? 403 : error?.code === 'P0002' ? 404 : 409;
    return NextResponse.json({ error: 'Workspace member could not be updated.' }, { status: responseStatus });
  }
  return NextResponse.json({ member: data });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireActiveAccessProfile(request);
  if (session.response) return session.response;
  const { id } = await params;
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Send a valid member removal.' }, { status: 400 });
  }
  const userId = String(body.user_id ?? '').trim();
  const reason = cleanReason(body.reason);
  if (!userId || reason.length < 5) {
    return NextResponse.json({ error: 'Member and removal reason are required.' }, { status: 400 });
  }

  const supabase = createServiceClient();
  const access = await getV5WorkspaceAccess({
    supabase,
    user: session.profile,
    workspaceId: id,
    permission: 'workspace:members:write',
    mutation: true,
  });
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const { data: member } = await supabase
    .from('workspace_members')
    .select('role,permissions')
    .eq('workspace_id', id)
    .eq('user_id', userId)
    .maybeSingle();
  if (!member) {
    return NextResponse.json({ error: 'Workspace member not found.' }, { status: 404 });
  }

  const { data, error } = await supabase.rpc('update_v5_workspace_member', {
    p_workspace_id: id,
    p_actor_id: session.profile.id,
    p_user_id: userId,
    p_role: String(member.role),
    p_permissions: Array.isArray(member.permissions) ? member.permissions.map(String) : [],
    p_status: 'removed',
    p_reason: reason,
  });
  if (error || !data) {
    const responseStatus = error?.code === '42501' ? 403 : error?.code === 'P0002' ? 404 : 409;
    return NextResponse.json({ error: 'Workspace member could not be removed.' }, { status: responseStatus });
  }
  return NextResponse.json({ member: data });
}
