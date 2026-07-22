import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import { createServiceClient } from '@/lib/supabase';
import {
  getV5WorkspaceAccess,
  toSafeV5Workspace,
} from '@/lib/v5-workspace-access';

function cleanText(value: unknown, maxLength: number) {
  return String(value ?? '').trim().slice(0, maxLength);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireActiveAccessProfile(request);
  if (session.response) return session.response;
  const { id } = await params;
  const supabase = createServiceClient();
  const result = await getV5WorkspaceAccess({
    supabase,
    user: session.profile,
    workspaceId: id,
    permission: 'workspace:read',
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ workspace: toSafeV5Workspace(result.access) });
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
    return NextResponse.json({ error: 'Send valid workspace details.' }, { status: 400 });
  }

  const supabase = createServiceClient();
  const result = await getV5WorkspaceAccess({
    supabase,
    user: session.profile,
    workspaceId: id,
    permission: 'workspace:update',
    mutation: true,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const current = result.access.workspace;
  const name = body.name === undefined ? current.name : cleanText(body.name, 120);
  const description =
    body.description === undefined
      ? current.description ?? ''
      : cleanText(body.description, 600);
  const country =
    body.country === undefined ? current.country ?? '' : cleanText(body.country, 80);
  const region =
    body.region === undefined ? current.region ?? '' : cleanText(body.region, 100);
  const isPublic =
    body.is_public === undefined ? current.is_public : body.is_public === true;
  const reason = cleanText(body.reason, 300) || 'Updated workspace profile';

  if (name.length < 2) {
    return NextResponse.json({ error: 'Workspace name must be at least 2 characters.' }, { status: 400 });
  }
  if (
    isPublic &&
    ['sponsor', 'shop'].includes(current.type) &&
    current.verification_status !== 'verified'
  ) {
    return NextResponse.json(
      { error: 'This workspace must be verified before it can be public.' },
      { status: 409 }
    );
  }

  const { data, error } = await supabase.rpc('update_v5_workspace', {
    p_workspace_id: current.id,
    p_actor_id: session.profile.id,
    p_name: name,
    p_description: description,
    p_country: country,
    p_region: region,
    p_is_public: isPublic,
    p_reason: reason,
  });

  if (error || !data) {
    return NextResponse.json({ error: 'Workspace could not be updated.' }, { status: 409 });
  }
  return NextResponse.json({ workspace: { ...data, role: result.access.role } });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireActiveAccessProfile(request);
  if (session.response) return session.response;
  const { id } = await params;
  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    // A missing body is handled by the required reason check below.
  }
  const reason = cleanText(body.reason, 300);
  if (reason.length < 5) {
    return NextResponse.json({ error: 'Give a reason before archiving this workspace.' }, { status: 400 });
  }

  const supabase = createServiceClient();
  const result = await getV5WorkspaceAccess({
    supabase,
    user: session.profile,
    workspaceId: id,
    permission: 'workspace:archive',
    mutation: true,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  if (!result.access.isOwner) {
    return NextResponse.json({ error: 'Only the workspace owner can archive it.' }, { status: 403 });
  }
  if (result.access.workspace.type === 'player') {
    return NextResponse.json({ error: 'The primary player workspace cannot be archived.' }, { status: 409 });
  }

  const { error } = await supabase.rpc('archive_v5_workspace', {
    p_workspace_id: id,
    p_actor_id: session.profile.id,
    p_reason: reason,
  });
  if (error) {
    return NextResponse.json({ error: 'Workspace could not be archived.' }, { status: 409 });
  }
  return new NextResponse(null, { status: 204 });
}
