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

  const legacyRating = (legacyMetrics.rating_efootball_mobile as number | undefined) ?? DEFAULT_RATING;
  const legacyWins = (legacyMetrics.wins_efootball_mobile as number | undefined) ?? 0;
  const legacyLosses = (legacyMetrics.losses_efootball_mobile as number | undefined) ?? 0;
  const hasLegacyHistory =
    legacyRating !== DEFAULT_RATING || legacyWins > 0 || legacyLosses > 0;

  return hasLegacyHistory
    ? { rating: legacyRating, wins: legacyWins, losses: legacyLosses }
    : { rating, wins, losses };
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
      'selected_games',
      'platforms',
      'game_ids',
      'level',
      ratingKey,
      winsKey,
      lossesKey,
    ].join(', ');
    const fallbackSelect = 'id, username, selected_games, platforms, game_ids, level';

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

    const players = dedupePlayers(collectedPlayers);
    const legacyMetricsById = new Map<string, LeaderboardPlayerRow>();

    if (!fallbackToDefaults && game === 'efootball' && players.length > 0) {
      const legacyMetricsResult = await supabase
        .from('profiles')
        .select('id, rating_efootball_mobile, wins_efootball_mobile, losses_efootball_mobile')
        .in(
          'id',
          players
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

    const sorted = players.sort(
      (a, b) =>
        fallbackToDefaults
          ? String(a.username ?? '').localeCompare(String(b.username ?? ''))
          : getPlayerMetrics(b).rating - getPlayerMetrics(a).rating
    ).slice(0, 50);

    const leaderboard = sorted.map((p, index) => {
      const metrics = getPlayerMetrics(p);

      return {
        rank: index + 1,
        id: p.id,
        username: p.username,
        platforms: (p.platforms as unknown[] | undefined) ?? [],
        game_ids: (p.game_ids as Record<string, string> | undefined) ?? {},
        rating: metrics.rating,
        division: getRankDivision(metrics.rating).label,
        level: (p.level as number | undefined) ?? 1,
        wins: metrics.wins,
        losses: metrics.losses,
      };
    });

    return NextResponse.json({ leaderboard, game });
  } catch (err) {
    console.error('[Leaderboard] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
