import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import { createServiceClient } from '@/lib/supabase';

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
    return NextResponse.json({ error: 'Send a valid invitation response.' }, { status: 400 });
  }
  const response = String(body.response ?? '').trim().toLowerCase();
  if (response !== 'accepted' && response !== 'declined') {
    return NextResponse.json({ error: 'Choose accepted or declined.' }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase.rpc('respond_v5_workspace_invitation', {
    p_invitation_id: id,
    p_actor_id: session.profile.id,
    p_response: response,
  });
  if (error || !data) {
    const status = error?.code === '42501' ? 403 : error?.code === 'P0002' ? 404 : 409;
    return NextResponse.json({ error: 'Invitation could not be updated.' }, { status });
  }
  const result = data as { status?: string };
  return NextResponse.json(result, { status: result.status === 'expired' ? 410 : 200 });
}
