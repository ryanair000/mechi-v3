import type { CountryKey } from '@/types';

export const UNSPECIFIED_LOCATION_LABEL = 'Unspecified';

type CountryDefinition = {
  label: string;
  regions: readonly string[];
};

export const COUNTRY_LOCATION_MAP: Record<CountryKey, CountryDefinition> = {
  kenya: {
    label: 'Kenya',
    regions: ['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret', 'Machakos', 'Nyeri', 'Other'],
  },
  tanzania: {
    label: 'Tanzania',
    regions: [
      'Dar es Salaam',
      'Arusha',
      'Dodoma',
      'Mwanza',
      'Mbeya',
      'Zanzibar',
      'Morogoro',
      'Other',
    ],
  },
  uganda: {
    label: 'Uganda',
    regions: ['Kampala', 'Entebbe', 'Jinja', 'Mbarara', 'Gulu', 'Mbale', 'Arua', 'Other'],
  },
  rwanda: {
    label: 'Rwanda',
    regions: ['Kigali', 'Huye', 'Musanze', 'Rubavu', 'Rwamagana', 'Other'],
  },
  ethiopia: {
    label: 'Ethiopia',
    regions: ['Addis Ababa', 'Adama', 'Bahir Dar', 'Hawassa', 'Mekelle', 'Dire Dawa', 'Jimma', 'Other'],
  },
};

export const COUNTRY_KEYS = Object.keys(COUNTRY_LOCATION_MAP) as CountryKey[];

export const COUNTRY_OPTIONS = COUNTRY_KEYS.map((key) => ({
  key,
  label: COUNTRY_LOCATION_MAP[key].label,
}));

export const LOCATION_LABELS = COUNTRY_KEYS.flatMap((country) =>
  COUNTRY_LOCATION_MAP[country].regions.map((region) => formatLocationLabel(country, region))
);

function normalizeText(value: string | null | undefined): string {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}

function getCountryPatterns(country: CountryKey) {
  const label = COUNTRY_LOCATION_MAP[country].label;
  return [country, label.toLowerCase()];
}

export function normalizeCountryKey(value: unknown): CountryKey | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalizedValue = normalizeText(value).toLowerCase();
  if (!normalizedValue) {
    return null;
  }

  for (const country of COUNTRY_KEYS) {
    if (getCountryPatterns(country).includes(normalizedValue)) {
      return country;
    }
  }

  return null;
}

export function getCountryLabel(country: CountryKey | null | undefined): string {
  if (!country) {
    return '';
  }

  return COUNTRY_LOCATION_MAP[country]?.label ?? '';
}

export function getRegionsForCountry(country: CountryKey | null | undefined): string[] {
  if (!country) {
    return [];
  }

  return [...(COUNTRY_LOCATION_MAP[country]?.regions ?? [])];
}

export function stripCountryFromRegion(value: string | null | undefined): string {
  const normalizedValue = normalizeText(value);
  if (!normalizedValue) {
    return '';
  }

  for (const country of COUNTRY_KEYS) {
    const countryLabel = COUNTRY_LOCATION_MAP[country].label;
    const countryRegex = new RegExp(`^${countryLabel}\\s*(?:·|\\||-|:)\\s*`, 'i');
    if (countryRegex.test(normalizedValue)) {
      return normalizedValue.replace(countryRegex, '').trim();
    }
  }

  return normalizedValue;
}

export function guessCountryFromRegion(value: string | null | undefined): CountryKey | null {
  const normalizedValue = normalizeText(value);
  if (!normalizedValue) {
    return null;
  }

  const lowerValue = normalizedValue.toLowerCase();

  for (const country of COUNTRY_KEYS) {
    const countryLabel = COUNTRY_LOCATION_MAP[country].label.toLowerCase();
    if (
      lowerValue === country ||
      lowerValue === countryLabel ||
      lowerValue.startsWith(`${countryLabel} `) ||
      lowerValue.startsWith(`${country} `) ||
      lowerValue.startsWith(`${countryLabel}·`) ||
      lowerValue.startsWith(`${countryLabel}|`) ||
      lowerValue.startsWith(`${countryLabel}-`) ||
      lowerValue.startsWith(`${countryLabel}:`)
    ) {
      return country;
    }
  }

  const strippedRegion = stripCountryFromRegion(normalizedValue).toLowerCase();
  if (!strippedRegion || strippedRegion === 'other') {
    return null;
  }

  for (const country of COUNTRY_KEYS) {
    const matchingRegion = COUNTRY_LOCATION_MAP[country].regions.find(
      (region) => region.toLowerCase() === strippedRegion
    );

    if (matchingRegion) {
      return country;
    }
  }

  return null;
}

export function normalizeRegionForCountry(
  value: string | null | undefined,
  country: CountryKey | null | undefined
): string {
  const strippedRegion = stripCountryFromRegion(value);
  if (!country) {
    return strippedRegion;
  }

  const matchingRegion = COUNTRY_LOCATION_MAP[country].regions.find(
    (region) => region.toLowerCase() === strippedRegion.toLowerCase()
  );

  return matchingRegion ?? strippedRegion;
}

export function isSupportedRegionForCountry(
  value: string | null | undefined,
  country: CountryKey | null | undefined
): boolean {
  if (!country) {
    return false;
  }

  const normalizedRegion = normalizeRegionForCountry(value, country);
  return COUNTRY_LOCATION_MAP[country].regions.includes(normalizedRegion);
}

export function formatLocationLabel(
  country: CountryKey | null | undefined,
  region: string | null | undefined
): string {
  const normalizedRegion = normalizeRegionForCountry(region, country);
  if (!normalizedRegion) {
    return '';
  }

  const countryLabel = getCountryLabel(country);
  return countryLabel ? `${countryLabel} · ${normalizedRegion}` : normalizedRegion;
}

export function resolveProfileLocation(params: {
  country?: unknown;
  region?: unknown;
}): {
  country: CountryKey | null;
  region: string;
  label: string;
} {
  const rawRegion = typeof params.region === 'string' ? params.region : '';
  const country =
    normalizeCountryKey(params.country) ?? guessCountryFromRegion(rawRegion);
  const region = normalizeRegionForCountry(rawRegion, country);
  const label = formatLocationLabel(country, region);

  return {
    country,
    region,
    label,
  };
}

export function validateLocationSelection(params: {
  country?: unknown;
  region?: unknown;
}): {
  country: CountryKey;
  region: string;
  label: string;
} | null {
  const country = normalizeCountryKey(params.country);
  if (!country) {
    return null;
  }

  const region = normalizeRegionForCountry(
    typeof params.region === 'string' ? params.region : '',
    country
  );

  if (!region || !isSupportedRegionForCountry(region, country)) {
    return null;
  }

  return {
    country,
    region,
    label: formatLocationLabel(country, region),
  };
}
