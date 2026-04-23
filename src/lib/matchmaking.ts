import type { SupabaseClient } from '@supabase/supabase-js';
import { calculateElo } from './elo';
import { sendMatchFoundEmail } from './email';
import {
  GAMES,
  getCanonicalGameKey,
  getConfiguredPlatformForGame,
  getGameIdValue,
  getGameLossesKey,
  getGameRatingKey,
  getGameWinsKey,
} from './config';
import { isMissingColumnError } from './db-compat';
import { UNSPECIFIED_LOCATION_LABEL } from './location';
import { createNotifications } from './notifications';
import { getPlan } from './plans';
import { expireWaitingQueueEntries, getQueueWaitMinutes } from './queue';
import { incrementMatchUsage } from './subscription';
import { resolvePlan } from './subscription';
import type { GameKey, PlatformKey } from '@/types';
import { notifyMatchFound } from './whatsapp';

const BASE_RATING_TOLERANCE = 300;
const RATING_TOLERANCE_STEP = 150;
const RATING_TOLERANCE_STEP_MINUTES = 4;
const MAX_RATING_TOLERANCE = 1200;
const PRIORITY_WAIT_BONUS_MINUTES = 4;

type QueueEntryRow = {
  id: string;
  user_id: string;
  game: string;
  platform?: PlatformKey | null;
  region?: string | null;
  rating: number;
  status: string;
  joined_at?: string | null;
  profiles?: Record<string, unknown> | null;
};

function getRatingTolerance(
  joinedAt: string | null | undefined,
  profile: Record<string, unknown> | null
): number {
  const resolvedPlan = resolvePlan(
    profile?.plan as string | null | undefined,
    profile?.plan_expires_at as string | null | undefined
  );
  const priorityBonus = getPlan(resolvedPlan).priorityMatchmaking ? PRIORITY_WAIT_BONUS_MINUTES : 0;
  const effectiveWaitMinutes = getQueueWaitMinutes(joinedAt) + priorityBonus;
  const expansionSteps = Math.floor(effectiveWaitMinutes / RATING_TOLERANCE_STEP_MINUTES);

  return Math.min(
    MAX_RATING_TOLERANCE,
    BASE_RATING_TOLERANCE + expansionSteps * RATING_TOLERANCE_STEP
  );
}

function getJoinedAtMs(joinedAt: string | null | undefined): number {
  if (!joinedAt) {
    return Number.MAX_SAFE_INTEGER;
  }

  const value = new Date(joinedAt).getTime();
  return Number.isNaN(value) ? Number.MAX_SAFE_INTEGER : value;
}

