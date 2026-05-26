import { getCountryLabel, normalizeCountryKey } from '@/lib/location';
import type { CountryKey } from '@/types';

export type MechiLocale = 'en' | 'sw-TZ';
export type RegionalSettingsSource = 'manual' | 'player' | 'ip' | 'accept-language' | 'default';

export interface RegionalSettings {
  country: CountryKey;
  locale: MechiLocale;
  htmlLang: 'en' | 'sw';
  countryLabel: string;
  languageLabel: string;
  phonePlaceholder: string;
  countrySource: RegionalSettingsSource;
  isExplicitPreference: boolean;
}

type HeaderReader = {
  get(name: string): string | null;
};

const COUNTRY_PHONE_PLACEHOLDERS: Record<CountryKey, string> = {
  kenya: '0712 345 678',
  tanzania: '0755 123 456',
  uganda: '0701 234 567',
  rwanda: '0788 123 456',
  ethiopia: '0911 234 567',
  united_states: '(555) 123-4567',
};

const ISO_COUNTRY_MAP: Record<string, CountryKey> = {
  ET: 'ethiopia',
  KE: 'kenya',
  RW: 'rwanda',
  TZ: 'tanzania',
  UG: 'uganda',
};

const COUNTRY_HEADER_KEYS = [
  'x-vercel-ip-country',
  'cf-ipcountry',
  'cloudfront-viewer-country',
  'x-country-code',
  'x-appengine-country',
] as const;

export const REGIONAL_PREFERENCE_COOKIE_NAME = 'mechi_country';

export function getRegionalPreferenceCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 60 * 60 * 24 * 365,
    path: '/',
  };
}

export function normalizeRegionalPreference(value: unknown): CountryKey | null {
  return normalizeCountryKey(value);
}

export function getLocaleForCountry(country: CountryKey): MechiLocale {
  return country === 'tanzania' ? 'sw-TZ' : 'en';
}

export function getHtmlLangForLocale(locale: MechiLocale): 'en' | 'sw' {
  return locale === 'sw-TZ' ? 'sw' : 'en';
}

export function getLanguageLabelForLocale(locale: MechiLocale): string {
  return locale === 'sw-TZ' ? 'Kiswahili' : 'English';
}

export function getPhonePlaceholderForCountry(country: CountryKey): string {
  return COUNTRY_PHONE_PLACEHOLDERS[country];
}

export function buildRegionalSettings(
  country: CountryKey,
  countrySource: RegionalSettingsSource
): RegionalSettings {
  const locale = getLocaleForCountry(country);

  return {
    country,
    locale,
    htmlLang: getHtmlLangForLocale(locale),
    countryLabel: getCountryLabel(country),
    languageLabel: getLanguageLabelForLocale(locale),
    phonePlaceholder: getPhonePlaceholderForCountry(country),
    countrySource,
    isExplicitPreference: countrySource === 'manual',
  };
}

export function getCountryFromIsoCode(value: string | null | undefined): CountryKey | null {
  const normalizedValue = String(value ?? '')
    .trim()
    .toUpperCase();

  if (!normalizedValue) {
    return null;
  }

  return ISO_COUNTRY_MAP[normalizedValue] ?? null;
}

export function getCountryFromIpHeaders(headerReader: HeaderReader): CountryKey | null {
  for (const headerName of COUNTRY_HEADER_KEYS) {
    const country = getCountryFromIsoCode(headerReader.get(headerName));
    if (country) {
      return country;
    }
  }

  return null;
}

export function getCountryFromAcceptLanguage(value: string | null | undefined): CountryKey | null {
  const normalizedValue = String(value ?? '').trim().toLowerCase();
  if (!normalizedValue) {
    return null;
  }

  // Browser language is often en-US globally, so don't let it override the East Africa default.
  const languageTags = normalizedValue
    .split(',')
    .map((segment) => segment.split(';')[0]?.trim())
    .filter(Boolean) as string[];

  for (const tag of languageTags) {
    if (tag.startsWith('sw')) {
      return 'tanzania';
    }

    if (tag === 'am' || tag.endsWith('-et')) {
      return 'ethiopia';
    }

    if (tag === 'rw' || tag.endsWith('-rw')) {
      return 'rwanda';
    }

    if (tag.endsWith('-tz')) {
      return 'tanzania';
    }

    if (tag.endsWith('-ke')) {
      return 'kenya';
    }

    if (tag.endsWith('-ug')) {
      return 'uganda';
    }
  }

  return null;
}
