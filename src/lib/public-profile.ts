import 'server-only';

import { isMissingColumnError } from '@/lib/db-compat';
import { resolveProfileLocation } from '@/lib/location';
import {
  PUBLIC_PROFILE_SHARE_SELECT,
  PUBLIC_PROFILE_SHARE_SELECT_WITH_COUNTRY,
  getProfileShareStats,
} from '@/lib/share';
import { createServiceClient } from '@/lib/supabase';
import type { CountryKey, GameKey, PlatformKey } from '@/types';

export type PublicProfileData = Record<string, unknown> & {
  avatar_url?: string | null;
  bestRating: number;
  country: CountryKey | null;
  cover_url?: string | null;
  game_ids?: Record<string, string> | null;
  games: GameKey[];
  id: string;
  last_match_date?: string | null;
  level?: number | null;
  location_label: string;
  platforms?: PlatformKey[] | null;
  region: string | null;
  selected_games?: GameKey[] | null;
  totalLosses: number;
  totalWins: number;
  username: string;
};

export async function getPublicProfileData(username: string): Promise<PublicProfileData | null> {
  const normalizedUsername = username.trim();

  if (!normalizedUsername) {
    return null;
  }

  const supabase = createServiceClient();
  let result = await supabase
    .from('profiles')
    .select(PUBLIC_PROFILE_SHARE_SELECT_WITH_COUNTRY)
    .ilike('username', normalizedUsername)
    .single();

  if (result.error && isMissingColumnError(result.error, 'profiles.country')) {
    result = await supabase
      .from('profiles')
      .select(PUBLIC_PROFILE_SHARE_SELECT)
      .ilike('username', normalizedUsername)
      .single();
  }

  const profile = result.data as (Record<string, unknown> & {
    avatar_url?: string | null;
    cover_url?: string | null;
    country?: CountryKey | null;
    game_ids?: Record<string, string> | null;
    id: string;
    last_match_date?: string | null;
    level?: number | null;
    platforms?: PlatformKey[] | null;
    region?: string | null;
    selected_games?: GameKey[] | null;
    username: string;
  }) | null;

  if (!profile) {
    return null;
  }

  const { games, bestRating, totalWins, totalLosses } = getProfileShareStats(profile);
  const location = resolveProfileLocation(profile);

  return {
    ...profile,
    bestRating,
    country: location.country,
    games,
    location_label: location.label,
    region: location.region,
    totalLosses,
    totalWins,
  };
}