export async function runMatchmaking(supabase: SupabaseClient): Promise<number> {
  await expireWaitingQueueEntries(supabase);

  // Get all waiting queue entries ordered by join time
  let queueEntriesRaw: unknown = null;
  let error: unknown = null;

  const initialQueueResult = await supabase
    .from('queue')
    .select(
      'id, user_id, game, platform, region, rating, status, joined_at, profiles:user_id(id, username, phone, email, whatsapp_number, platforms, game_ids, selected_games)'
    )
    .eq('status', 'waiting')
    .order('joined_at', { ascending: true });

  queueEntriesRaw = initialQueueResult.data;
  error = initialQueueResult.error;

  if (error && isMissingColumnError(error, 'queue.platform')) {
    const fallbackQueueResult = await supabase
      .from('queue')
      .select(
        'id, user_id, game, region, rating, status, joined_at, profiles:user_id(id, username, phone, email, whatsapp_number, platforms, game_ids, selected_games)'
      )
      .eq('status', 'waiting')
      .order('joined_at', { ascending: true });

    queueEntriesRaw = fallbackQueueResult.data;
    error = fallbackQueueResult.error;
  }

  const queueEntries = (queueEntriesRaw as QueueEntryRow[] | null) ?? null;

  if (error || !queueEntries) {
    console.error('[Matchmaking] Queue fetch error:', error);
    return 0;
  }

  let matchesCreated = 0;
  const matched = new Set<string>();

  for (let i = 0; i < queueEntries.length; i++) {
    const entry = queueEntries[i];
    if (matched.has(entry.id)) continue;

    const entryGame = getCanonicalGameKey(entry.game as GameKey);
    const game = GAMES[entryGame];
    const p1Profile = entry.profiles as Record<string, unknown> | null;
    const p1Platforms = (p1Profile?.platforms as PlatformKey[]) ?? [];
    const p1GameIds = (p1Profile?.game_ids as Record<string, string>) ?? {};
    const p1Platform =
      (entry.platform as PlatformKey | null) ??
      getConfiguredPlatformForGame(entryGame, p1GameIds, p1Platforms);
    const p1Tolerance = getRatingTolerance(entry.joined_at as string | undefined, p1Profile);
    let bestCandidate:
      | {
          opponent: QueueEntryRow;
          opponentProfile: Record<string, unknown> | null;
          opponentGameIds: Record<string, string>;
          opponentPlatform: PlatformKey;
          ratingDifference: number;
        }
      | null = null;

    for (let j = i + 1; j < queueEntries.length; j++) {
      const opponent = queueEntries[j];
      if (matched.has(opponent.id)) continue;

      // Must be same game
      const opponentGame = getCanonicalGameKey(opponent.game as GameKey);
      if (entryGame !== opponentGame) continue;

      const p2Profile = opponent.profiles as Record<string, unknown> | null;
      const p2Platforms = (p2Profile?.platforms as PlatformKey[]) ?? [];
      const p2GameIds = (p2Profile?.game_ids as Record<string, string>) ?? {};
      const p2Platform =
        (opponent.platform as PlatformKey | null) ??
        getConfiguredPlatformForGame(opponentGame, p2GameIds, p2Platforms);

      if (!p1Platform || !p2Platform || p1Platform !== p2Platform) continue;

      const p2Tolerance = getRatingTolerance(opponent.joined_at as string | undefined, p2Profile);
      const ratingDifference = Math.abs(entry.rating - opponent.rating);
      const allowedTolerance = Math.max(p1Tolerance, p2Tolerance);
      if (ratingDifference > allowedTolerance) continue;

      if (
        !bestCandidate ||
        ratingDifference < bestCandidate.ratingDifference ||
        (ratingDifference === bestCandidate.ratingDifference &&
          getJoinedAtMs(opponent.joined_at) < getJoinedAtMs(bestCandidate.opponent.joined_at))
      ) {
        bestCandidate = {
          opponent,
          opponentProfile: p2Profile,
          opponentGameIds: p2GameIds,
          opponentPlatform: p2Platform,
          ratingDifference,
        };
      }
    }

    if (!bestCandidate || !p1Platform) {
      continue;
    }

    const {
      opponent,
      opponentProfile: p2Profile,
      opponentGameIds: p2GameIds,
      opponentPlatform: p2Platform,
    } = bestCandidate;

    // Create the match
    const matchPayload = {
      player1_id: entry.user_id,
      player2_id: opponent.user_id,
      game: entryGame,
      platform: p1Platform,
      region: entry.region ?? UNSPECIFIED_LOCATION_LABEL,
      status: 'pending',
    };

    let matchResult = await supabase
      .from('matches')
      .insert(matchPayload)
      .select()
      .single();

    if (matchResult.error && isMissingColumnError(matchResult.error, 'matches.platform')) {
      const legacyMatchPayload = {
        player1_id: entry.user_id,
        player2_id: opponent.user_id,
        game: entryGame,
        region: entry.region ?? UNSPECIFIED_LOCATION_LABEL,
        status: 'pending' as const,
      };
      matchResult = await supabase
        .from('matches')
        .insert(legacyMatchPayload)
        .select()
        .single();
    }

    const match = matchResult.data;
    const matchError = matchResult.error;

    if (matchError || !match) {
      console.error('[Matchmaking] Match create error:', matchError);
      continue;
    }

    // Update queue entries to matched
    await supabase
      .from('queue')
      .update({ status: 'matched' })
      .in('id', [entry.id, opponent.id]);

    await Promise.allSettled([
      incrementMatchUsage(entry.user_id as string, supabase),
      incrementMatchUsage(opponent.user_id as string, supabase),
    ]);

    matched.add(entry.id);
    matched.add(opponent.id);
    matchesCreated++;

    // Send notifications async (don't block matchmaking)
    const gameLabel = game?.label ?? entryGame;

    if (p1Profile && p2Profile) {
      const p1PlatformId = getGameIdValue(p1GameIds, entryGame, p1Platform) || 'Not set';
      const p2PlatformId = getGameIdValue(p2GameIds, entryGame, p2Platform) || 'Not set';
      const p1WhatsAppNumber = (p1Profile.whatsapp_number as string | undefined) ?? '';
      const p2WhatsAppNumber = (p2Profile.whatsapp_number as string | undefined) ?? '';
      const p1WhatsAppEnabled =
        ('whatsapp_notifications' in p1Profile
          ? Boolean(p1Profile.whatsapp_notifications)
          : Boolean(p1WhatsAppNumber)) && Boolean(p1WhatsAppNumber);
      const p2WhatsAppEnabled =
        ('whatsapp_notifications' in p2Profile
          ? Boolean(p2Profile.whatsapp_notifications)
          : Boolean(p2WhatsAppNumber)) && Boolean(p2WhatsAppNumber);

      // Notify player 1
      if (p1WhatsAppEnabled) {
        notifyMatchFound({
          whatsappNumber: p1WhatsAppNumber,
          username: p1Profile.username as string,
          game: gameLabel,
          opponentUsername: p2Profile.username as string,
          matchId: match.id,
        }).catch(console.error);
      }
      if (p1Profile.email) {
        sendMatchFoundEmail({
          to: p1Profile.email as string,
          username: p1Profile.username as string,
          opponentUsername: p2Profile.username as string,
          game: gameLabel,
          gameKey: entryGame,
          platform: p2Platform ?? 'Unknown',
          platformKey: p2Platform ?? null,
          opponentPlatformId: p2PlatformId,
          matchId: match.id,
        }).catch(console.error);
      }

      // Notify player 2
      if (p2WhatsAppEnabled) {
        notifyMatchFound({
          whatsappNumber: p2WhatsAppNumber,
          username: p2Profile.username as string,
          game: gameLabel,
          opponentUsername: p1Profile.username as string,
          matchId: match.id,
        }).catch(console.error);
      }
      if (p2Profile.email) {
        sendMatchFoundEmail({
          to: p2Profile.email as string,
          username: p2Profile.username as string,
          opponentUsername: p1Profile.username as string,
          game: gameLabel,
          gameKey: entryGame,
          platform: p1Platform ?? 'Unknown',
          platformKey: p1Platform ?? null,
          opponentPlatformId: p1PlatformId,
          matchId: match.id,
        }).catch(console.error);
      }

      createNotifications(
        [
          {
            user_id: entry.user_id,
            type: 'match_found',
            title: 'Your next run is live',
            body: `${p2Profile.username as string} is ready for ${gameLabel}. Open the room and lock the result.`,
            href: `/match/${match.id}`,
            metadata: {
              match_id: match.id,
              opponent_id: opponent.user_id,
              game: entryGame,
              platform: p1Platform,
            },
          },
          {
            user_id: opponent.user_id,
            type: 'match_found',
            title: 'A ranked match just landed',
            body: `${p1Profile.username as string} is ready for ${gameLabel}. Open the room and lock the result.`,
            href: `/match/${match.id}`,
            metadata: {
              match_id: match.id,
              opponent_id: entry.user_id,
              game: entryGame,
              platform: p2Platform,
            },
          },
        ],
        supabase
      ).catch(console.error);
    }

    // Move to next unmatched entry
  }

  return matchesCreated;
}

