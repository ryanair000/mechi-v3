import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import {
  GAMES,
  getConfiguredPlatformForGame,
  normalizeSelectedGameKeys,
} from '@/lib/config';
import { isMissingColumnError } from '@/lib/db-compat';
import { getQueueExpiryCutoffIso, getQueueWaitMinutes } from '@/lib/queue';
import { createServiceClient } from '@/lib/supabase';
import type { GameKey, PlatformKey } from '@/types';

type QueuePlayerRow = {
  user_id: string;
  game: GameKey;
  platform?: PlatformKey | null;
  joined_at: string;
};

type QueuePlayerProfileRow = {
  id: string;
  username: string;
  avatar_url?: string | null;
  level?: number | null;
  region?: string | null;
  platforms?: PlatformKey[] | null;
  game_ids?: Record<string, string> | null;
};

type QueuePlayerResponseItem = {
  id: string;
  username: string;
  avatar_url: string | null;
  level: number;
  region: string | null;
  game: GameKey;
  platform: PlatformKey;
  joined_at: string;
  wait_minutes: number;
};

function getUniqueValues(values: string[]) {
  return Array.from(new Set(values));
}

function parseQueueRows(data: unknown): QueuePlayerRow[] {
  if (!Array.isArray(data)) {
    return [];
  }

  return data.flatMap((row) => {
    if (!row || typeof row !== 'object') {
      return [];
    }

    const record = row as Record<string, unknown>;
    const userId = record.user_id;
    const game = record.game;
    const joinedAt = record.joined_at;
    const platform = record.platform;

    if (
      typeof userId !== 'string' ||
      typeof game !== 'string' ||
      !(game in GAMES) ||
      typeof joinedAt !== 'string'
    ) {
      return [];
    }

    return [
      {
        user_id: userId,
        game: game as GameKey,
        platform: typeof platform === 'string' ? (platform as PlatformKey) : null,
        joined_at: joinedAt,
      },
    ];
  });
}

export async function GET(request: NextRequest) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) {
    return access.response;
  }

  const authUser = access.profile;

  try {
    const supabase = createServiceClient();
    const { data: viewerProfile, error: viewerProfileError } = await supabase
      .from('profiles')
      .select('selected_games, platforms, game_ids')
      .eq('id', authUser.id)
      .single();

    if (viewerProfileError || !viewerProfile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const viewerPlatforms = ((viewerProfile.platforms as PlatformKey[] | null | undefined) ?? []) as PlatformKey[];
    const viewerGameIds =
      ((viewerProfile.game_ids as Record<string, string> | null | undefined) ?? {}) as Record<string, string>;
    const rankedGames = normalizeSelectedGameKeys(
      (viewerProfile.selected_games as string[] | null | undefined) ?? []
    ).filter((game) => GAMES[game]?.mode === '1v1');

    const expectedPlatformByGame = new Map<GameKey, PlatformKey>();
    for (const game of rankedGames) {
      const platform = getConfiguredPlatformForGame(game, viewerGameIds, viewerPlatforms);
      if (platform) {
        expectedPlatformByGame.set(game, platform);
      }
    }

    if (expectedPlatformByGame.size === 0) {
      return NextResponse.json({ players: [] });
    }

    const queueGames = Array.from(expectedPlatformByGame.keys());
    const activeQueueCutoff = getQueueExpiryCutoffIso();
    const buildQueueQuery = (selectClause: string) =>
      supabase
        .from('queue')
        .select(selectClause)
        .neq('user_id', authUser.id)
        .eq('status', 'waiting')
        .gte('joined_at', activeQueueCutoff)
        .in('game', queueGames)
        .order('joined_at', { ascending: false })
        .limit(40);

    let queueRows: QueuePlayerRow[] = [];
    let queueHasPlatformColumn = true;
    let queueResult = await buildQueueQuery('user_id, game, platform, joined_at');

    if (queueResult.error && isMissingColumnError(queueResult.error, 'queue.platform')) {
      queueHasPlatformColumn = false;
      queueResult = await buildQueueQuery('user_id, game, joined_at');
    }

    if (queueResult.error) {
      console.error('[Queue Players] Query error:', queueResult.error);
      return NextResponse.json({ error: 'Failed to fetch queue players' }, { status: 500 });
    }

    queueRows = parseQueueRows(queueResult.data);

    if (queueRows.length === 0) {
      return NextResponse.json({ players: [] });
    }

    const playerIds = getUniqueValues(queueRows.map((row) => row.user_id));
    const { data: profileRows, error: profileRowsError } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, level, region, platforms, game_ids')
      .in('id', playerIds);

    if (profileRowsError) {
      console.error('[Queue Players] Profile query error:', profileRowsError);
      return NextResponse.json({ error: 'Failed to fetch player profiles' }, { status: 500 });
    }

    const profilesById = new Map<string, QueuePlayerProfileRow>(
      (((profileRows ?? []) as QueuePlayerProfileRow[])).map((profile) => [profile.id, profile])
    );
    const seenUserIds = new Set<string>();
    const players: QueuePlayerResponseItem[] = [];

    for (const row of queueRows) {
      if (seenUserIds.has(row.user_id)) {
        continue;
      }

      const expectedPlatform = expectedPlatformByGame.get(row.game);
      if (!expectedPlatform) {
        continue;
      }

      const profile = profilesById.get(row.user_id);
      if (!profile) {
        continue;
      }

      const resolvedPlatform =
        queueHasPlatformColumn && row.platform
          ? row.platform
          : getConfiguredPlatformForGame(
              row.game,
              (profile.game_ids ?? {}) as Record<string, string>,
              (profile.platforms ?? []) as PlatformKey[]
            );

      if (!resolvedPlatform || resolvedPlatform !== expectedPlatform) {
        continue;
      }

      seenUserIds.add(row.user_id);
      players.push({
        id: profile.id,
        username: profile.username,
        avatar_url: profile.avatar_url ?? null,
        level: Number(profile.level ?? 1),
        region: typeof profile.region === 'string' ? profile.region : null,
        game: row.game,
        platform: resolvedPlatform,
        joined_at: row.joined_at,
        wait_minutes: getQueueWaitMinutes(row.joined_at),
      });

      if (players.length >= 8) {
        break;
      }
    }

    return NextResponse.json({ players });
  } catch (error) {
    console.error('[Queue Players] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
