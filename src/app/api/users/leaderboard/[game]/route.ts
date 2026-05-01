import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import {
  DEFAULT_RATING,
  GAMES,
  getCanonicalGameKey,
  getGameLossesKey,
  getGameRatingKey,
  getGameWinsKey,
} from '@/lib/config';
import { isMissingColumnError } from '@/lib/db-compat';
import { getRankDivision } from '@/lib/gamification';
import { CONFIRMED_PAYMENT_STATUSES } from '@/lib/tournament-metrics';
import type { GameKey } from '@/types';

type LeaderboardPlayerRow = Record<string, unknown>;
type DrawMatchRow = {
  id?: string | null;
  player1_id?: string | null;
  player2_id?: string | null;
};
type Relation<T> = T | T[] | null | undefined;
type TournamentLeaderboardProfile = {
  avatar_url?: string | null;
  id?: string | null;
  username?: string | null;
};
type TournamentLeaderboardTournament = {
  created_at?: string | null;
  ended_at?: string | null;
  game?: string | null;
  id?: string | null;
  scheduled_for?: string | null;
  slug?: string | null;
  started_at?: string | null;
  status?: string | null;
  title?: string | null;
  winner_id?: string | null;
};
type TournamentLeaderboardPlayerRow = {
  joined_at?: string | null;
  payment_status?: string | null;
  tournament?: Relation<TournamentLeaderboardTournament>;
  user?: Relation<TournamentLeaderboardProfile>;
  user_id?: string | null;
};
type TournamentLeaderboardMatchRow = {
  player1?: Relation<TournamentLeaderboardProfile>;
  player1_id?: string | null;
  player2?: Relation<TournamentLeaderboardProfile>;
  player2_id?: string | null;
  status?: string | null;
  tournament?: Relation<TournamentLeaderboardTournament>;
  winner?: Relation<TournamentLeaderboardProfile>;
  winner_id?: string | null;
};
type TournamentWinnerRow = TournamentLeaderboardTournament & {
  winner?: Relation<TournamentLeaderboardProfile>;
};
type TournamentLeaderboardStat = {
  avatarUrl: string | null;
  id: string;
  latestDate: string | null;
  latestLabel: string | null;
  matchWins: number;
  matchesPlayed: number;
  name: string;
  points: number;
  tournamentWins: number;
  tournamentsPlayed: number;
};

function firstRelation<T>(value: Relation<T>): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function getTournamentMoment(tournament?: TournamentLeaderboardTournament | null, fallback?: string | null) {
  return tournament?.ended_at ?? tournament?.started_at ?? tournament?.scheduled_for ?? fallback ?? tournament?.created_at ?? null;
}

function touchTournamentStat(
  statsByPlayer: Map<string, TournamentLeaderboardStat>,
  profile: TournamentLeaderboardProfile | null | undefined,
  tournament?: TournamentLeaderboardTournament | null,
  fallbackDate?: string | null
) {
  const id = String(profile?.id ?? '').trim();
  if (!id) return null;

  const current = statsByPlayer.get(id) ?? {
    avatarUrl: profile?.avatar_url ?? null,
    id,
    latestDate: null,
    latestLabel: null,
    matchWins: 0,
    matchesPlayed: 0,
    name: profile?.username?.trim() || 'Player',
    points: 0,
    tournamentWins: 0,
    tournamentsPlayed: 0,
  };
  const latestDate = getTournamentMoment(tournament, fallbackDate);

  if (
    latestDate &&
    (!current.latestDate || new Date(latestDate).getTime() > new Date(current.latestDate).getTime())
  ) {
    current.latestDate = latestDate;
    current.latestLabel = tournament?.title ?? current.latestLabel;
  }

  if (!current.avatarUrl && profile?.avatar_url) {
    current.avatarUrl = profile.avatar_url;
  }
  if (profile?.username?.trim()) {
    current.name = profile.username.trim();
  }

  statsByPlayer.set(id, current);
  return current;
}

