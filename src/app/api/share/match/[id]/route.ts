import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

/** Public endpoint — returns match data for share pages and OG images (no auth) */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const supabase = createServiceClient();

    const { data: match } = await supabase
      .from('matches')
      .select('*')
      .eq('id', id)
      .eq('status', 'completed')
      .single();

    if (!match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, platforms, selected_games, region')
      .in('id', [match.player1_id, match.player2_id]);

    const player1 = profiles?.find((p: { id: string }) => p.id === match.player1_id);
    const player2 = profiles?.find((p: { id: string }) => p.id === match.player2_id);

    return NextResponse.json({
      match: {
        id: match.id,
        game: match.game,
        winner_id: match.winner_id,
        player1_score: match.player1_score ?? null,
        player2_score: match.player2_score ?? null,
        rating_change_p1: match.rating_change_p1,
        rating_change_p2: match.rating_change_p2,
        completed_at: match.completed_at,
        player1: player1 ? { id: player1.id, username: player1.username } : null,
        player2: player2 ? { id: player2.id, username: player2.username } : null,
      },
    });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
