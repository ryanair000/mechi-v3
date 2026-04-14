import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { getLevelFromXp, getRankDivision } from '@/lib/gamification';

/** Public endpoint — returns match data for share pages and OG images (no auth). */
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
      .select('*')
      .in('id', [match.player1_id, match.player2_id]);

    const player1 = profiles?.find((p: { id: string }) => p.id === match.player1_id) ?? null;
    const player2 = profiles?.find((p: { id: string }) => p.id === match.player2_id) ?? null;
    const winner = match.winner_id === match.player1_id ? player1 : player2;
    const winnerRating = ((winner as Record<string, unknown> | null)?.[`rating_${match.game}`] as number) ?? 1000;
    const division = getRankDivision(winnerRating);
    const winnerXp = (winner?.xp as number | null) ?? 0;
    const winnerLevel =
      (match.winner_id === match.player1_id
        ? match.gamification_summary_p1?.newLevel
        : match.gamification_summary_p2?.newLevel) ??
      ((winner?.level as number | null) ?? getLevelFromXp(winnerXp));

    return NextResponse.json({
      match: {
        id: match.id,
        game: match.game,
        winner_id: match.winner_id,
        completed_at: match.completed_at,
        winnerDivision: division.label,
        winnerLevel,
        gamification_summary_p1: match.gamification_summary_p1 ?? null,
        gamification_summary_p2: match.gamification_summary_p2 ?? null,
        player1: player1 ? { id: player1.id, username: player1.username } : null,
        player2: player2 ? { id: player2.id, username: player2.username } : null,
      },
    });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
