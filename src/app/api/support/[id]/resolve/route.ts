import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import { createServiceClient } from '@/lib/supabase';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) return access.response;
  const { id } = await params;
  const supabase = createServiceClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase.from('support_threads').update({ status: 'resolved', updated_at: now }).eq('id', id).eq('channel', 'in_app').eq('user_id', access.profile.id).neq('status', 'blocked').select('id, status').maybeSingle();
  if (error) return NextResponse.json({ error: 'Could not close the case.' }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Support case not found or cannot be closed.' }, { status: 404 });
  await supabase.from('support_messages').insert({ thread_id: id, direction: 'outbound', sender_type: 'system', body: 'You marked this case as resolved.', message_type: 'system', meta: { source: 'in_app' } });
  return NextResponse.json({ status: 'resolved' });
}
