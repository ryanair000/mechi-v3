import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import { makeSlug } from '@/lib/slug';
import { createServiceClient } from '@/lib/supabase';
import type { V5WorkspaceKind } from '@/components/v5/app/v5-workspaces';

const ACTIVATABLE_TYPES = new Set<V5WorkspaceKind>(['player', 'organizer', 'creator', 'coach', 'sponsor', 'shop']);
const PERSONAL_TYPES = new Set<V5WorkspaceKind>(['player', 'creator', 'coach']);

interface WorkspaceRow {
  id: string;
  type: V5WorkspaceKind;
  owner_id: string;
  name: string;
  slug: string;
  status: string;
  verification_status: string;
  is_public: boolean;
}

function fallbackWorkspaces(user: { id: string; username: string }) {
  return [
    {
      id: `player:${user.id}`,
      type: 'player' as const,
      name: user.username,
      slug: user.username,
      status: 'active',
      verification_status: 'unverified',
      role: 'owner',
      persisted: false,
    },
  ];
}

export async function GET(request: NextRequest) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) return access.response;

  const user = access.profile;
  const supabase = createServiceClient();
  const [{ data: owned, error: ownedError }, { data: memberships, error: membershipError }] = await Promise.all([
    supabase
      .from('workspaces')
      .select('id,type,owner_id,name,slug,status,verification_status,is_public')
      .eq('owner_id', user.id)
      .is('archived_at', null)
      .order('created_at', { ascending: true }),
    supabase
      .from('workspace_members')
      .select('role,status,workspace:workspaces(id,type,owner_id,name,slug,status,verification_status,is_public)')
      .eq('user_id', user.id)
      .eq('status', 'active'),
  ]);

  if (ownedError || membershipError) {
    const migrationPending = ownedError?.code === '42P01' || membershipError?.code === '42P01';
    return NextResponse.json({
      workspaces: fallbackWorkspaces(user),
      available_types: Array.from(ACTIVATABLE_TYPES),
      migration_pending: migrationPending,
    });
  }

  const byId = new Map<string, WorkspaceRow & { role: string; persisted: true }>();
  for (const workspace of (owned ?? []) as WorkspaceRow[]) {
    byId.set(workspace.id, { ...workspace, role: 'owner', persisted: true });
  }
  for (const membership of memberships ?? []) {
    const workspaceValue = membership.workspace as unknown;
    const workspace = (Array.isArray(workspaceValue) ? workspaceValue[0] : workspaceValue) as WorkspaceRow | null;
    if (workspace && !byId.has(workspace.id)) {
      byId.set(workspace.id, { ...workspace, role: String(membership.role ?? 'member'), persisted: true });
    }
  }

  const workspaces = Array.from(byId.values());
  if (!workspaces.some((workspace) => workspace.type === 'player')) {
    workspaces.unshift(fallbackWorkspaces(user)[0]);
  }

  return NextResponse.json({
    workspaces,
    available_types: Array.from(ACTIVATABLE_TYPES),
    migration_pending: false,
  });
}

export async function POST(request: NextRequest) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) return access.response;

  const user = access.profile;
  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Send a valid workspace request.' }, { status: 400 });
  }

  const type = String(body.type ?? '') as V5WorkspaceKind;
  if (!ACTIVATABLE_TYPES.has(type)) {
    return NextResponse.json({ error: 'Choose an available workspace type.' }, { status: 400 });
  }

  const defaultName = type === 'player' ? user.username : `${user.username} ${type}`;
  const name = String(body.name ?? defaultName).trim();
  if (name.length < 2 || name.length > 120) {
    return NextResponse.json({ error: 'Workspace name must be between 2 and 120 characters.' }, { status: 400 });
  }

  const supabase = createServiceClient();
  if (PERSONAL_TYPES.has(type)) {
    const { data: existing } = await supabase
      .from('workspaces')
      .select('id,type,name,slug,status,verification_status,is_public')
      .eq('owner_id', user.id)
      .eq('type', type)
      .is('archived_at', null)
      .maybeSingle();
    if (existing) return NextResponse.json({ workspace: existing, existing: true });
  }

  const slugBase = makeSlug(name) || type;
  const slug = `${slugBase}-${crypto.randomUUID().slice(0, 6)}`;
  const verificationStatus = ['sponsor', 'shop'].includes(type) ? 'unverified' : 'unverified';
  const { data: workspace, error: workspaceError } = await supabase
    .from('workspaces')
    .insert({
      type,
      owner_id: user.id,
      name,
      slug,
      status: 'active',
      verification_status: verificationStatus,
      is_public: false,
      country: user.country ?? null,
      region: user.region ?? null,
    })
    .select('id,type,name,slug,status,verification_status,is_public')
    .single();

  if (workspaceError || !workspace) {
    const migrationPending = workspaceError?.code === '42P01';
    return NextResponse.json(
      { error: migrationPending ? 'V5 workspace storage is not ready yet.' : 'Workspace could not be created.', code: workspaceError?.code },
      { status: migrationPending ? 503 : 409 }
    );
  }

  const { error: membershipError } = await supabase.from('workspace_members').insert({
    workspace_id: workspace.id,
    user_id: user.id,
    role: 'owner',
    status: 'active',
    permissions: ['workspace:*'],
    joined_at: new Date().toISOString(),
  });

  if (membershipError) {
    await supabase.from('workspaces').delete().eq('id', workspace.id).eq('owner_id', user.id);
    return NextResponse.json({ error: 'Workspace membership could not be created.' }, { status: 500 });
  }

  await supabase.from('workspace_audit_events').insert({
    workspace_id: workspace.id,
    actor_user_id: user.id,
    action: 'workspace.created',
    subject_type: 'workspace',
    subject_id: workspace.id,
    reason: `Activated ${type} workspace`,
    after_summary: { type, name, status: 'active' },
  });

  return NextResponse.json({ workspace: { ...workspace, role: 'owner', persisted: true } }, { status: 201 });
}
