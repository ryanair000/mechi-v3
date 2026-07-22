import { GAMES, getCanonicalGameKey } from '@/lib/config';
import { unstable_cache } from 'next/cache';
import { filterVisibleTournaments } from '@/lib/e2e-fixtures';
import { getCountryLabel, normalizeCountryKey } from '@/lib/location';
import { createServiceClient } from '@/lib/supabase';
import { isTournamentPubliclyAccessible } from '@/lib/tournament-policy';
import { getTournamentPaymentMetrics, getTournamentPrizeSnapshot } from '@/lib/tournament-metrics';
import { APP_URL } from '@/lib/urls';
import type { GameKey, TournamentPrizePoolMode, TournamentStatus } from '@/types';

type PublicProfileRelation =
  | { id: string; username: string }
  | Array<{ id: string; username: string }>
  | null
  | undefined;

type TournamentRow = {
  id: string;
  slug: string;
  title: string;
  game: GameKey;
  platform?: string | null;
  region: string;
  size: number;
  entry_fee: number;
  prize_pool_mode?: TournamentPrizePoolMode | string | null;
  prize_pool: number;
  platform_fee?: number | null;
  platform_fee_rate?: number | null;
  status: TournamentStatus;
  approval_status?: string | null;
  rules?: string | null;
  scheduled_for?: string | null;
  started_at?: string | null;
  ended_at?: string | null;
  created_at: string;
  organizer?: PublicProfileRelation;
  winner?: PublicProfileRelation;
};

const PUBLIC_TOURNAMENT_REVALIDATE_SECONDS = 30;
// Keep public navigation responsive without aborting normal cross-region Supabase reads.
const PUBLIC_TOURNAMENT_QUERY_TIMEOUT_MS = 5000;

export type PublicTournament = {
  slug: string;
  title: string;
  game: GameKey;
  game_label: string;
  platform: string | null;
  region: string;
  size: number;
  player_count: number;
  slots_left: number;
  entry_fee: number;
  prize_pool: number;
  prize_pool_mode: TournamentPrizePoolMode | string | null;
  status: TournamentStatus;
  rules: string | null;
  scheduled_for: string | null;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
  organizer: { id: string; username: string } | null;
  winner: { id: string; username: string } | null;
  links: {
    public: string;
    app: string;
    embed: string;
    organizer: string | null;
  };
};

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

function safeStatus(value: string | null | undefined): TournamentStatus | 'all' {
  return ['open', 'full', 'active', 'completed', 'cancelled'].includes(String(value))
    ? (value as TournamentStatus)
    : 'all';
}

async function attachCounts(
  rows: TournamentRow[],
  signal?: AbortSignal
): Promise<PublicTournament[]> {
  if (!rows.length) return [];

  const supabase = createServiceClient();
  const { data: players } = await supabase
    .from('tournament_players')
    .select('tournament_id, payment_status')
    .in(
      'tournament_id',
      rows.map((row) => row.id)
    )
    .in('payment_status', ['paid', 'free'])
    .abortSignal(signal ?? AbortSignal.timeout(PUBLIC_TOURNAMENT_QUERY_TIMEOUT_MS));

  const playersByTournament = (players ?? []).reduce<
    Record<string, Array<{ payment_status: string | null | undefined }>>
  >((grouped, player) => {
    const tournamentId = player.tournament_id as string | undefined;
    if (!tournamentId) return grouped;
    grouped[tournamentId] = [
      ...(grouped[tournamentId] ?? []),
      { payment_status: (player.payment_status as string | null | undefined) ?? null },
    ];
    return grouped;
  }, {});

  return rows.map((row) => {
    const paymentMetrics = getTournamentPaymentMetrics(playersByTournament[row.id] ?? []);
    const prize = getTournamentPrizeSnapshot({
      entryFee: Number(row.entry_fee ?? 0),
      paidPlayerCount: paymentMetrics.paidCount,
      feeRate: Number(row.platform_fee_rate ?? 5),
      prizePoolMode: row.prize_pool_mode,
      storedPrizePool: Number(row.prize_pool ?? 0),
      storedPlatformFee: Number(row.platform_fee ?? 0),
    });
    const organizer = firstRelation(row.organizer);
    const winner = firstRelation(row.winner);

    return {
      slug: row.slug,
      title: row.title,
      game: row.game,
      game_label: GAMES[row.game]?.label ?? row.game,
      platform: row.platform ?? null,
      region: row.region,
      size: row.size,
      player_count: paymentMetrics.confirmedCount,
      slots_left: Math.max(0, row.size - paymentMetrics.confirmedCount),
      entry_fee: Number(row.entry_fee ?? 0),
      prize_pool: prize.prizePool,
      prize_pool_mode: row.prize_pool_mode ?? null,
      status: row.status,
      rules: row.rules ?? null,
      scheduled_for: row.scheduled_for ?? null,
      started_at: row.started_at ?? null,
      ended_at: row.ended_at ?? null,
      created_at: row.created_at,
      organizer,
      winner,
      links: {
        public: `${APP_URL}/s/t/${encodeURIComponent(row.slug)}`,
        app: `${APP_URL}/t/${encodeURIComponent(row.slug)}`,
        embed: `${APP_URL}/embed/tournaments/${encodeURIComponent(row.slug)}`,
        organizer: organizer ? `${APP_URL}/o/${encodeURIComponent(organizer.username)}` : null,
      },
    };
  });
}

