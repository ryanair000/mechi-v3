import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import { createServiceClient } from '@/lib/supabase';
import { cleanText, getWorkspaceAccess } from '@/lib/v5-workspace-access';

const KINDS = new Set(['task','content','guide','analysis','brief','campaign','venue_fact','staff_note','document']);

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const access = await requireActiveAccessProfile(request); if (access.response) return access.response;
  const { id: workspaceId } = await context.params; const supabase = createServiceClient();
  const workspace = await getWorkspaceAccess(supabase, access.profile, workspaceId);
  if (!workspace) return NextResponse.json({ error: 'This dashboard is unavailable.' }, { status: 404 });
  const { data, error } = await supabase.from('workspace_items').select('id,kind,title,body,status,due_at,metadata,created_at,updated_at,assigned_to').eq('workspace_id', workspaceId).is('archived_at', null).order('created_at', { ascending: false }).limit(100);
  return NextResponse.json({ items: error ? [] : data ?? [], migration_pending: error?.code === '42P01' });
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const access = await requireActiveAccessProfile(request); if (access.response) return access.response;
  const { id: workspaceId } = await context.params; const supabase = createServiceClient();
  const workspace = await getWorkspaceAccess(supabase, access.profile, workspaceId);
  if (!workspace) return NextResponse.json({ error: 'This dashboard is unavailable.' }, { status: 404 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const kind = cleanText(body?.kind, 40); const title = cleanText(body?.title, 160); const content = cleanText(body?.body, 4000);
  if (!KINDS.has(kind)) return NextResponse.json({ error: 'Choose a valid record type.' }, { status: 400 });
  if (title.length < 2) return NextResponse.json({ error: 'Add a clear title.' }, { status: 400 });
  const { data, error } = await supabase.from('workspace_items').insert({ workspace_id: workspaceId, created_by: access.profile.id, kind, title, body: content || null, status: 'draft', due_at: body?.due_at || null, metadata: body?.metadata && typeof body.metadata === 'object' ? body.metadata : {} }).select('*').single();
  if (error) return NextResponse.json({ error: error.code === '42P01' ? 'Storage is being upgraded. Try again shortly.' : 'The record could not be created.' }, { status: error.code === '42P01' ? 503 : 500 });
  await supabase.from('workspace_audit_events').insert({ workspace_id: workspaceId, actor_user_id: access.profile.id, action: `${kind}.created`, subject_type: 'workspace_item', subject_id: data.id, after_summary: { kind, title } });
  return NextResponse.json({ item: data }, { status: 201 });
}
