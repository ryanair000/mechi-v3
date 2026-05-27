import type { CountryKey } from '@/types';

export const UNSPECIFIED_LOCATION_LABEL = 'Unspecified';

type CountryDefinition = {
  label: string;
  iso2: string;
  slug: string;
  dialCode: string;
  subscriberLength: number;
  currencyCode: string;
  currencySymbol: string;
  regions: readonly string[];
};

const COMMON_REGIONS = ['Capital city', 'Major city', 'Online / remote', 'Other'] as const;

export const COUNTRY_LOCATION_MAP: Record<CountryKey, CountryDefinition> = {
  algeria: { label: 'Algeria', iso2: 'DZ', slug: 'algeria', dialCode: '213', subscriberLength: 9, currencyCode: 'DZD', currencySymbol: 'DA', regions: ['Algiers', 'Oran', 'Constantine', 'Annaba', 'Blida', 'Other'] },
  angola: { label: 'Angola', iso2: 'AO', slug: 'angola', dialCode: '244', subscriberLength: 9, currencyCode: 'AOA', currencySymbol: 'Kz', regions: ['Luanda', 'Benguela', 'Huambo', 'Lubango', 'Cabinda', 'Other'] },
  benin: { label: 'Benin', iso2: 'BJ', slug: 'benin', dialCode: '229', subscriberLength: 8, currencyCode: 'XOF', currencySymbol: 'CFA', regions: ['Cotonou', 'Porto-Novo', 'Parakou', 'Abomey-Calavi', 'Djougou', 'Other'] },
  botswana: { label: 'Botswana', iso2: 'BW', slug: 'botswana', dialCode: '267', subscriberLength: 8, currencyCode: 'BWP', currencySymbol: 'P', regions: ['Gaborone', 'Francistown', 'Maun', 'Molepolole', 'Serowe', 'Other'] },
  burkina_faso: { label: 'Burkina Faso', iso2: 'BF', slug: 'burkina-faso', dialCode: '226', subscriberLength: 8, currencyCode: 'XOF', currencySymbol: 'CFA', regions: ['Ouagadougou', 'Bobo-Dioulasso', 'Koudougou', 'Banfora', 'Ouahigouya', 'Other'] },
  burundi: { label: 'Burundi', iso2: 'BI', slug: 'burundi', dialCode: '257', subscriberLength: 8, currencyCode: 'BIF', currencySymbol: 'FBu', regions: ['Bujumbura', 'Gitega', 'Ngozi', 'Rumonge', 'Muyinga', 'Other'] },
  cabo_verde: { label: 'Cabo Verde', iso2: 'CV', slug: 'cabo-verde', dialCode: '238', subscriberLength: 7, currencyCode: 'CVE', currencySymbol: 'Esc', regions: ['Praia', 'Mindelo', 'Santa Maria', 'Assomada', 'Other'] },
  cameroon: { label: 'Cameroon', iso2: 'CM', slug: 'cameroon', dialCode: '237', subscriberLength: 9, currencyCode: 'XAF', currencySymbol: 'FCFA', regions: ['Douala', 'Yaounde', 'Bamenda', 'Bafoussam', 'Garoua', 'Other'] },
  central_african_republic: { label: 'Central African Republic', iso2: 'CF', slug: 'central-african-republic', dialCode: '236', subscriberLength: 8, currencyCode: 'XAF', currencySymbol: 'FCFA', regions: ['Bangui', 'Bimbo', 'Berberati', 'Carnot', 'Other'] },
  chad: { label: 'Chad', iso2: 'TD', slug: 'chad', dialCode: '235', subscriberLength: 8, currencyCode: 'XAF', currencySymbol: 'FCFA', regions: ["N'Djamena", 'Moundou', 'Sarh', 'Abeche', 'Other'] },
  comoros: { label: 'Comoros', iso2: 'KM', slug: 'comoros', dialCode: '269', subscriberLength: 7, currencyCode: 'KMF', currencySymbol: 'CF', regions: ['Moroni', 'Mutsamudu', 'Fomboni', 'Domoni', 'Other'] },
  congo_brazzaville: { label: 'Republic of the Congo', iso2: 'CG', slug: 'congo', dialCode: '242', subscriberLength: 9, currencyCode: 'XAF', currencySymbol: 'FCFA', regions: ['Brazzaville', 'Pointe-Noire', 'Dolisie', 'Nkayi', 'Other'] },
  congo_kinshasa: { label: 'DR Congo', iso2: 'CD', slug: 'dr-congo', dialCode: '243', subscriberLength: 9, currencyCode: 'CDF', currencySymbol: 'FC', regions: ['Kinshasa', 'Lubumbashi', 'Goma', 'Kisangani', 'Mbuji-Mayi', 'Other'] },
  cote_divoire: { label: "Cote d'Ivoire", iso2: 'CI', slug: 'cote-divoire', dialCode: '225', subscriberLength: 10, currencyCode: 'XOF', currencySymbol: 'CFA', regions: ['Abidjan', 'Yamoussoukro', 'Bouake', 'Daloa', 'San-Pedro', 'Other'] },
  djibouti: { label: 'Djibouti', iso2: 'DJ', slug: 'djibouti', dialCode: '253', subscriberLength: 8, currencyCode: 'DJF', currencySymbol: 'Fdj', regions: ['Djibouti City', 'Ali Sabieh', 'Tadjoura', 'Dikhil', 'Other'] },
  egypt: { label: 'Egypt', iso2: 'EG', slug: 'egypt', dialCode: '20', subscriberLength: 10, currencyCode: 'EGP', currencySymbol: 'E£', regions: ['Cairo', 'Alexandria', 'Giza', 'Mansoura', 'Tanta', 'Other'] },
  equatorial_guinea: { label: 'Equatorial Guinea', iso2: 'GQ', slug: 'equatorial-guinea', dialCode: '240', subscriberLength: 9, currencyCode: 'XAF', currencySymbol: 'FCFA', regions: ['Malabo', 'Bata', 'Ebebiyin', 'Mongomo', 'Other'] },
  eritrea: { label: 'Eritrea', iso2: 'ER', slug: 'eritrea', dialCode: '291', subscriberLength: 7, currencyCode: 'ERN', currencySymbol: 'Nfk', regions: ['Asmara', 'Keren', 'Massawa', 'Assab', 'Other'] },
  eswatini: { label: 'Eswatini', iso2: 'SZ', slug: 'eswatini', dialCode: '268', subscriberLength: 8, currencyCode: 'SZL', currencySymbol: 'E', regions: ['Mbabane', 'Manzini', 'Lobamba', 'Siteki', 'Other'] },
  ethiopia: { label: 'Ethiopia', iso2: 'ET', slug: 'ethiopia', dialCode: '251', subscriberLength: 9, currencyCode: 'ETB', currencySymbol: 'Br', regions: ['Addis Ababa', 'Adama', 'Bahir Dar', 'Hawassa', 'Mekelle', 'Dire Dawa', 'Jimma', 'Other'] },
  gabon: { label: 'Gabon', iso2: 'GA', slug: 'gabon', dialCode: '241', subscriberLength: 8, currencyCode: 'XAF', currencySymbol: 'FCFA', regions: ['Libreville', 'Port-Gentil', 'Franceville', 'Oyem', 'Other'] },
  gambia: { label: 'The Gambia', iso2: 'GM', slug: 'gambia', dialCode: '220', subscriberLength: 7, currencyCode: 'GMD', currencySymbol: 'D', regions: ['Banjul', 'Serekunda', 'Brikama', 'Bakau', 'Other'] },
  ghana: { label: 'Ghana', iso2: 'GH', slug: 'ghana', dialCode: '233', subscriberLength: 9, currencyCode: 'GHS', currencySymbol: 'GH₵', regions: ['Accra', 'Kumasi', 'Tamale', 'Takoradi', 'Cape Coast', 'Other'] },
  guinea: { label: 'Guinea', iso2: 'GN', slug: 'guinea', dialCode: '224', subscriberLength: 9, currencyCode: 'GNF', currencySymbol: 'FG', regions: ['Conakry', 'Kankan', 'Nzerekore', 'Kindia', 'Other'] },
  guinea_bissau: { label: 'Guinea-Bissau', iso2: 'GW', slug: 'guinea-bissau', dialCode: '245', subscriberLength: 9, currencyCode: 'XOF', currencySymbol: 'CFA', regions: ['Bissau', 'Bafata', 'Gabu', 'Bissora', 'Other'] },
  kenya: { label: 'Kenya', iso2: 'KE', slug: 'ke', dialCode: '254', subscriberLength: 9, currencyCode: 'KES', currencySymbol: 'KSh', regions: ['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret', 'Machakos', 'Nyeri', 'Other'] },
  lesotho: { label: 'Lesotho', iso2: 'LS', slug: 'lesotho', dialCode: '266', subscriberLength: 8, currencyCode: 'LSL', currencySymbol: 'L', regions: ['Maseru', 'Teyateyaneng', 'Mafeteng', 'Leribe', 'Other'] },
  liberia: { label: 'Liberia', iso2: 'LR', slug: 'liberia', dialCode: '231', subscriberLength: 8, currencyCode: 'LRD', currencySymbol: 'L$', regions: ['Monrovia', 'Gbarnga', 'Buchanan', 'Kakata', 'Other'] },
  libya: { label: 'Libya', iso2: 'LY', slug: 'libya', dialCode: '218', subscriberLength: 9, currencyCode: 'LYD', currencySymbol: 'LD', regions: ['Tripoli', 'Benghazi', 'Misrata', 'Sabha', 'Other'] },
  madagascar: { label: 'Madagascar', iso2: 'MG', slug: 'madagascar', dialCode: '261', subscriberLength: 9, currencyCode: 'MGA', currencySymbol: 'Ar', regions: ['Antananarivo', 'Toamasina', 'Antsirabe', 'Mahajanga', 'Other'] },
  malawi: { label: 'Malawi', iso2: 'MW', slug: 'malawi', dialCode: '265', subscriberLength: 9, currencyCode: 'MWK', currencySymbol: 'MK', regions: ['Lilongwe', 'Blantyre', 'Mzuzu', 'Zomba', 'Other'] },
  mali: { label: 'Mali', iso2: 'ML', slug: 'mali', dialCode: '223', subscriberLength: 8, currencyCode: 'XOF', currencySymbol: 'CFA', regions: ['Bamako', 'Sikasso', 'Segou', 'Mopti', 'Other'] },
  mauritania: { label: 'Mauritania', iso2: 'MR', slug: 'mauritania', dialCode: '222', subscriberLength: 8, currencyCode: 'MRU', currencySymbol: 'UM', regions: ['Nouakchott', 'Nouadhibou', 'Kiffa', 'Rosso', 'Other'] },
  mauritius: { label: 'Mauritius', iso2: 'MU', slug: 'mauritius', dialCode: '230', subscriberLength: 8, currencyCode: 'MUR', currencySymbol: 'Rs', regions: ['Port Louis', 'Curepipe', 'Vacoas-Phoenix', 'Quatre Bornes', 'Other'] },
  morocco: { label: 'Morocco', iso2: 'MA', slug: 'morocco', dialCode: '212', subscriberLength: 9, currencyCode: 'MAD', currencySymbol: 'DH', regions: ['Casablanca', 'Rabat', 'Marrakesh', 'Fes', 'Tangier', 'Other'] },
  mozambique: { label: 'Mozambique', iso2: 'MZ', slug: 'mozambique', dialCode: '258', subscriberLength: 9, currencyCode: 'MZN', currencySymbol: 'MT', regions: ['Maputo', 'Matola', 'Beira', 'Nampula', 'Other'] },
  namibia: { label: 'Namibia', iso2: 'NA', slug: 'namibia', dialCode: '264', subscriberLength: 9, currencyCode: 'NAD', currencySymbol: 'N$', regions: ['Windhoek', 'Walvis Bay', 'Swakopmund', 'Oshakati', 'Other'] },
  niger: { label: 'Niger', iso2: 'NE', slug: 'niger', dialCode: '227', subscriberLength: 8, currencyCode: 'XOF', currencySymbol: 'CFA', regions: ['Niamey', 'Zinder', 'Maradi', 'Agadez', 'Other'] },
  nigeria: { label: 'Nigeria', iso2: 'NG', slug: 'nigeria', dialCode: '234', subscriberLength: 10, currencyCode: 'NGN', currencySymbol: '₦', regions: ['Lagos', 'Abuja', 'Kano', 'Port Harcourt', 'Ibadan', 'Other'] },
  rwanda: { label: 'Rwanda', iso2: 'RW', slug: 'rwanda', dialCode: '250', subscriberLength: 9, currencyCode: 'RWF', currencySymbol: 'FRw', regions: ['Kigali', 'Huye', 'Musanze', 'Rubavu', 'Rwamagana', 'Other'] },
  sao_tome_and_principe: { label: 'Sao Tome and Principe', iso2: 'ST', slug: 'sao-tome-and-principe', dialCode: '239', subscriberLength: 7, currencyCode: 'STN', currencySymbol: 'Db', regions: ['Sao Tome', 'Santo Antonio', ...COMMON_REGIONS] },
  senegal: { label: 'Senegal', iso2: 'SN', slug: 'senegal', dialCode: '221', subscriberLength: 9, currencyCode: 'XOF', currencySymbol: 'CFA', regions: ['Dakar', 'Touba', 'Thies', 'Saint-Louis', 'Other'] },
  seychelles: { label: 'Seychelles', iso2: 'SC', slug: 'seychelles', dialCode: '248', subscriberLength: 7, currencyCode: 'SCR', currencySymbol: 'SR', regions: ['Victoria', 'Beau Vallon', 'Anse Royale', 'Other'] },
  sierra_leone: { label: 'Sierra Leone', iso2: 'SL', slug: 'sierra-leone', dialCode: '232', subscriberLength: 8, currencyCode: 'SLE', currencySymbol: 'Le', regions: ['Freetown', 'Bo', 'Kenema', 'Makeni', 'Other'] },
  somalia: { label: 'Somalia', iso2: 'SO', slug: 'somalia', dialCode: '252', subscriberLength: 8, currencyCode: 'SOS', currencySymbol: 'Sh.So.', regions: ['Mogadishu', 'Hargeisa', 'Kismayo', 'Bosaso', 'Other'] },
  south_africa: { label: 'South Africa', iso2: 'ZA', slug: 'south-africa', dialCode: '27', subscriberLength: 9, currencyCode: 'ZAR', currencySymbol: 'R', regions: ['Johannesburg', 'Cape Town', 'Durban', 'Pretoria', 'Gqeberha', 'Other'] },
  south_sudan: { label: 'South Sudan', iso2: 'SS', slug: 'south-sudan', dialCode: '211', subscriberLength: 9, currencyCode: 'SSP', currencySymbol: 'SSP', regions: ['Juba', 'Wau', 'Malakal', 'Yei', 'Other'] },
  sudan: { label: 'Sudan', iso2: 'SD', slug: 'sudan', dialCode: '249', subscriberLength: 9, currencyCode: 'SDG', currencySymbol: 'SDG', regions: ['Khartoum', 'Omdurman', 'Port Sudan', 'Nyala', 'Other'] },
  tanzania: { label: 'Tanzania', iso2: 'TZ', slug: 'tz', dialCode: '255', subscriberLength: 9, currencyCode: 'TZS', currencySymbol: 'TSh', regions: ['Dar es Salaam', 'Arusha', 'Dodoma', 'Mwanza', 'Mbeya', 'Zanzibar', 'Morogoro', 'Other'] },
  togo: { label: 'Togo', iso2: 'TG', slug: 'togo', dialCode: '228', subscriberLength: 8, currencyCode: 'XOF', currencySymbol: 'CFA', regions: ['Lome', 'Sokode', 'Kara', 'Kpalime', 'Other'] },
  tunisia: { label: 'Tunisia', iso2: 'TN', slug: 'tunisia', dialCode: '216', subscriberLength: 8, currencyCode: 'TND', currencySymbol: 'DT', regions: ['Tunis', 'Sfax', 'Sousse', 'Kairouan', 'Bizerte', 'Other'] },
  uganda: { label: 'Uganda', iso2: 'UG', slug: 'ug', dialCode: '256', subscriberLength: 9, currencyCode: 'UGX', currencySymbol: 'USh', regions: ['Kampala', 'Entebbe', 'Jinja', 'Mbarara', 'Gulu', 'Mbale', 'Arua', 'Other'] },
  zambia: { label: 'Zambia', iso2: 'ZM', slug: 'zambia', dialCode: '260', subscriberLength: 9, currencyCode: 'ZMW', currencySymbol: 'ZK', regions: ['Lusaka', 'Ndola', 'Kitwe', 'Livingstone', 'Chipata', 'Other'] },
  zimbabwe: { label: 'Zimbabwe', iso2: 'ZW', slug: 'zimbabwe', dialCode: '263', subscriberLength: 9, currencyCode: 'USD', currencySymbol: 'US$', regions: ['Harare', 'Bulawayo', 'Mutare', 'Gweru', 'Masvingo', 'Other'] },
  united_states: { label: 'United States', iso2: 'US', slug: 'usa', dialCode: '1', subscriberLength: 10, currencyCode: 'USD', currencySymbol: '$', regions: ['California', 'Texas', 'Florida', 'New York', 'Georgia', 'Illinois', 'Washington', 'Other'] },
};