async function getTournamentLeaderboard() {
  const supabase = createServiceClient();
  const statsByPlayer = new Map<string, TournamentLeaderboardStat>();
  const tournamentParticipation = new Set<string>();

  const [playersResult, matchesResult, winnersResult] = await Promise.all([
    supabase
      .from('tournament_players')
      .select(
        'user_id, joined_at, payment_status, user:user_id(id, username, avatar_url), tournament:tournament_id(id, title, slug, game, status, winner_id, scheduled_for, started_at, ended_at, created_at)'
      )
      .in('payment_status', [...CONFIRMED_PAYMENT_STATUSES])
      .order('joined_at', { ascending: false })
      .limit(1000),
    supabase
      .from('tournament_matches')
      .select(
        'player1_id, player2_id, winner_id, status, player1:player1_id(id, username, avatar_url), player2:player2_id(id, username, avatar_url), winner:winner_id(id, username, avatar_url), tournament:tournament_id(id, title, slug, game, status, winner_id, scheduled_for, started_at, ended_at, created_at)'
      )
      .eq('status', 'completed')
      .limit(1000),
    supabase
      .from('tournaments')
      .select('id, title, slug, game, status, winner_id, scheduled_for, started_at, ended_at, created_at, winner:winner_id(id, username, avatar_url)')
      .eq('status', 'completed')
      .not('winner_id', 'is', null)
      .limit(500),
  ]);

  if (playersResult.error || matchesResult.error || winnersResult.error) {
    console.error(
      '[Leaderboard] Tournament-only query error:',
      playersResult.error ?? matchesResult.error ?? winnersResult.error
    );
    return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
  }

  for (const row of ((playersResult.data ?? []) as TournamentLeaderboardPlayerRow[])) {
    const profile = firstRelation(row.user);
    const tournament = firstRelation(row.tournament);
    const stat = touchTournamentStat(statsByPlayer, profile, tournament, row.joined_at);
    if (!stat || !tournament?.id) continue;

    const participationKey = `${stat.id}:${tournament.id}`;
    if (!tournamentParticipation.has(participationKey)) {
      tournamentParticipation.add(participationKey);
      stat.tournamentsPlayed += 1;
      stat.points += 1;
    }
  }

  for (const row of ((matchesResult.data ?? []) as TournamentLeaderboardMatchRow[])) {
    const tournament = firstRelation(row.tournament);
    const player1 = firstRelation(row.player1);
    const player2 = firstRelation(row.player2);
    const winner = firstRelation(row.winner);

    for (const player of [player1, player2]) {
      const stat = touchTournamentStat(statsByPlayer, player, tournament);
      if (stat) {
        stat.matchesPlayed += 1;
      }
    }

    const winnerStat = touchTournamentStat(statsByPlayer, winner, tournament);
    if (winnerStat) {
      winnerStat.matchWins += 1;
      winnerStat.points += 3;
    }
  }

  for (const row of ((winnersResult.data ?? []) as TournamentWinnerRow[])) {
    const winner = firstRelation(row.winner);
    const winnerStat = touchTournamentStat(statsByPlayer, winner, row);
    if (winnerStat) {
      winnerStat.tournamentWins += 1;
      winnerStat.points += 10;
    }
  }

  const leaderboard = Array.from(statsByPlayer.values())
    .filter((entry) => entry.tournamentsPlayed > 0 || entry.matchWins > 0 || entry.tournamentWins > 0)
    .sort((a, b) => {
      const pointsDelta = b.points - a.points;
      if (pointsDelta !== 0) return pointsDelta;
      const tournamentWinDelta = b.tournamentWins - a.tournamentWins;
      if (tournamentWinDelta !== 0) return tournamentWinDelta;
      const matchWinDelta = b.matchWins - a.matchWins;
      if (matchWinDelta !== 0) return matchWinDelta;
      return a.name.localeCompare(b.name);
    })
    .slice(0, 100)
    .map((entry, index) => ({
      ...entry,
      rank: index + 1,
      subtitle:
        entry.tournamentWins > 0
          ? `${entry.tournamentWins} tournament win${entry.tournamentWins === 1 ? '' : 's'}`
          : `${entry.matchWins} bracket match win${entry.matchWins === 1 ? '' : 's'}`,
    }));

  return NextResponse.json({ leaderboard, source: 'tournaments' });
}

