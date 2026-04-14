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

    const { data: match, error } = await supabase
      .from('matches')
      .select('*')
      .or(`player1_id.eq.${authUser.sub},player2_id.eq.${authUser.sub}`)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !match) {
      return NextResponse.json({ match: null });
    }

    // Fetch profiles
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, game_ids, platforms')
      .in('id', [match.player1_id, match.player2_id]);

    const player1 = profiles?.find((p: { id: string }) => p.id === match.player1_id) ?? null;
    const player2 = profiles?.find((p: { id: string }) => p.id === match.player2_id) ?? null;

    return NextResponse.json({ match: { ...match, player1, player2 } });
  } catch (err) {
    console.error('[Matches Current] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
