import type { SupabaseClient } from '@supabase/supabase-js';
import { GAMES, PLATFORMS, getCanonicalGameKey } from '@/lib/config';
import {
  sendLobbyBroadcastEmail,
  sendQueueBroadcastEmail,
  sendTournamentBroadcastEmail,
} from '@/lib/email';
import { QUEUE_MAX_WAIT_MINUTES } from '@/lib/queue';
import { APP_URL } from '@/lib/urls';
import type { GameKey, PlatformKey } from '@/types';

type GameAudienceMember = {
  id: string;
  username: string;
  email: string;
};

const AUDIENCE_PAGE_SIZE = 500;
const BROADCAST_EMAIL_BATCH_SIZE = 50;
const BROADCAST_COOLDOWN_RETENTION_MS = 24 * 60 * 60 * 1000;
const QUEUE_BROADCAST_COOLDOWN_MS = 10 * 60 * 1000;
const LOBBY_BROADCAST_COOLDOWN_MS = 15 * 60 * 1000;
const TOURNAMENT_BROADCAST_COOLDOWN_MS = 60 * 60 * 1000;

const broadcastCooldowns = new Map<string, number>();

function getRelatedGameKeys(game: GameKey): GameKey[] {
  const canonicalGame = getCanonicalGameKey(game);

  return (Object.keys(GAMES) as GameKey[]).filter(
    (candidate) => getCanonicalGameKey(candidate) === canonicalGame
  );
}

function chunkRecipients(values: string[]): string[][] {
  const chunks: string[][] = [];

  for (let index = 0; index < values.length; index += BROADCAST_EMAIL_BATCH_SIZE) {
    chunks.push(values.slice(index, index + BROADCAST_EMAIL_BATCH_SIZE));
  }

  return chunks;
}

function pruneLocalBroadcastCooldowns(now = Date.now()) {
  for (const [storedKey, timestamp] of broadcastCooldowns.entries()) {
    if (now - timestamp > BROADCAST_COOLDOWN_RETENTION_MS) {
      broadcastCooldowns.delete(storedKey);
    }
  }
}

function claimLocalBroadcastSlot(key: string, cooldownMs: number, now = Date.now()) {
  pruneLocalBroadcastCooldowns(now);

  const previous = broadcastCooldowns.get(key);
  if (previous && now - previous < cooldownMs) {
    return false;
  }

  broadcastCooldowns.set(key, now);
  return true;
}

function isDuplicateRateLimitKey(error: { code?: string } | null | undefined) {
  return error?.code === '23505';
}

async function claimBroadcastSlot(params: {
  supabase: SupabaseClient;
  key: string;
  cooldownMs: number;
}) {
  const { supabase, key, cooldownMs } = params;
  const now = Date.now();

  if (!claimLocalBroadcastSlot(key, cooldownMs, now)) {
    return false;
  }

  const nowIso = new Date(now).toISOString();
  const cooldownCutoffIso = new Date(now - cooldownMs).toISOString();

  const { data: recycledEntry, error: recycleError } = await supabase
    .from('rate_limit_attempts')
    .update({
      attempts: 1,
      window_start: nowIso,
      last_attempt: nowIso,
    })
    .eq('key', key)
    .lte('last_attempt', cooldownCutoffIso)
    .select('id')
    .maybeSingle();

  if (recycleError) {
    console.error('[Game Audience] Failed to recycle broadcast cooldown:', recycleError);
    return true;
  }

  if (recycledEntry) {
    return true;
  }

  const { error: insertError } = await supabase.from('rate_limit_attempts').insert({
    key,
    attempts: 1,
    window_start: nowIso,
    last_attempt: nowIso,
  });

  if (!insertError) {
    return true;
  }

  if (isDuplicateRateLimitKey(insertError)) {
    return false;
  }

  console.error('[Game Audience] Failed to claim broadcast cooldown:', insertError);
  return true;
}

export async function getGameAudienceMembers(params: {
  supabase: SupabaseClient;
  game: GameKey;
  excludeUserIds?: string[];
}): Promise<GameAudienceMember[]> {
  const { supabase, game, excludeUserIds = [] } = params;
  const recipients = new Map<string, GameAudienceMember>();
  const blockedIds = new Set(excludeUserIds);

  for (const lookupGame of getRelatedGameKeys(game)) {
    let offset = 0;

    while (true) {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, email')
        .contains('selected_games', [lookupGame])
        .not('email', 'is', null)
        .range(offset, offset + AUDIENCE_PAGE_SIZE - 1);

      if (error) {
        console.error('[Game Audience] Failed to load broadcast audience:', error);
        break;
      }

      const pageRows = (data ?? []) as Array<{
        id: string;
        username?: string | null;
        email?: string | null;
      }>;
      const rows = pageRows.filter((row) => row.email && !blockedIds.has(row.id));

      for (const row of rows) {
        if (!recipients.has(row.id)) {
          recipients.set(row.id, {
            id: row.id,
            username: row.username?.trim() || 'Player',
            email: row.email as string,
          });
        }
      }

      if (pageRows.length < AUDIENCE_PAGE_SIZE) {
        break;
      }

      offset += AUDIENCE_PAGE_SIZE;
    }
  }

  return Array.from(recipients.values());
}