function getLeaderboardLookupGames(game: GameKey): GameKey[] {
  const canonicalGame = getCanonicalGameKey(game);

  return (Object.keys(GAMES) as GameKey[]).filter(
    (candidate) => getCanonicalGameKey(candidate) === canonicalGame
  );
}

function dedupePlayers(players: LeaderboardPlayerRow[]): LeaderboardPlayerRow[] {
  const playersById = new Map<string, LeaderboardPlayerRow>();

  for (const player of players) {
    const id = String(player.id ?? '');
    if (!id || playersById.has(id)) continue;
    playersById.set(id, player);
  }

  return Array.from(playersById.values());
}

function resolveLeaderboardMetrics(
  player: LeaderboardPlayerRow,
  ratingKey: string,
  winsKey: string,
  lossesKey: string,
  legacyMetrics?: LeaderboardPlayerRow
) {
  const rating = (player[ratingKey] as number | undefined) ?? DEFAULT_RATING;
  const wins = (player[winsKey] as number | undefined) ?? 0;
  const losses = (player[lossesKey] as number | undefined) ?? 0;
  const hasCanonicalHistory = rating !== DEFAULT_RATING || wins > 0 || losses > 0;

  if (!legacyMetrics || hasCanonicalHistory) {
    return { rating, wins, losses };
  }

  const legacyRating =
    (legacyMetrics.rating_efootball_mobile as number | undefined) ?? DEFAULT_RATING;
  const legacyWins =
    (legacyMetrics.wins_efootball_mobile as number | undefined) ?? 0;
  const legacyLosses =
    (legacyMetrics.losses_efootball_mobile as number | undefined) ?? 0;
  const hasLegacyHistory =
    legacyRating !== DEFAULT_RATING || legacyWins > 0 || legacyLosses > 0;

  return hasLegacyHistory
    ? { rating: legacyRating, wins: legacyWins, losses: legacyLosses }
    : { rating, wins, losses };
}

function addDrawRowsToCounts(
  rows: DrawMatchRow[] | null | undefined,
  drawCounts: Map<string, number>,
  playerIds: Set<string>,
  seenMatchIds: Set<string>
) {
  for (const row of rows ?? []) {
    const matchId = String(row.id ?? '');
    if (!matchId || seenMatchIds.has(matchId)) continue;
    seenMatchIds.add(matchId);

    const player1Id = String(row.player1_id ?? '');
    const player2Id = String(row.player2_id ?? '');

    if (playerIds.has(player1Id)) {
      drawCounts.set(player1Id, (drawCounts.get(player1Id) ?? 0) + 1);
    }

    if (playerIds.has(player2Id)) {
      drawCounts.set(player2Id, (drawCounts.get(player2Id) ?? 0) + 1);
    }
  }
}

