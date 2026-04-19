import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import { createServiceClient } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) {
    return access.response;
  }

  const authUser = access.profile;

  try {
    const supabase = createServiceClient();

    const { error } = await supabase
      .from('queue')
      .update({ status: 'cancelled' })
      .eq('user_id', authUser.id)
      .eq('status', 'waiting');

    if (error) {
      console.error('[Queue Leave] Update error:', error);
      return NextResponse.json({ error: 'Failed to leave queue' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[Queue Leave] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