export async function notifyGameAudienceAboutQueue(params: {
  supabase: SupabaseClient;
  actorUserId: string;
  game: GameKey;
  username: string;
  platform: PlatformKey;
  excludeUserIds?: string[];
}): Promise<void> {
  const canonicalGame = getCanonicalGameKey(params.game);
  const broadcastKey = `queue:${params.actorUserId}:${canonicalGame}:${params.platform}`;
  if (
    !(await claimBroadcastSlot({
      supabase: params.supabase,
      key: broadcastKey,
      cooldownMs: QUEUE_BROADCAST_COOLDOWN_MS,
    }))
  ) {
    return;
  }

  const recipients = await getGameAudienceMembers(params);
  if (recipients.length === 0) return;

  const gameLabel = GAMES[canonicalGame]?.label ?? canonicalGame;
  const platformLabel = PLATFORMS[params.platform]?.label ?? params.platform;

  await Promise.allSettled(
    chunkRecipients(recipients.map((recipient) => recipient.email)).map((bcc) =>
      sendQueueBroadcastEmail({
        bcc,
        username: params.username,
        game: gameLabel,
        platform: platformLabel,
        queueWindowMinutes: QUEUE_MAX_WAIT_MINUTES,
        queueUrl: `${APP_URL}/queue?game=${canonicalGame}&platform=${params.platform}`,
      })
    )
  );
}

export async function notifyGameAudienceAboutLobby(params: {
  supabase: SupabaseClient;
  actorUserId: string;
  game: GameKey;
  hostName: string;
  lobbyId: string;
  title: string;
  mode: string;
  mapName?: string | null;
  scheduledFor?: string | null;
  excludeUserIds?: string[];
}): Promise<void> {
  const canonicalGame = getCanonicalGameKey(params.game);
  const broadcastKey = `lobby:${params.actorUserId}:${canonicalGame}`;
  if (
    !(await claimBroadcastSlot({
      supabase: params.supabase,
      key: broadcastKey,
      cooldownMs: LOBBY_BROADCAST_COOLDOWN_MS,
    }))
  ) {
    return;
  }

  const recipients = await getGameAudienceMembers(params);
  if (recipients.length === 0) return;

  const gameLabel = GAMES[canonicalGame]?.label ?? canonicalGame;

  await Promise.allSettled(
    chunkRecipients(recipients.map((recipient) => recipient.email)).map((bcc) =>
      sendLobbyBroadcastEmail({
        bcc,
        hostName: params.hostName,
        game: gameLabel,
        lobbyTitle: params.title,
        mode: params.mode,
        mapName: params.mapName ?? null,
        scheduledFor: params.scheduledFor ?? null,
        lobbyUrl: `${APP_URL}/lobbies/${params.lobbyId}`,
      })
    )
  );
}

export async function notifyGameAudienceAboutTournament(params: {
  supabase: SupabaseClient;
  actorUserId: string;
  game: GameKey;
  organizerName: string;
  slug: string;
  title: string;
  platform: PlatformKey | null;
  entryFee: number;
  size: number;
  region: string;
  scheduledFor?: string | null;
  excludeUserIds?: string[];
}): Promise<void> {
  const canonicalGame = getCanonicalGameKey(params.game);
  const broadcastKey = `tournament:${params.actorUserId}:${canonicalGame}`;
  if (
    !(await claimBroadcastSlot({
      supabase: params.supabase,
      key: broadcastKey,
      cooldownMs: TOURNAMENT_BROADCAST_COOLDOWN_MS,
    }))
  ) {
    return;
  }

  const recipients = await getGameAudienceMembers(params);
  if (recipients.length === 0) return;

  const gameLabel = GAMES[canonicalGame]?.label ?? canonicalGame;
  const platformLabel = params.platform
    ? (PLATFORMS[params.platform]?.label ?? params.platform)
    : null;

  await Promise.allSettled(
    chunkRecipients(recipients.map((recipient) => recipient.email)).map((bcc) =>
      sendTournamentBroadcastEmail({
        bcc,
        organizerName: params.organizerName,
        tournamentTitle: params.title,
        game: gameLabel,
        platform: platformLabel,
        entryFee: params.entryFee,
        size: params.size,
        region: params.region,
        scheduledFor: params.scheduledFor ?? null,
        tournamentUrl: `${APP_URL}/t/${params.slug}`,
      })
    )
  );
}
