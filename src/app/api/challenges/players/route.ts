import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import {
  DEFAULT_RATING,
  GAMES,
  getCanonicalGameKey,
  getConfiguredPlatformForGame,
  getGameLossesKey,
  getGameRatingKey,
  getGameWinsKey,
  getValidCanonicalGameKey,
  normalizeSelectedGameKeys,
} from '@/lib/config';
import { getRankDivision } from '@/lib/gamification';
import { createServiceClient } from '@/lib/supabase';
import type { ChallengeDiscoveryPlayer, GameKey, PlatformKey } from '@/types';

export const dynamic = 'force-dynamic';

type DiscoveryProfileRow = Record<string, unknown> & {
  avatar_url?: string | null;
  game_ids?: Record<string, string> | null;
  id: string;
  last_match_date?: string | null;
  level?: number | null;
  platforms?: PlatformKey[] | null;
  region?: string | null;
  selected_games?: GameKey[] | null;
  username: string;
};

function getLookupGames(game: GameKey): GameKey[] {
  const canonicalGame = getCanonicalGameKey(game);

  return (Object.keys(GAMES) as GameKey[]).filter(
    (candidate) => getCanonicalGameKey(candidate) === canonicalGame
  );
}

function dedupeProfiles(rows: DiscoveryProfileRow[]): DiscoveryProfileRow[] {
  const profilesById = new Map<string, DiscoveryProfileRow>();

  for (const row of rows) {
    if (!profilesById.has(row.id)) {
      profilesById.set(row.id, row);
    }
  }

  return Array.from(profilesById.values());
}

function normalizeSearchQuery(value: string | null): string {
  return value?.trim().replace(/^@+/, '') ?? '';
}

function getSearchPriority(username: string, query: string): number {
  const normalizedUsername = username.toLowerCase();
  const normalizedQuery = query.toLowerCase();

  if (normalizedUsername === normalizedQuery) {
    return 0;
  }

  if (normalizedUsername.startsWith(normalizedQuery)) {
    return 1;
  }

  if (normalizedUsername.includes(normalizedQuery)) {
    return 2;
  }

  return 3;
}

