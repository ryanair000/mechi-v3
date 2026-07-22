import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import { createServiceClient } from '@/lib/supabase';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) return access.response;
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const message = String(body.message ?? '').trim().slice(0, 5000);
  if (message.length < 2) return NextResponse.json({ error: 'Write a message before sending.' }, { status: 400 });
  const supabase = createServiceClient();
  const { data: thread } = await supabase.from('support_threads').select('id, status').eq('id', id).eq('channel', 'in_app').eq('user_id', access.profile.id).maybeSingle();
  if (!thread) return NextResponse.json({ error: 'Support case not found.' }, { status: 404 });
  if (thread.status === 'blocked') return NextResponse.json({ error: 'This case cannot receive new messages.' }, { status: 403 });
  const now = new Date().toISOString();
  const { data: saved, error } = await supabase.from('support_messages').insert({ thread_id: id, direction: 'inbound', sender_type: 'user', body: message, message_type: 'text', meta: { source: 'in_app' } }).select('id, direction, sender_type, body, created_at').single();
  if (error || !saved) return NextResponse.json({ error: 'Could not send the message.' }, { status: 500 });
  await supabase.from('support_threads').update({ status: 'waiting_on_human', last_message_at: now, updated_at: now }).eq('id', id).eq('user_id', access.profile.id);
  return NextResponse.json({ message: saved }, { status: 201 });
}

