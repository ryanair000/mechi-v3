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

    // Get current queue entry
    const { data: queueEntry } = await supabase
      .from('queue')
      .select('*')
      .eq('user_id', authUser.sub)
      .eq('status', 'waiting')
      .order('joined_at', { ascending: false })
      .limit(1)
      .single();

    // Also check for active match
    const { data: activeMatch } = await supabase
      .from('matches')
      .select('id, game, status')
      .or(`player1_id.eq.${authUser.sub},player2_id.eq.${authUser.sub}`)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    return NextResponse.json({
      inQueue: !!queueEntry,
      queueEntry: queueEntry ?? null,
      activeMatch: activeMatch ?? null,
    });
  } catch (err) {
    console.error('[Queue Status] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
