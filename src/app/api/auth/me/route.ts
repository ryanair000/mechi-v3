import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const authUser = getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceClient();
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', authUser.sub)
    .single();

  if (error || !profile) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password_hash: _hash, ...safeProfile } = profile;

  return NextResponse.json({ user: safeProfile });
}
