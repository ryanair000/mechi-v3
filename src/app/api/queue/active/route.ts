import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import { GAMES, getCanonicalGameKey, getConfiguredPlatformForGame } from '@/lib/config';
import { isMissingColumnError } from '@/lib/db-compat';
import {
  expireWaitingQueueEntries,
  getQueueExpiryCutoffIso,
  getQueueWaitMinutes,
} from '@/lib/queue';
import { createServiceClient } from '@/lib/supabase';
import type { GameKey, PlatformKey } from '@/types';

export const dynamic = 'force-dynamic';

type QueueActiveRow = {
  user_id: string;
  game: GameKey;
  platform?: PlatformKey | null;
  joined_at: string;
};

type QueueActiveProfileRow = {
  id: string;
  username: string;
  avatar_url?: string | null;
  level?: number | null;
  region?: string | null;
  platforms?: PlatformKey[] | null;
  game_ids?: Record<string, string> | null;
};

type QueueActiveResponseItem = {
  id: string;
  username: string;
  avatar_url: string | null;
  level: number;
  region: string | null;
  game: GameKey;
  platform: PlatformKey | null;
  joined_at: string;
  wait_minutes: number;
};

function getUniqueValues(values: string[]) {
  return Array.from(new Set(values));
}

function parseQueueRows(data: unknown): QueueActiveRow[] {
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

    if (typeof userId !== 'string' || typeof game !== 'string' || typeof joinedAt !== 'string') {
      return [];
    }

    if (!(game in GAMES)) {
      return [];
    }

    return [
      {
        user_id: userId,
        game: getCanonicalGameKey(game as GameKey),
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

  try {
    const supabase = createServiceClient();
    await expireWaitingQueueEntries(supabase);

    const { searchParams } = new URL(request.url);
    const limit = Math.min(Math.max(Number(searchParams.get('limit') ?? 80), 1), 120);
    const activeQueueCutoff = getQueueExpiryCutoffIso();
    const buildQueueQuery = (selectClause: string) =>
      supabase
        .from('queue')
        .select(selectClause)
        .eq('status', 'waiting')
        .gte('joined_at', activeQueueCutoff)
        .order('joined_at', { ascending: true })
        .limit(limit);

    let queueHasPlatformColumn = true;
    let queueResult = await buildQueueQuery('user_id, game, platform, joined_at');

    if (queueResult.error && isMissingColumnError(queueResult.error, 'queue.platform')) {
      queueHasPlatformColumn = false;
      queueResult = await buildQueueQuery('user_id, game, joined_at');
    }

    if (queueResult.error) {
      console.error('[Queue Active] Query error:', queueResult.error);
      return NextResponse.json({ error: 'Failed to fetch active queue players' }, { status: 500 });
    }

    const queueRows = parseQueueRows(queueResult.data);
    if (queueRows.length === 0) {
      return NextResponse.json({ players: [], updated_at: new Date().toISOString() });
    }

    const playerIds = getUniqueValues(queueRows.map((row) => row.user_id));
    const { data: profileRows, error: profileRowsError } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, level, region, platforms, game_ids')
      .in('id', playerIds);

    if (profileRowsError) {
      console.error('[Queue Active] Profile query error:', profileRowsError);
      return NextResponse.json({ error: 'Failed to fetch active queue players' }, { status: 500 });
    }

    const profilesById = new Map<string, QueueActiveProfileRow>(
      (((profileRows ?? []) as QueueActiveProfileRow[])).map((profile) => [profile.id, profile])
    );
    const seenUserIds = new Set<string>();
    const players: QueueActiveResponseItem[] = [];

    for (const row of queueRows) {
      if (seenUserIds.has(row.user_id)) {
        continue;
      }

      const profile = profilesById.get(row.user_id);
      if (!profile || typeof profile.username !== 'string' || profile.username.trim().length === 0) {
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

      seenUserIds.add(row.user_id);
      players.push({
        id: profile.id,
        username: profile.username,
        avatar_url: profile.avatar_url ?? null,
        level: Number(profile.level ?? 1),
        region: typeof profile.region === 'string' ? profile.region : null,
        game: row.game,
        platform: resolvedPlatform ?? null,
        joined_at: row.joined_at,
        wait_minutes: getQueueWaitMinutes(row.joined_at),
      });
    }

    return NextResponse.json({
      players,
      updated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Queue Active] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
