import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import { createServiceClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) {
    return access.response;
  }

  const authUser = access.profile;

  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('achievements')
      .select('achievement_key')
      .eq('user_id', authUser.id)
      .order('unlocked_at', { ascending: false });

    if (error) {
      console.error('[Achievements GET] Error:', error);
      return NextResponse.json({ achievements: [] });
    }

    const achievements = (data ?? [])
      .map((row) => row.achievement_key)
      .filter((key): key is string => typeof key === 'string' && key.length > 0);

    return NextResponse.json({ achievements });
  } catch (err) {
    console.error('[Achievements GET] Error:', err);
    return NextResponse.json({ achievements: [] });
  }
}
