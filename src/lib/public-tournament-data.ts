import { GAMES, getCanonicalGameKey } from '@/lib/config';
import { filterVisibleTournaments } from '@/lib/e2e-fixtures';
import { getCountryLabel, normalizeCountryKey } from '@/lib/location';
import { createServiceClient } from '@/lib/supabase';
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
  rules?: string | null;
  scheduled_for?: string | null;
  started_at?: string | null;
  ended_at?: string | null;
  created_at: string;
  organizer?: PublicProfileRelation;
  winner?: PublicProfileRelation;
};

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

async function attachCounts(rows: TournamentRow[]): Promise<PublicTournament[]> {
  if (!rows.length) return [];

  const supabase = createServiceClient();
  const { data: players } = await supabase
    .from('tournament_players')
    .select('tournament_id, payment_status')
    .in(
      'tournament_id',
      rows.map((row) => row.id)
    )
    .in('payment_status', ['paid', 'free']);

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

export async function listPublicTournaments(params: {
  status?: string | null;
  game?: string | null;
  country?: string | null;
  limit?: number;
}) {
  const supabase = createServiceClient();
  const status = safeStatus(params.status);
  const country = normalizeCountryKey(params.country);
  const limit = Math.min(Math.max(Number(params.limit ?? 24), 1), 50);

  let query = supabase
    .from('tournaments')
    .select(
      'id, slug, title, game, platform, region, size, entry_fee, prize_pool_mode, prize_pool, platform_fee, platform_fee_rate, status, rules, scheduled_for, started_at, ended_at, created_at, organizer:organizer_id(id, username), winner:winner_id(id, username)'
    )
    .eq('approval_status', 'approved')
    .neq('status', 'cancelled')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (status !== 'all') {
    query = query.eq('status', status);
  }

  if (params.game && GAMES[params.game as GameKey]) {
    query = query.eq('game', getCanonicalGameKey(params.game as GameKey));
  }

  if (country) {
    query = query.ilike('region', `${getCountryLabel(country)}%`);
  }

  const { data, error } = await query;
  if (error) throw error;

  const rows = filterVisibleTournaments((data ?? []) as unknown as TournamentRow[]);
  return attachCounts(rows);
}

export async function getPublicTournamentBySlug(slug: string) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('tournaments')
    .select(
      'id, slug, title, game, platform, region, size, entry_fee, prize_pool_mode, prize_pool, platform_fee, platform_fee_rate, status, rules, scheduled_for, started_at, ended_at, created_at, organizer:organizer_id(id, username), winner:winner_id(id, username)'
    )
    .eq('slug', slug)
    .eq('approval_status', 'approved')
    .neq('status', 'cancelled')
    .maybeSingle();

  if (error || !data) return null;

  const [visible] = filterVisibleTournaments([data as unknown as TournamentRow]);
  if (!visible) return null;

  const [tournament] = await attachCounts([visible]);
  return tournament ?? null;
}
