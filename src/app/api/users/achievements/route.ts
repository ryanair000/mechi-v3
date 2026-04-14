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
      .select('achievement_key, unlocked_at')
      .eq('user_id', authUser.sub)
      .order('unlocked_at', { ascending: false });

    if (error) {
      const message = error.message?.toLowerCase() ?? '';
      if (message.includes('relation') || message.includes('does not exist')) {
        return NextResponse.json({ achievements: [] });
      }

      return NextResponse.json({ error: 'Failed to fetch achievements' }, { status: 500 });
    }

    return NextResponse.json({
      achievements: (data ?? []).map((entry) => entry.achievement_key),
    });
  } catch (err) {
    console.error('[Achievements GET] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