function getMetricValue(record: DiscoveryProfileRow, key: string, fallback = 0): number {
  const value = record[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export async function GET(request: NextRequest) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) {
    return access.response;
  }

  const { searchParams } = new URL(request.url);
  const requestedGame = String(searchParams.get('game') ?? '').trim();
  const game = requestedGame ? getValidCanonicalGameKey(requestedGame) : null;

  if (!game || !GAMES[game] || GAMES[game].mode !== '1v1') {
    return NextResponse.json({ error: 'Pick a supported 1-on-1 game' }, { status: 400 });
  }

  const searchQuery = normalizeSearchQuery(searchParams.get('q'));
  const requestedLimit = Number(searchParams.get('limit') ?? (searchQuery ? 8 : 6));
  const limit = Math.min(Math.max(Number.isFinite(requestedLimit) ? requestedLimit : 6, 1), 20);

  try {
    const supabase = createServiceClient();
    const { data: viewerProfile, error: viewerProfileError } = await supabase
      .from('profiles')
      .select('selected_games, platforms, game_ids')
      .eq('id', access.profile.id)
      .single();

    if (viewerProfileError || !viewerProfile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const viewerSelectedGames = normalizeSelectedGameKeys(
      (viewerProfile.selected_games as string[] | null | undefined) ?? []
    );
    if (!viewerSelectedGames.includes(game)) {
      return NextResponse.json(
        { error: `Add ${GAMES[game].label} to your profile before finding opponents` },
        { status: 400 }
      );
    }

    const viewerPlatform = getConfiguredPlatformForGame(
      game,
      (viewerProfile.game_ids as Record<string, string> | null | undefined) ?? {},
      (viewerProfile.platforms as PlatformKey[] | null | undefined) ?? []
    );

    if (!viewerPlatform) {
      return NextResponse.json(
        { error: `Choose a platform for ${GAMES[game].label} in your profile first` },
        { status: 400 }
      );
    }

    const ratingKey = getGameRatingKey(game);
    const winsKey = getGameWinsKey(game);
    const lossesKey = getGameLossesKey(game);
    const selectClause = [
      'id',
      'username',
      'avatar_url',
      'level',
      'region',
      'platforms',
      'game_ids',
      'selected_games',
      'last_match_date',
      ratingKey,
      winsKey,
      lossesKey,
    ].join(', ');

    const lookupGames = getLookupGames(game);
    const collectedProfiles: DiscoveryProfileRow[] = [];

    for (const lookupGame of lookupGames) {
      const result = await supabase
        .from('profiles')
        .select(selectClause)
        .neq('id', access.profile.id)
        .contains('selected_games', [lookupGame])
        .limit(120);

      if (result.error) {
        console.error('[Challenge Players] Profile query error:', result.error);
        return NextResponse.json({ error: 'Failed to load challenge players' }, { status: 500 });
      }

      collectedProfiles.push(...(((result.data ?? []) as unknown as DiscoveryProfileRow[])));
    }

    const pendingChallengesResult = await supabase
      .from('match_challenges')
      .select('challenger_id, opponent_id')
      .eq('status', 'pending')
      .eq('game', game)
      .eq('platform', viewerPlatform)
      .or(`challenger_id.eq.${access.profile.id},opponent_id.eq.${access.profile.id}`);

    if (pendingChallengesResult.error) {
      console.error('[Challenge Players] Pending challenge query error:', pendingChallengesResult.error);
      return NextResponse.json({ error: 'Failed to load challenge players' }, { status: 500 });
    }

    const blockedProfileIds = new Set<string>();
    for (const row of pendingChallengesResult.data ?? []) {
      const challengerId = String(row.challenger_id ?? '');
      const opponentId = String(row.opponent_id ?? '');

      if (challengerId && challengerId !== access.profile.id) {
        blockedProfileIds.add(challengerId);
      }

      if (opponentId && opponentId !== access.profile.id) {
        blockedProfileIds.add(opponentId);
      }
    }

    const compatiblePlayers = dedupeProfiles(collectedProfiles)
      .filter((profile) => profile.username.trim().length > 0)
      .filter((profile) => !blockedProfileIds.has(profile.id))
      .filter((profile) => {
        const configuredPlatform = getConfiguredPlatformForGame(
          game,
          (profile.game_ids as Record<string, string> | null | undefined) ?? {},
          (profile.platforms as PlatformKey[] | null | undefined) ?? []
        );

        return configuredPlatform === viewerPlatform;
      })
      .map((profile): ChallengeDiscoveryPlayer => {
        const rating = getMetricValue(profile, ratingKey, DEFAULT_RATING);
        const wins = getMetricValue(profile, winsKey, 0);
        const losses = getMetricValue(profile, lossesKey, 0);

        return {
          id: profile.id,
          username: profile.username,
          avatar_url: profile.avatar_url ?? null,
          level: typeof profile.level === 'number' ? profile.level : 1,
          region: typeof profile.region === 'string' ? profile.region : null,
          platform: viewerPlatform,
          rating,
          division: getRankDivision(rating).label,
          matchesPlayed: wins + losses,
          last_match_date:
            typeof profile.last_match_date === 'string' ? profile.last_match_date : null,
        };
      });

    const normalizedQuery = searchQuery.toLowerCase();
    const filteredPlayers = searchQuery
      ? compatiblePlayers.filter((player) =>
          player.username.toLowerCase().includes(normalizedQuery)
        )
      : compatiblePlayers;

    const sortedPlayers = [...filteredPlayers].sort((left, right) => {
      if (searchQuery) {
        const priorityDiff =
          getSearchPriority(left.username, searchQuery) -
          getSearchPriority(right.username, searchQuery);

        if (priorityDiff !== 0) {
          return priorityDiff;
        }
      }

      if (right.rating !== left.rating) {
        return right.rating - left.rating;
      }

      if (right.matchesPlayed !== left.matchesPlayed) {
        return right.matchesPlayed - left.matchesPlayed;
      }

      return left.username.localeCompare(right.username);
    });

    return NextResponse.json({
      game,
      platform: viewerPlatform,
      players: sortedPlayers.slice(0, limit),
    });
  } catch (error) {
    console.error('[Challenge Players] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
