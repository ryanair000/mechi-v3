import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import { createServiceClient } from '@/lib/supabase';
import {
  getAssignableV5WorkspaceRole,
  getV5WorkspaceAccess,
} from '@/lib/v5-workspace-access';

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
    permission: 'workspace:invitations:read',
  });
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { data, error } = await supabase
    .from('workspace_invitations')
    .select('id,invited_user_id,invited_email,role,status,expires_at,responded_at,created_at')
    .eq('workspace_id', id)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) {
    return NextResponse.json({ error: 'Invitations could not be loaded.' }, { status: 500 });
  }
  return NextResponse.json({ invitations: data ?? [] });
}

export async function POST(
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
    return NextResponse.json({ error: 'Send a valid invitation.' }, { status: 400 });
  }

  const target = String(body.username_or_email ?? '').trim().toLowerCase();
  const role = String(body.role ?? '').trim().toLowerCase();
  if (target.length < 3 || target.length > 254) {
    return NextResponse.json({ error: 'Enter a valid username or email.' }, { status: 400 });
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

  const roleGrant = getAssignableV5WorkspaceRole(access.access.workspace.type, role);
  if (!roleGrant) {
    return NextResponse.json({ error: 'Choose an allowed workspace role.' }, { status: 400 });
  }

  let invitedUser: { id: string; email?: string | null } | null = null;
  const usernameLookup = await supabase
    .from('profiles')
    .select('id,email')
    .ilike('username', target)
    .maybeSingle();
  if (usernameLookup.data) {
    invitedUser = usernameLookup.data as { id: string; email?: string | null };
  } else if (target.includes('@')) {
    const emailLookup = await supabase
      .from('profiles')
      .select('id,email')
      .ilike('email', target)
      .maybeSingle();
    invitedUser = (emailLookup.data as { id: string; email?: string | null } | null) ?? null;
  }

  if (invitedUser?.id === session.profile.id) {
    return NextResponse.json({ error: 'You are already in this workspace.' }, { status: 409 });
  }
  if (invitedUser) {
    const { data: existingMember } = await supabase
      .from('workspace_members')
      .select('id,status')
      .eq('workspace_id', id)
      .eq('user_id', invitedUser.id)
      .eq('status', 'active')
      .maybeSingle();
    if (existingMember) {
      return NextResponse.json({ error: 'This person is already an active member.' }, { status: 409 });
    }
  }

  const invitedEmail = invitedUser?.email?.toLowerCase() ?? (target.includes('@') ? target : '');
  if (!invitedUser && !invitedEmail) {
    return NextResponse.json({ error: 'No Mechi account matches that username.' }, { status: 404 });
  }

  const token = crypto.randomBytes(32).toString('base64url');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: invitationId, error } = await supabase.rpc(
    'create_v5_workspace_invitation',
    {
      p_workspace_id: id,
      p_actor_id: session.profile.id,
      p_invited_user_id: invitedUser?.id ?? null,
      p_invited_email: invitedEmail,
      p_role: roleGrant.role,
      p_permissions: roleGrant.permissions,
      p_token_hash: tokenHash,
      p_expires_at: expiresAt,
    }
  );

  if (error || !invitationId) {
    return NextResponse.json(
      { error: error?.code === '23505' ? 'A pending invitation already exists.' : 'Invitation could not be created.' },
      { status: error?.code === '23505' ? 409 : 500 }
    );
  }

  return NextResponse.json(
    {
      invitation: {
        id: invitationId,
        invited_user_id: invitedUser?.id ?? null,
        invited_email: invitedEmail || null,
        role: roleGrant.role,
        status: 'pending',
        expires_at: expiresAt,
      },
    },
    { status: 201 }
  );
}
