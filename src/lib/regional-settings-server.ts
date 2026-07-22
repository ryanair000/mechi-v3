import 'server-only';

import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { cookies, headers } from 'next/headers';
import type { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { resolveProfileLocation } from '@/lib/location';
import {
  buildRegionalSettings,
  getCountryFromAcceptLanguage,
  getCountryFromIpHeaders,
  normalizeRegionalPreference,
  REGIONAL_PREFERENCE_COOKIE_NAME,
  type RegionalSettings,
} from '@/lib/regional-settings';
import { createServiceClient } from '@/lib/supabase';
import type { CountryKey } from '@/types';

type HeaderReader = {
  get(name: string): string | null;
};

type ResolveRegionalSettingsInput = {
  authToken?: string | null;
  cookieCountry?: CountryKey | null;
  headerReader: HeaderReader;
};

const PLAYER_COUNTRY_QUERY_TIMEOUT_MS = 1500;

const getCachedPlayerCountry = unstable_cache(
  async (playerId: string): Promise<CountryKey | null> => {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('profiles')
      .select('country, region')
      .eq('id', playerId)
      .abortSignal(AbortSignal.timeout(PLAYER_COUNTRY_QUERY_TIMEOUT_MS))
      .maybeSingle();

    if (error || !data) return null;
    return resolveProfileLocation(data as Record<string, unknown>).country;
  },
  ['player-regional-country-v1'],
  { revalidate: 300, tags: ['player-regional-country'] }
);

async function getPlayerCountryFromAuthToken(
  authToken: string | null | undefined
): Promise<CountryKey | null> {
  if (!authToken) {
    return null;
  }

  const payload = verifyToken(authToken);
  if (!payload?.sub) {
    return null;
  }

  try {
    return await getCachedPlayerCountry(payload.sub);
  } catch {
    return null;
  }
}

async function resolveRegionalSettingsFromInput(
  input: ResolveRegionalSettingsInput
): Promise<RegionalSettings> {
  if (input.cookieCountry) {
    return buildRegionalSettings(input.cookieCountry, 'manual');
  }

  const playerCountry = await getPlayerCountryFromAuthToken(input.authToken);
  if (playerCountry) {
    return buildRegionalSettings(playerCountry, 'player');
  }

  const ipCountry = getCountryFromIpHeaders(input.headerReader);
  if (ipCountry) {
    return buildRegionalSettings(ipCountry, 'ip');
  }

  const languageCountry = getCountryFromAcceptLanguage(input.headerReader.get('accept-language'));
  if (languageCountry) {
    return buildRegionalSettings(languageCountry, 'accept-language');
  }

  return buildRegionalSettings('kenya', 'default');
}

export const getRequestRegionalSettings = cache(async (): Promise<RegionalSettings> => {
  const cookieStore = await cookies();
  const headerStore = await headers();

  return resolveRegionalSettingsFromInput({
    authToken: cookieStore.get('auth_token')?.value ?? null,
    cookieCountry: normalizeRegionalPreference(
      cookieStore.get(REGIONAL_PREFERENCE_COOKIE_NAME)?.value
    ),
    headerReader: headerStore,
  });
});

export async function resolveRegionalSettingsForRequest(
  request: NextRequest,
  options?: { cookieCountry?: CountryKey | null }
): Promise<RegionalSettings> {
  return resolveRegionalSettingsFromInput({
    authToken: request.cookies.get('auth_token')?.value ?? null,
    cookieCountry:
      options && 'cookieCountry' in options
        ? options.cookieCountry ?? null
        : normalizeRegionalPreference(request.cookies.get(REGIONAL_PREFERENCE_COOKIE_NAME)?.value),
    headerReader: request.headers,
  });
}
