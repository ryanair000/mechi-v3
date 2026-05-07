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

    const { data: match, error } = await supabase
      .from('matches')
      .select('*')
      .or(`player1_id.eq.${authUser.id},player2_id.eq.${authUser.id}`)
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
