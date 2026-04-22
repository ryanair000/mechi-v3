import { NextRequest, NextResponse } from 'next/server';
import { getRequestAccessProfile, hasModeratorAccess } from '@/lib/access';
import { shouldHideE2EFixtures } from '@/lib/e2e-fixtures';
import { expireWaitingQueueEntries, getQueueExpiryCutoffIso } from '@/lib/queue';
import { createServiceClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const user = await getRequestAccessProfile(request);
  if (!user || !hasModeratorAccess(user) || user.is_banned) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const supabase = createServiceClient();
    await expireWaitingQueueEntries(supabase);
    const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const staleQueueThreshold = getQueueExpiryCutoffIso();
    const hideE2EFixtures = shouldHideE2EFixtures();

    const tournamentCountQuery = (status?: string, payoutStatus?: string) => {
      let query = supabase.from('tournaments').select('id', { count: 'exact', head: true });

      if (hideE2EFixtures) {
        query = query.not('title', 'ilike', '%e2e%').not('slug', 'ilike', '%e2e%');
      }

      if (status) {
        query = query.eq('status', status);
      }

      if (payoutStatus) {
        query = query.eq('payout_status', payoutStatus);
      }

      return query;
    };

    const completedTournamentPrizeQuery = () => {
      let query = supabase.from('tournaments').select('prize_pool').eq('status', 'completed');

      if (hideE2EFixtures) {
        query = query.not('title', 'ilike', '%e2e%').not('slug', 'ilike', '%e2e%');
      }

      return query;
    };

    const lobbyCountQuery = (status: 'open' | 'full' | 'in_progress') => {
      let query = supabase.from('lobbies').select('id', { count: 'exact', head: true }).eq('status', status);

      if (hideE2EFixtures) {
        query = query.not('title', 'ilike', '%e2e%').not('room_code', 'ilike', '%e2e%');
      }

      return query;
    };

    const overdueLobbiesQuery = () => {
      let query = supabase
        .from('lobbies')
        .select('id', { count: 'exact', head: true })
        .in('status', ['open', 'full'])
        .lt('scheduled_for', new Date().toISOString());

      if (hideE2EFixtures) {
        query = query.not('title', 'ilike', '%e2e%').not('room_code', 'ilike', '%e2e%');
      }

      return query;
    };

    const [
      { count: totalUsers },
      { count: bannedUsers },
      { count: newUsers7d },
      { count: totalMatches },
      { count: disputedMatches },
      { count: activeMatches },
      { count: totalTournaments },
      { count: activeTournaments },
      { count: waitingQueue },
      oldestQueueResult,
      { count: staleQueueEntries },
      { count: openLobbies },
      { count: fullLobbies },
      { count: inProgressLobbies },
      { count: overdueLobbies },
      { count: pendingPayouts },
      prizeResult,
    ] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('is_banned', true),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', since7d),
      supabase.from('matches').select('id', { count: 'exact', head: true }),
      supabase.from('matches').select('id', { count: 'exact', head: true }).eq('status', 'disputed'),
      supabase.from('matches').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      tournamentCountQuery(),
      tournamentCountQuery('active'),
      supabase.from('queue').select('id', { count: 'exact', head: true }).eq('status', 'waiting'),
      supabase
        .from('queue')
        .select('joined_at')
        .eq('status', 'waiting')
        .order('joined_at', { ascending: true })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('queue')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'waiting')
        .lt('joined_at', staleQueueThreshold),
      lobbyCountQuery('open'),
      lobbyCountQuery('full'),
      lobbyCountQuery('in_progress'),
      overdueLobbiesQuery(),
      tournamentCountQuery(undefined, 'pending'),
      completedTournamentPrizeQuery(),
    ]);

    const totalPrizeDistributed = (prizeResult.data ?? []).reduce(
      (total, tournament) => total + ((tournament.prize_pool as number | null) ?? 0),
      0
    );
    const oldestQueueJoinedAt = oldestQueueResult.data?.joined_at ?? null;
    const longestQueueWaitMinutes = oldestQueueJoinedAt
      ? Math.max(
          0,
          Math.floor((Date.now() - new Date(oldestQueueJoinedAt).getTime()) / 60_000)
        )
      : 0;

    return NextResponse.json({
      users: { total: totalUsers ?? 0, banned: bannedUsers ?? 0, new7d: newUsers7d ?? 0 },
      matches: {
        total: totalMatches ?? 0,
        disputed: disputedMatches ?? 0,
        active: activeMatches ?? 0,
      },
      tournaments: { total: totalTournaments ?? 0, active: activeTournaments ?? 0 },
      queue: {
        waiting: waitingQueue ?? 0,
        longestWaitMinutes: longestQueueWaitMinutes,
        staleEntries: staleQueueEntries ?? 0,
      },
      lobbies: {
        open: openLobbies ?? 0,
        full: fullLobbies ?? 0,
        inProgress: inProgressLobbies ?? 0,
        overdue: overdueLobbies ?? 0,
      },
      finance: {
        totalPrizeDistributed,
        pendingPayouts: pendingPayouts ?? 0,
      },
    });
  } catch (err) {
    console.error('[Admin Stats] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