async function getDrawCounts(
  supabase: ReturnType<typeof createServiceClient>,
  playerIds: string[],
  games: GameKey[]
) {
  const drawCounts = new Map<string, number>();

  if (playerIds.length === 0 || games.length === 0) {
    return drawCounts;
  }

  const drawSelect = 'id, player1_id, player2_id';
  const [player1DrawsResult, player2DrawsResult] = await Promise.all([
    supabase
      .from('matches')
      .select(drawSelect)
      .eq('status', 'completed')
      .is('winner_id', null)
      .in('game', games)
      .in('player1_id', playerIds),
    supabase
      .from('matches')
      .select(drawSelect)
      .eq('status', 'completed')
      .is('winner_id', null)
      .in('game', games)
      .in('player2_id', playerIds),
  ]);

  if (player1DrawsResult.error || player2DrawsResult.error) {
    console.error('[Leaderboard] Draw count query error:', player1DrawsResult.error ?? player2DrawsResult.error);
    return drawCounts;
  }

  const playerIdSet = new Set(playerIds);
  const seenMatchIds = new Set<string>();
  addDrawRowsToCounts(player1DrawsResult.data as DrawMatchRow[] | null, drawCounts, playerIdSet, seenMatchIds);
  addDrawRowsToCounts(player2DrawsResult.data as DrawMatchRow[] | null, drawCounts, playerIdSet, seenMatchIds);

  return drawCounts;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ game: string }> }
) {
  const { game: requestedGame } = await params;

  if (requestedGame === 'tournaments') {
    return getTournamentLeaderboard();
  }

  if (!requestedGame || !GAMES[requestedGame as GameKey]) {
    return NextResponse.json({ error: 'Invalid game' }, { status: 400 });
  }

  const game = getCanonicalGameKey(requestedGame as GameKey);

  try {
    const supabase = createServiceClient();
    const ratingKey = getGameRatingKey(game);
    const winsKey = getGameWinsKey(game);
    const lossesKey = getGameLossesKey(game);
    const lookupGames = getLeaderboardLookupGames(game);
    const metricSelect = [
      'id',
      'username',
      'region',
      'selected_games',
      'platforms',
      'game_ids',
      'level',
      ratingKey,
      winsKey,
      lossesKey,
    ].join(', ');
    const fallbackSelect =
      'id, username, region, selected_games, platforms, game_ids, level';

    let fallbackToDefaults = false;
    const collectedPlayers: LeaderboardPlayerRow[] = [];

    for (const lookupGame of lookupGames) {
      const initialResult = await supabase
        .from('profiles')
        .select(metricSelect)
        .contains('selected_games', [lookupGame])
        .limit(100);

      if (
        initialResult.error &&
        (isMissingColumnError(initialResult.error, `profiles.${ratingKey}`) ||
          isMissingColumnError(initialResult.error, `profiles.${winsKey}`) ||
          isMissingColumnError(initialResult.error, `profiles.${lossesKey}`))
      ) {
        fallbackToDefaults = true;
        break;
      }

      if (initialResult.error) {
        console.error('[Leaderboard] Query error:', initialResult.error);
        return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
      }

      collectedPlayers.push(
        ...(((initialResult.data as unknown as LeaderboardPlayerRow[] | null) ?? []))
      );
    }

    if (fallbackToDefaults) {
      collectedPlayers.length = 0;

      for (const lookupGame of lookupGames) {
        const fallbackResult = await supabase
          .from('profiles')
          .select(fallbackSelect)
          .contains('selected_games', [lookupGame])
          .limit(100);

        if (fallbackResult.error) {
          console.error('[Leaderboard] Query error:', fallbackResult.error);
          return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
        }

        collectedPlayers.push(
          ...(((fallbackResult.data as unknown as LeaderboardPlayerRow[] | null) ?? []))
        );
      }
    }

    const candidatePlayers = dedupePlayers(collectedPlayers);
    const candidatePlayerIds = candidatePlayers
      .map((player) => String(player.id ?? ''))
      .filter(Boolean);
    const drawCountsById = await getDrawCounts(supabase, candidatePlayerIds, lookupGames);
    const legacyMetricsById = new Map<string, LeaderboardPlayerRow>();

    if (!fallbackToDefaults && game === 'efootball' && candidatePlayers.length > 0) {
      const legacyMetricsResult = await supabase
        .from('profiles')
        .select('id, rating_efootball_mobile, wins_efootball_mobile, losses_efootball_mobile')
        .in(
          'id',
          candidatePlayers
            .map((player) => String(player.id ?? ''))
            .filter(Boolean)
        );

      if (
        legacyMetricsResult.error &&
        (isMissingColumnError(legacyMetricsResult.error, 'profiles.rating_efootball_mobile') ||
          isMissingColumnError(legacyMetricsResult.error, 'profiles.wins_efootball_mobile') ||
          isMissingColumnError(legacyMetricsResult.error, 'profiles.losses_efootball_mobile'))
      ) {
        // Older schemas may already have dropped the legacy mobile fields.
      } else if (legacyMetricsResult.error) {
        console.error('[Leaderboard] Legacy metric query error:', legacyMetricsResult.error);
        return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
      } else {
        for (const row of (legacyMetricsResult.data as unknown as LeaderboardPlayerRow[] | null) ?? []) {
          const id = String(row.id ?? '');
          if (id) {
            legacyMetricsById.set(id, row);
          }
        }
      }
    }

    const getPlayerMetrics = (player: LeaderboardPlayerRow) =>
      fallbackToDefaults
        ? { rating: DEFAULT_RATING, wins: 0, losses: 0 }
        : resolveLeaderboardMetrics(
            player,
            ratingKey,
            winsKey,
            lossesKey,
            legacyMetricsById.get(String(player.id ?? ''))
          );

    const players = fallbackToDefaults
      ? candidatePlayers
      : candidatePlayers.filter((player) => {
          const metrics = getPlayerMetrics(player);
          const draws = drawCountsById.get(String(player.id ?? '')) ?? 0;
          return metrics.wins + metrics.losses + draws > 0;
        });

    const topPlayers = players
      .sort((a, b) => {
        if (fallbackToDefaults) {
          return String(a.username ?? '').localeCompare(String(b.username ?? ''));
        }

        const metricsA = getPlayerMetrics(a);
        const metricsB = getPlayerMetrics(b);
        const ratingDelta = metricsB.rating - metricsA.rating;
        if (ratingDelta !== 0) {
          return ratingDelta;
        }

        const matchDelta =
          metricsB.wins +
          metricsB.losses +
          (drawCountsById.get(String(b.id ?? '')) ?? 0) -
          (metricsA.wins + metricsA.losses + (drawCountsById.get(String(a.id ?? '')) ?? 0));
        if (matchDelta !== 0) {
          return matchDelta;
        }

        return String(a.username ?? '').localeCompare(String(b.username ?? ''));
      })
      .slice(0, 50);

    const tournamentWinsById = new Map<string, number>();
    const playerIds = topPlayers
      .map((player) => String(player.id ?? ''))
      .filter(Boolean);

    if (playerIds.length > 0) {
      const tournamentWinsResult = await supabase
        .from('tournaments')
        .select('winner_id')
        .eq('status', 'completed')
        .in('winner_id', playerIds)
        .in('game', lookupGames);

      if (tournamentWinsResult.error) {
        console.error('[Leaderboard] Tournament wins query error:', tournamentWinsResult.error);
      } else {
        for (const tournament of
          (tournamentWinsResult.data as Array<{ winner_id?: string | null }> | null) ?? []) {
          const winnerId = tournament.winner_id;

          if (!winnerId) continue;
          tournamentWinsById.set(winnerId, (tournamentWinsById.get(winnerId) ?? 0) + 1);
        }
      }
    }

    const leaderboard = topPlayers.map((p, index) => {
      const metrics = getPlayerMetrics(p);
      const playerId = String(p.id ?? '');
      const draws = drawCountsById.get(playerId) ?? 0;

      return {
        rank: index + 1,
        id: p.id,
        username: p.username,
        region: typeof p.region === 'string' ? p.region : null,
        platforms: (p.platforms as unknown[] | undefined) ?? [],
        game_ids: (p.game_ids as Record<string, string> | undefined) ?? {},
        rating: metrics.rating,
        division: getRankDivision(metrics.rating).label,
        level: (p.level as number | undefined) ?? 1,
        wins: metrics.wins,
        losses: metrics.losses,
        draws,
        matchesPlayed: metrics.wins + metrics.losses + draws,
        tournamentsWon: tournamentWinsById.get(playerId) ?? 0,
      };
    });

    return NextResponse.json({ leaderboard, game });
  } catch (err) {
    console.error('[Leaderboard] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
