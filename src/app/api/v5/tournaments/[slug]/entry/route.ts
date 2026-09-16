import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import { createServiceClient } from '@/lib/supabase';
import { isTournamentPubliclyAccessible } from '@/lib/tournament-policy';
import { getTournamentPaymentMetrics, getTournamentPrizeSnapshot } from '@/lib/tournament-metrics';

const ENTRY_SELECT = 'id, slug, title, game, platform, region, size, entry_fee, prize_pool_mode, prize_pool, platform_fee, platform_fee_rate, status, approval_status, scheduled_for, participant_type, team_size, valuable_reward_exists, reward_description';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) return access.response;

  const { slug } = await params;

  try {
    const supabase = createServiceClient();
    const { data: tournament, error } = await supabase
      .from('tournaments')
      .select(ENTRY_SELECT)
      .eq('slug', slug)
      .maybeSingle();

    if (error) throw error;
    if (!tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }

    if (!isTournamentPubliclyAccessible({
      entryFee: tournament.entry_fee,
      prizePool: tournament.prize_pool,
      prizePoolMode: tournament.prize_pool_mode,
      approvalStatus: tournament.approval_status,
    })) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }

    const { data: players, error: playerError } = await supabase
      .from('tournament_players')
      .select('payment_status')
      .eq('tournament_id', tournament.id)
      .in('payment_status', ['paid', 'free']);

    if (playerError) throw playerError;

    const metrics = getTournamentPaymentMetrics(players ?? []);
    const prize = getTournamentPrizeSnapshot({
      entryFee: Number(tournament.entry_fee ?? 0),
      paidPlayerCount: metrics.paidCount,
      feeRate: Number(tournament.platform_fee_rate ?? 5),
      prizePoolMode: tournament.prize_pool_mode,
      storedPrizePool: Number(tournament.prize_pool ?? 0),
      storedPlatformFee: Number(tournament.platform_fee ?? 0),
    });

    return NextResponse.json({
      tournament: {
        ...tournament,
        player_count: metrics.confirmedCount,
        prize_pool: prize.prizePool,
      },
    });
  } catch (error) {
    console.error('[V5 tournament entry] load failed', error);
    return NextResponse.json({ error: 'Tournament data is temporarily unavailable' }, { status: 500 });
  }
}