export const COUNTRY_KEYS = Object.keys(COUNTRY_LOCATION_MAP) as CountryKey[];
export const AFRICAN_COUNTRY_KEYS = COUNTRY_KEYS.filter((key) => key !== 'united_states');

export const COUNTRY_OPTIONS = AFRICAN_COUNTRY_KEYS.map((key) => ({
  key,
  label: COUNTRY_LOCATION_MAP[key].label,
  slug: COUNTRY_LOCATION_MAP[key].slug,
}));

export const LOCATION_LABELS = AFRICAN_COUNTRY_KEYS.flatMap((country) =>
  COUNTRY_LOCATION_MAP[country].regions.map((region) => formatLocationLabel(country, region))
);

const ISO_COUNTRY_ENTRIES = COUNTRY_KEYS.map((key) => [COUNTRY_LOCATION_MAP[key].iso2, key] as const);
export const ISO_COUNTRY_MAP = Object.fromEntries(ISO_COUNTRY_ENTRIES) as Record<string, CountryKey>;

function normalizeText(value: string | null | undefined): string {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeComparableText(value: string | null | undefined): string {
  return normalizeText(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function getCountryPatterns(country: CountryKey) {
  const definition = COUNTRY_LOCATION_MAP[country];
  return [
    country,
    definition.label,
    definition.slug,
    definition.iso2,
    definition.label.replace(/^The\s+/i, ''),
  ].map(normalizeComparableText);
}

export function normalizeCountryKey(value: unknown): CountryKey | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalizedValue = normalizeComparableText(value);
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

export function getCountrySlug(country: CountryKey | null | undefined): string {
  if (!country) {
    return '';
  }

  return COUNTRY_LOCATION_MAP[country]?.slug ?? '';
}

export function getCountryBySlug(slug: string | null | undefined): CountryKey | null {
  return COUNTRY_KEYS.find((country) => COUNTRY_LOCATION_MAP[country].slug === slug) ?? null;
}

export function getCountryIso2(country: CountryKey | null | undefined): string {
  if (!country) {
    return '';
  }

  return COUNTRY_LOCATION_MAP[country]?.iso2 ?? '';
}

export function getCountryCurrency(country: CountryKey | null | undefined) {
  const definition = country ? COUNTRY_LOCATION_MAP[country] : null;
  return {
    code: definition?.currencyCode ?? 'KES',
    symbol: definition?.currencySymbol ?? 'KSh',
  };
}

export function getCountryDialCode(country: CountryKey | null | undefined): string | null {
  return country ? COUNTRY_LOCATION_MAP[country]?.dialCode ?? null : null;
}

export function getCountrySubscriberLength(country: CountryKey | null | undefined): number {
  return country ? COUNTRY_LOCATION_MAP[country]?.subscriberLength ?? 9 : 9;
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
  if (!country || country === 'united_states') {
    return null;
  }

  const region = normalizeRegionForCountry(
    typeof params.region === 'string' ? params.region.slice(0, 80) : '',
    country
  );

  if (!region || region.length < 2) {
    return null;
  }

  return {
    country,
    region,
    label: formatLocationLabel(country, region),
  };
}
