import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import { createServiceClient } from '@/lib/supabase';
import { cleanText, getWorkspaceAccess } from '@/lib/v5-workspace-access';

export async function GET(request: NextRequest, context: { params: Promise<{ workspaceId: string }> }) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) return access.response;
  const { workspaceId } = await context.params;
  const supabase = createServiceClient();
  const workspace = await getWorkspaceAccess(supabase, access.profile, workspaceId);
  if (!workspace) return NextResponse.json({ error: 'This dashboard is unavailable.' }, { status: 404 });
  return NextResponse.json({ workspace });
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ workspaceId: string }> }) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) return access.response;
  const { workspaceId } = await context.params;
  const supabase = createServiceClient();
  const workspace = await getWorkspaceAccess(supabase, access.profile, workspaceId);
  if (!workspace) return NextResponse.json({ error: 'This dashboard is unavailable.' }, { status: 404 });
  if (!workspace.canManage) return NextResponse.json({ error: 'Only an owner or manager can change these details.' }, { status: 403 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: 'Send valid details.' }, { status: 400 });
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if ('name' in body) {
    const name = cleanText(body.name, 120);
    if (name.length < 2) return NextResponse.json({ error: 'Name must have at least 2 characters.' }, { status: 400 });
    updates.name = name;
  }
  if ('description' in body) updates.description = cleanText(body.description, 1200) || null;
  if ('country' in body) updates.country = cleanText(body.country, 80) || null;
  if ('region' in body) updates.region = cleanText(body.region, 120) || null;
  if ('is_public' in body) updates.is_public = Boolean(body.is_public);
  if ('metadata' in body && body.metadata && typeof body.metadata === 'object' && !Array.isArray(body.metadata)) updates.metadata = body.metadata;
  const { data, error } = await supabase.from('workspaces').update(updates).eq('id', workspaceId).select('id,type,name,slug,status,verification_status,is_public,description,country,region,metadata').single();
  if (error) return NextResponse.json({ error: 'Changes could not be saved.' }, { status: 500 });
  await supabase.from('workspace_audit_events').insert({ workspace_id: workspaceId, actor_user_id: access.profile.id, action: 'workspace.updated', subject_type: 'workspace', subject_id: workspaceId, before_summary: workspace, after_summary: data });
  return NextResponse.json({ workspace: data });
}
