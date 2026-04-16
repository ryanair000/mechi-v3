import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const authUser = getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('achievements')
      .select('achievement_key')
      .eq('user_id', authUser.sub)
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
