import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import { createServiceClient } from '@/lib/supabase';
import { cleanText, getWorkspaceAccess } from '@/lib/v5-workspace-access';

const TABLES = { announcements: 'workspace_announcements', finance: 'workspace_finance_records', verification: 'workspace_verification_requests' } as const;
type RecordType = keyof typeof TABLES;

export async function GET(request: NextRequest, context: { params: Promise<{ workspaceId: string; recordType: string }> }) {
  const access = await requireActiveAccessProfile(request); if (access.response) return access.response;
  const { workspaceId, recordType: rawType } = await context.params; const recordType = rawType as RecordType;
  if (!(recordType in TABLES)) return NextResponse.json({ error: 'Record type not found.' }, { status: 404 });
  const supabase = createServiceClient(); const workspace = await getWorkspaceAccess(supabase, access.profile, workspaceId);
  if (!workspace) return NextResponse.json({ error: 'This dashboard is unavailable.' }, { status: 404 });
  const { data, error } = await supabase.from(TABLES[recordType]).select('*').eq('workspace_id', workspaceId).order('created_at', { ascending: false }).limit(100);
  return NextResponse.json({ records: error ? [] : data ?? [], migration_pending: error?.code === '42P01' });
}

export async function POST(request: NextRequest, context: { params: Promise<{ workspaceId: string; recordType: string }> }) {
  const access = await requireActiveAccessProfile(request); if (access.response) return access.response;
  const { workspaceId, recordType: rawType } = await context.params; const recordType = rawType as RecordType;
  if (!(recordType in TABLES)) return NextResponse.json({ error: 'Record type not found.' }, { status: 404 });
  const supabase = createServiceClient(); const workspace = await getWorkspaceAccess(supabase, access.profile, workspaceId);
  if (!workspace) return NextResponse.json({ error: 'This dashboard is unavailable.' }, { status: 404 });
  if (!workspace.canManage && recordType !== 'verification') return NextResponse.json({ error: 'Only an owner or manager can create this record.' }, { status: 403 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null; if (!body) return NextResponse.json({ error: 'Send valid details.' }, { status: 400 });
  let insert: Record<string, unknown>;
  if (recordType === 'announcements') {
    const title = cleanText(body.title, 140); const message = cleanText(body.body, 4000); const audience = cleanText(body.audience || 'members', 30);
    if (title.length < 2 || message.length < 2 || !['members','participants','staff','public'].includes(audience)) return NextResponse.json({ error: 'Add a title, message and valid audience.' }, { status: 400 });
    insert = { workspace_id: workspaceId, tournament_id: body.tournament_id || null, created_by: access.profile.id, title, body: message, audience, status: body.publish ? 'published' : 'draft', published_at: body.publish ? new Date().toISOString() : null };
  } else if (recordType === 'finance') {
    const kind = cleanText(body.kind, 30); const amount = Number(body.amount); const currency = cleanText(body.currency || 'KES', 3).toUpperCase();
    if (!['budget','sponsorship','expense','prize','payout','refund','fee'].includes(kind) || !Number.isFinite(amount) || amount < 0 || currency.length !== 3) return NextResponse.json({ error: 'Add a valid finance type, amount and currency.' }, { status: 400 });
    insert = { workspace_id: workspaceId, tournament_id: body.tournament_id || null, created_by: access.profile.id, kind, status: 'draft', amount, currency, reference: cleanText(body.reference, 160) || null, note: cleanText(body.note, 1200) || null };
  } else {
    const note = cleanText(body.note, 1200); const evidence = Array.isArray(body.evidence) ? body.evidence.slice(0, 20) : [];
    if (note.length < 10 && !evidence.length) return NextResponse.json({ error: 'Add a note or evidence for review.' }, { status: 400 });
    const { data: pending } = await supabase.from(TABLES.verification).select('id').eq('workspace_id', workspaceId).eq('status', 'pending').maybeSingle();
    if (pending) return NextResponse.json({ error: 'A verification request is already under review.' }, { status: 409 });
    insert = { workspace_id: workspaceId, requested_by: access.profile.id, status: 'pending', evidence, request_note: note || null };
  }
  const { data, error } = await supabase.from(TABLES[recordType]).insert(insert).select('*').single();
  if (error) return NextResponse.json({ error: 'The record could not be saved.' }, { status: error.code === '42P01' ? 503 : 500 });
  if (recordType === 'verification') await supabase.from('workspaces').update({ verification_status: 'pending', status: 'pending_verification', updated_at: new Date().toISOString() }).eq('id', workspaceId);
  await supabase.from('workspace_audit_events').insert({ workspace_id: workspaceId, actor_user_id: access.profile.id, action: `${recordType}.created`, subject_type: TABLES[recordType], subject_id: data.id, after_summary: data });
  return NextResponse.json({ record: data }, { status: 201 });
}
