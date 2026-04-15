import { NextRequest, NextResponse } from 'next/server';
import { getRequestAccessProfile, hasModeratorAccess } from '@/lib/access';
import { createServiceClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const user = await getRequestAccessProfile(request);
  if (!user || !hasModeratorAccess(user) || user.is_banned) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const supabase = createServiceClient();
    const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [
      { count: totalUsers },
      { count: bannedUsers },
      { count: newUsers7d },
      { count: totalMatches },
      { count: disputedMatches },
      { count: activeMatches },
      { count: totalTournaments },
      { count: activeTournaments },
      prizeResult,
    ] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('is_banned', true),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', since7d),
      supabase.from('matches').select('id', { count: 'exact', head: true }),
      supabase.from('matches').select('id', { count: 'exact', head: true }).eq('status', 'disputed'),
      supabase.from('matches').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('tournaments').select('id', { count: 'exact', head: true }),
      supabase.from('tournaments').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('tournaments').select('prize_pool').eq('status', 'completed'),
    ]);

    const totalPrizeDistributed = (prizeResult.data ?? []).reduce(
      (total, tournament) => total + ((tournament.prize_pool as number | null) ?? 0),
      0
    );

    return NextResponse.json({
      users: { total: totalUsers ?? 0, banned: bannedUsers ?? 0, new7d: newUsers7d ?? 0 },
      matches: {
        total: totalMatches ?? 0,
        disputed: disputedMatches ?? 0,
        active: activeMatches ?? 0,
      },
      tournaments: { total: totalTournaments ?? 0, active: activeTournaments ?? 0 },
      finance: { totalPrizeDistributed },
    });
  } catch (err) {
    console.error('[Admin Stats] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