async function queryPublicTournaments(
  statusValue: string | null,
  gameValue: string | null,
  countryValue: string | null,
  limitValue: number
) {
  const signal = AbortSignal.timeout(PUBLIC_TOURNAMENT_QUERY_TIMEOUT_MS);
  const supabase = createServiceClient();
  const status = safeStatus(statusValue);
  const country = normalizeCountryKey(countryValue);
  const limit = Math.min(Math.max(limitValue, 1), 50);

  let query = supabase
    .from('tournaments')
    .select(
      'id, slug, title, game, platform, region, size, entry_fee, prize_pool_mode, prize_pool, platform_fee, platform_fee_rate, status, approval_status, rules, scheduled_for, started_at, ended_at, created_at, organizer:organizer_id(id, username), winner:winner_id(id, username)'
    )
    .or('approval_status.eq.approved,entry_fee.eq.0')
    .neq('status', 'cancelled')
    .order('created_at', { ascending: false })
    .limit(limit)
    .abortSignal(signal);

  if (status !== 'all') {
    query = query.eq('status', status);
  }

  if (gameValue && GAMES[gameValue as GameKey]) {
    query = query.eq('game', getCanonicalGameKey(gameValue as GameKey));
  }

  if (country) {
    query = query.ilike('region', `${getCountryLabel(country)}%`);
  }

  const { data, error } = await query;
  if (error) throw error;

  const rows = filterVisibleTournaments((data ?? []) as unknown as TournamentRow[]).filter(
    (tournament) =>
      isTournamentPubliclyAccessible({
        entryFee: tournament.entry_fee,
        prizePool: tournament.prize_pool,
        prizePoolMode: tournament.prize_pool_mode,
        approvalStatus: tournament.approval_status,
      })
  );
  return attachCounts(rows, signal);
}

const getCachedPublicTournaments = unstable_cache(
  queryPublicTournaments,
  ['public-tournaments-v1'],
  {
    revalidate: PUBLIC_TOURNAMENT_REVALIDATE_SECONDS,
    tags: ['public-tournaments'],
  }
);

export async function listPublicTournaments(params: {
  status?: string | null;
  game?: string | null;
  country?: string | null;
  limit?: number;
}) {
  return getCachedPublicTournaments(
    params.status ?? null,
    params.game ?? null,
    params.country ?? null,
    Math.min(Math.max(Number(params.limit ?? 24), 1), 50)
  );
}

async function queryPublicTournamentBySlug(slug: string) {
  const signal = AbortSignal.timeout(PUBLIC_TOURNAMENT_QUERY_TIMEOUT_MS);
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('tournaments')
    .select(
      'id, slug, title, game, platform, region, size, entry_fee, prize_pool_mode, prize_pool, platform_fee, platform_fee_rate, status, approval_status, rules, scheduled_for, started_at, ended_at, created_at, organizer:organizer_id(id, username), winner:winner_id(id, username)'
    )
    .eq('slug', slug)
    .or('approval_status.eq.approved,entry_fee.eq.0')
    .neq('status', 'cancelled')
    .abortSignal(signal)
    .maybeSingle();

  if (error || !data) return null;

  const [visible] = filterVisibleTournaments([data as unknown as TournamentRow]);
  if (
    !visible ||
    !isTournamentPubliclyAccessible({
      entryFee: visible.entry_fee,
      prizePool: visible.prize_pool,
      prizePoolMode: visible.prize_pool_mode,
      approvalStatus: visible.approval_status,
    })
  ) {
    return null;
  }

  const [tournament] = await attachCounts([visible], signal);
  return tournament ?? null;
}

const getCachedPublicTournamentBySlug = unstable_cache(
  queryPublicTournamentBySlug,
  ['public-tournament-by-slug-v1'],
  {
    revalidate: PUBLIC_TOURNAMENT_REVALIDATE_SECONDS,
    tags: ['public-tournaments'],
  }
);

export async function getPublicTournamentBySlug(slug: string) {
  return getCachedPublicTournamentBySlug(slug.trim().toLowerCase());
}