export async function finalizeMatch(
  supabase: SupabaseClient,
  matchId: string,
  winnerId: string,
  loserId: string,
  game: GameKey
): Promise<void> {
  const canonicalGame = getCanonicalGameKey(game);
  const ratingKey = getGameRatingKey(canonicalGame);
  const winsKey = getGameWinsKey(canonicalGame);
  const lossesKey = getGameLossesKey(canonicalGame);

  const { data: profilesRaw } = await supabase
    .from('profiles')
    .select(`id, ${ratingKey}, ${winsKey}, ${lossesKey}`)
    .in('id', [winnerId, loserId]);

  const profiles = profilesRaw as Record<string, unknown>[] | null;
  if (!profiles || profiles.length < 2) return;

  const winnerProfile = profiles.find((p) => p.id === winnerId);
  const loserProfile = profiles.find((p) => p.id === loserId);
  if (!winnerProfile || !loserProfile) return;

  const winnerRating = (winnerProfile[ratingKey] as number) ?? 1000;
  const loserRating = (loserProfile[ratingKey] as number) ?? 1000;

  const { newRatingWinner, newRatingLoser, changeWinner, changeLoser } = calculateElo(
    winnerRating,
    loserRating
  );

  await supabase
    .from('profiles')
    .update({
      [ratingKey]: newRatingWinner,
      [winsKey]: ((winnerProfile[winsKey] as number) ?? 0) + 1,
    })
    .eq('id', winnerId);

  await supabase
    .from('profiles')
    .update({
      [ratingKey]: newRatingLoser,
      [lossesKey]: ((loserProfile[lossesKey] as number) ?? 0) + 1,
    })
    .eq('id', loserId);

  await supabase
    .from('matches')
    .update({
      status: 'completed',
      winner_id: winnerId,
      rating_change_p1: changeWinner,
      rating_change_p2: changeLoser,
      completed_at: new Date().toISOString(),
    })
    .eq('id', matchId);
}
