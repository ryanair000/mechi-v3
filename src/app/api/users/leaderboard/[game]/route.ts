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
import type { GameKey } from '@/types';

type LeaderboardPlayerRow = Record<string, unknown>;
type DrawMatchRow = {
  id?: string | null;
  player1_id?: string | null;
  player2_id?: string | null;
};

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
