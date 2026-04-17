import type { SupabaseClient } from '@supabase/supabase-js';
import { getConfiguredPlatformForGame, isValidGamePlatform } from '@/lib/config';
import type { GameKey, MatchChallenge, PlatformKey } from '@/types';

type ChallengeProfile = {
  id: string;
  username: string;
  avatar_url?: string | null;
  plan?: string | null;
  plan_expires_at?: string | null;
  selected_games?: string[] | null;
  platforms?: PlatformKey[] | null;
  game_ids?: Record<string, string> | null;
};

export const MATCH_CHALLENGE_EXPIRY_HOURS = 24;

export async function expirePendingChallenges(supabase: SupabaseClient): Promise<void> {
  await supabase
    .from('match_challenges')
    .update({
      status: 'expired',
      responded_at: new Date().toISOString(),
    })
    .eq('status', 'pending')
    .lt('expires_at', new Date().toISOString());
}

export function resolveChallengePlatform(
  game: GameKey,
  requestedPlatform: PlatformKey,
  challenger: ChallengeProfile,
  opponent: ChallengeProfile
): PlatformKey | null {
  if (!isValidGamePlatform(game, requestedPlatform)) {
    return null;
  }

  const challengerPlatform = getConfiguredPlatformForGame(
    game,
    challenger.game_ids ?? {},
    challenger.platforms ?? []
  );
  const opponentPlatform = getConfiguredPlatformForGame(
    game,
    opponent.game_ids ?? {},
    opponent.platforms ?? []
  );

  if (challengerPlatform !== requestedPlatform || opponentPlatform !== requestedPlatform) {
    return null;
  }

  return requestedPlatform;
}

export function canUserChallengeGame(game: GameKey, profile: ChallengeProfile): boolean {
  return Boolean(profile.selected_games?.includes(game));
}

export function mapChallengeRelations(
  row: Record<string, unknown>
): MatchChallenge {
  const challengerRelation = row.challenger as
    | Array<MatchChallenge['challenger']>
    | MatchChallenge['challenger']
    | null
    | undefined;
  const opponentRelation = row.opponent as
    | Array<MatchChallenge['opponent']>
    | MatchChallenge['opponent']
    | null
    | undefined;

  return {
    ...(row as unknown as MatchChallenge),
    challenger: Array.isArray(challengerRelation)
      ? challengerRelation[0] ?? null
      : challengerRelation ?? null,
    opponent: Array.isArray(opponentRelation)
      ? opponentRelation[0] ?? null
      : opponentRelation ?? null,
  };
}
