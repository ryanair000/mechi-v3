import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import { normalizePassportUsername } from '@/lib/passport';
import { getPassportRelationshipState } from '@/lib/passport-social';
import { createServiceClient } from '@/lib/supabase';

export async function GET(request: NextRequest, { params }: { params: Promise<{ username: string }> }) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) return access.response;
  const username = normalizePassportUsername((await params).username);
  const { data } = await createServiceClient().from('profiles').select('id').ilike('username', username).maybeSingle();
  if (!data) return NextResponse.json({ error: 'Player not found' }, { status: 404 });
  return NextResponse.json({ target_id: data.id, state: await getPassportRelationshipState(access.profile.id, data.id) });
}
