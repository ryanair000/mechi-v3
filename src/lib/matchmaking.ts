import type { SupabaseClient } from '@supabase/supabase-js';
import { calculateElo } from './elo';
import { GAMES, getConfiguredPlatformForGame, getGameIdValue } from './config';
import type { GameKey, PlatformKey } from '@/types';
import { notifyMatchFound } from './whatsapp';
import { sendMatchFoundEmail } from './email';

const RATING_TOLERANCE = 300; // wider tolerance for small player base

export async function runMatchmaking(supabase: SupabaseClient): Promise<number> {
  // First clean up stale entries older than 30 minutes
  await supabase
    .from('queue')
    .update({ status: 'cancelled' })
    .eq('status', 'waiting')
    .lt('joined_at', new Date(Date.now() - 30 * 60 * 1000).toISOString());

  // Get all waiting queue entries ordered by join time
  const { data: queueEntries, error } = await supabase
    .from('queue')
    .select('*, profiles:user_id(id, username, phone, email, whatsapp_number, whatsapp_notifications, platforms, game_ids, selected_games)')
    .eq('status', 'waiting')
    .order('joined_at', { ascending: true });

  if (error || !queueEntries) {
    console.error('[Matchmaking] Queue fetch error:', error);
    return 0;
  }

  let matchesCreated = 0;
  const matched = new Set<string>();

  for (let i = 0; i < queueEntries.length; i++) {
    const entry = queueEntries[i];
    if (matched.has(entry.id)) continue;

    for (let j = i + 1; j < queueEntries.length; j++) {
      const opponent = queueEntries[j];
      if (matched.has(opponent.id)) continue;

      // Must be same game
      if (entry.game !== opponent.game) continue;

      const game = GAMES[entry.game as GameKey];
      const p1Profile = entry.profiles as Record<string, unknown> | null;
      const p2Profile = opponent.profiles as Record<string, unknown> | null;
      const p1Platforms = (p1Profile?.platforms as PlatformKey[]) ?? [];
      const p2Platforms = (p2Profile?.platforms as PlatformKey[]) ?? [];
      const p1GameIds = (p1Profile?.game_ids as Record<string, string>) ?? {};
      const p2GameIds = (p2Profile?.game_ids as Record<string, string>) ?? {};
      const p1Platform =
        (entry.platform as PlatformKey | null) ??
        getConfiguredPlatformForGame(entry.game as GameKey, p1GameIds, p1Platforms);
      const p2Platform =
        (opponent.platform as PlatformKey | null) ??
        getConfiguredPlatformForGame(opponent.game as GameKey, p2GameIds, p2Platforms);

      if (!p1Platform || !p2Platform || p1Platform !== p2Platform) continue;

      // Rating tolerance check (relaxed for small player base)
      if (Math.abs(entry.rating - opponent.rating) > RATING_TOLERANCE) continue;

      // Create the match
      const { data: match, error: matchError } = await supabase
        .from('matches')
        .insert({
          player1_id: entry.user_id,
          player2_id: opponent.user_id,
          game: entry.game,
          platform: p1Platform,
          region: entry.region ?? 'kenya',
          status: 'pending',
        })
        .select()
        .single();

      if (matchError || !match) {
        console.error('[Matchmaking] Match create error:', matchError);
        continue;
      }

      // Update queue entries to matched
      await supabase
        .from('queue')
        .update({ status: 'matched' })
        .in('id', [entry.id, opponent.id]);

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
        const p1WhatsAppEnabled = Boolean(p1Profile.whatsapp_notifications) && Boolean(p1WhatsAppNumber);
        const p2WhatsAppEnabled = Boolean(p2Profile.whatsapp_notifications) && Boolean(p2WhatsAppNumber);

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

      break; // Move to next unmatched entry
    }
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
