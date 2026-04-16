import type { SupabaseClient } from '@supabase/supabase-js';
import { calculateElo } from './elo';
import { GAMES, getConfiguredPlatformForGame, getGameIdValue } from './config';
import { isMissingColumnError } from './db-compat';
import { getPlan } from './plans';
import { incrementMatchUsage } from './subscription';
import { resolvePlan } from './subscription';
import type { GameKey, PlatformKey } from '@/types';
import { notifyMatchFound } from './whatsapp';
import { sendMatchFoundEmail } from './email';

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

function getWaitMinutes(joinedAt: string | null | undefined): number {
  if (!joinedAt) return 0;

  const joinedAtMs = new Date(joinedAt).getTime();
  if (Number.isNaN(joinedAtMs)) return 0;

  return Math.max(0, Math.floor((Date.now() - joinedAtMs) / 60000));
}

function getRatingTolerance(
  joinedAt: string | null | undefined,
  profile: Record<string, unknown> | null
): number {
  const resolvedPlan = resolvePlan(
    profile?.plan as string | null | undefined,
    profile?.plan_expires_at as string | null | undefined
  );
  const priorityBonus = getPlan(resolvedPlan).priorityMatchmaking ? PRIORITY_WAIT_BONUS_MINUTES : 0;
  const effectiveWaitMinutes = getWaitMinutes(joinedAt) + priorityBonus;
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
  // First clean up stale entries older than 30 minutes
  await supabase
    .from('queue')
    .update({ status: 'cancelled' })
    .eq('status', 'waiting')
    .lt('joined_at', new Date(Date.now() - 30 * 60 * 1000).toISOString());

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

    const game = GAMES[entry.game as GameKey];
    const p1Profile = entry.profiles as Record<string, unknown> | null;
    const p1Platforms = (p1Profile?.platforms as PlatformKey[]) ?? [];
    const p1GameIds = (p1Profile?.game_ids as Record<string, string>) ?? {};
    const p1Platform =
      (entry.platform as PlatformKey | null) ??
      getConfiguredPlatformForGame(entry.game as GameKey, p1GameIds, p1Platforms);
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
      if (entry.game !== opponent.game) continue;

      const p2Profile = opponent.profiles as Record<string, unknown> | null;
      const p2Platforms = (p2Profile?.platforms as PlatformKey[]) ?? [];
      const p2GameIds = (p2Profile?.game_ids as Record<string, string>) ?? {};
      const p2Platform =
        (opponent.platform as PlatformKey | null) ??
        getConfiguredPlatformForGame(opponent.game as GameKey, p2GameIds, p2Platforms);

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
      game: entry.game,
      platform: p1Platform,
      region: entry.region ?? 'kenya',
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
        game: entry.game,
        region: entry.region ?? 'kenya',
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
    const gameLabel = game?.label ?? entry.game;

    if (p1Profile && p2Profile) {
      const p1PlatformId = getGameIdValue(p1GameIds, entry.game as GameKey, p1Platform) || 'Not set';
      const p2PlatformId = getGameIdValue(p2GameIds, entry.game as GameKey, p2Platform) || 'Not set';
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
          platform: p2Platform ?? 'Unknown',
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
          platform: p1Platform ?? 'Unknown',
          opponentPlatformId: p1PlatformId,
          matchId: match.id,
        }).catch(console.error);
      }
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
  const ratingKey = `rating_${game}`;
  const winsKey = `wins_${game}`;
  const lossesKey = `losses_${game}`;

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
