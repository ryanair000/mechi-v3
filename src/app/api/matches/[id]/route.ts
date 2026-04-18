import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import { createServiceClient } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) {
    return access.response;
  }

  const authUser = access.profile;
  const { id } = await params;

  try {
    const supabase = createServiceClient();

    const { data: match, error } = await supabase
      .from('matches')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    // Verify user is part of this match
    if (match.player1_id !== authUser.id && match.player2_id !== authUser.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, game_ids, platforms')
      .in('id', [match.player1_id, match.player2_id]);

    const player1 = profiles?.find((p: { id: string }) => p.id === match.player1_id) ?? null;
    const player2 = profiles?.find((p: { id: string }) => p.id === match.player2_id) ?? null;

    return NextResponse.json({ match: { ...match, player1, player2 } });
  } catch (err) {
    console.error('[Match GET] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
