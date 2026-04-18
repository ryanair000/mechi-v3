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

      const rows = ((data ?? []) as Array<{
        id: string;
        username?: string | null;
        email?: string | null;
      }>).filter((row) => row.email && !blockedIds.has(row.id));

      for (const row of rows) {
        if (!recipients.has(row.id)) {
          recipients.set(row.id, {
            id: row.id,
            username: row.username?.trim() || 'Player',
            email: row.email as string,
          });
        }
      }

      if (rows.length < AUDIENCE_PAGE_SIZE) {
        break;
      }

      offset += AUDIENCE_PAGE_SIZE;
    }
  }

  return Array.from(recipients.values());
}

export async function notifyGameAudienceAboutQueue(params: {
  supabase: SupabaseClient;
  game: GameKey;
  username: string;
  platform: PlatformKey;
  excludeUserIds?: string[];
}): Promise<void> {
  const recipients = await getGameAudienceMembers(params);
  if (recipients.length === 0) return;

  const canonicalGame = getCanonicalGameKey(params.game);
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
  game: GameKey;
  hostName: string;
  lobbyId: string;
  title: string;
  mode: string;
  mapName?: string | null;
  scheduledFor?: string | null;
  excludeUserIds?: string[];
}): Promise<void> {
  const recipients = await getGameAudienceMembers(params);
  if (recipients.length === 0) return;

  const canonicalGame = getCanonicalGameKey(params.game);
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
  game: GameKey;
  organizerName: string;
  slug: string;
  title: string;
  platform: PlatformKey | null;
  entryFee: number;
  size: number;
  region: string;
  excludeUserIds?: string[];
}): Promise<void> {
  const recipients = await getGameAudienceMembers(params);
  if (recipients.length === 0) return;

  const canonicalGame = getCanonicalGameKey(params.game);
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
        tournamentUrl: `${APP_URL}/t/${params.slug}`,
      })
    )
  );
}
