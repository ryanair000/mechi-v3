import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, profileToAuthUser } from '@/lib/auth';
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

  if (profile.is_banned) {
    return NextResponse.json(
      { error: `Account suspended: ${profile.ban_reason ?? 'Contact support.'}` },
      { status: 403 }
    );
  }

  return NextResponse.json({ user: profileToAuthUser(profile) });
}
