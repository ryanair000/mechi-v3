import { NextRequest, NextResponse } from 'next/server';
import {
  buildRegionalSettings,
  getRegionalPreferenceCookieOptions,
  normalizeRegionalPreference,
  REGIONAL_PREFERENCE_COOKIE_NAME,
} from '@/lib/regional-settings';
import { resolveRegionalSettingsForRequest } from '@/lib/regional-settings-server';

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const requestedCountry =
    body.country == null ? null : normalizeRegionalPreference(body.country);

  if (body.country != null && !requestedCountry) {
    return NextResponse.json({ error: 'Unsupported country preference' }, { status: 400 });
  }

  const settings =
    requestedCountry == null
      ? await resolveRegionalSettingsForRequest(request, { cookieCountry: null })
      : buildRegionalSettings(requestedCountry, 'manual');

  const response = NextResponse.json({ settings });

  if (requestedCountry == null) {
    response.cookies.set(REGIONAL_PREFERENCE_COOKIE_NAME, '', {
      ...getRegionalPreferenceCookieOptions(),
      maxAge: 0,
    });
  } else {
    response.cookies.set(
      REGIONAL_PREFERENCE_COOKIE_NAME,
      requestedCountry,
      getRegionalPreferenceCookieOptions()
    );
  }

  return response;
}
