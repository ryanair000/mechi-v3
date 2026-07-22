import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import { createServiceClient } from '@/lib/supabase';
import { cleanText, getWorkspaceAccess } from '@/lib/v5-workspace-access';

const STATUSES = new Set(['draft','ready','in_progress','submitted','approved','changes_requested','completed','cancelled','archived']);
export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string; itemId: string }> }) {
  const access = await requireActiveAccessProfile(request); if (access.response) return access.response;
  const { id: workspaceId, itemId } = await context.params; const supabase = createServiceClient();
  const workspace = await getWorkspaceAccess(supabase, access.profile, workspaceId);
  if (!workspace) return NextResponse.json({ error: 'This dashboard is unavailable.' }, { status: 404 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: 'Send valid changes.' }, { status: 400 });
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if ('title' in body) { const title = cleanText(body.title, 160); if (title.length < 2) return NextResponse.json({ error: 'Add a clear title.' }, { status: 400 }); updates.title = title; }
  if ('body' in body) updates.body = cleanText(body.body, 4000) || null;
  if ('status' in body) { const status = cleanText(body.status, 40); if (!STATUSES.has(status)) return NextResponse.json({ error: 'Choose a valid status.' }, { status: 400 }); updates.status = status; if (status === 'archived') updates.archived_at = new Date().toISOString(); }
  if ('due_at' in body) updates.due_at = body.due_at || null;
  const { data, error } = await supabase.from('workspace_items').update(updates).eq('id', itemId).eq('workspace_id', workspaceId).select('*').maybeSingle();
  if (error || !data) return NextResponse.json({ error: 'The record could not be updated.' }, { status: error ? 500 : 404 });
  await supabase.from('workspace_audit_events').insert({ workspace_id: workspaceId, actor_user_id: access.profile.id, action: 'workspace_item.updated', subject_type: 'workspace_item', subject_id: itemId, after_summary: updates });
  return NextResponse.json({ item: data });
}
