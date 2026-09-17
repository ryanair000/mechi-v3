import { isPassportFieldVisible } from '@/lib/passport-public-summary';
import {
  PASSPORT_VERIFICATION_SUBJECT_TYPES,
  type PassportField,
  type PassportIdentity,
  type PassportVerificationPreview,
  type PassportVerificationRecordPreview,
  type PassportVerificationSubjectType,
} from '@/lib/passport-types';

type PublicDetail = string | number | string[];
type PublicDetails = Record<string, PublicDetail>;
type DetailSanitizer = (value: unknown) => PublicDetail | null;

export const PASSPORT_VERIFICATION_VISIBILITY_FIELDS = {
  profile: [
    'bio',
    'gamer_since',
    'archetypes',
    'current_status',
    'location',
    'platforms',
    'games',
    'game_ids',
    'competitive',
    'events',
    'achievements',
    'teams',
    'social',
  ],
  game_account: ['games', 'game_ids', 'platforms'],
  match: ['competitive'],
  tournament: ['events'],
  event: ['events'],
  team: ['teams'],
  achievement: ['achievements'],
} as const satisfies Record<PassportVerificationSubjectType, readonly PassportField[]>;

function safeString(maxLength: number): DetailSanitizer {
  return (value) => {
    if (typeof value !== 'string') return null;
    const normalized = value
      .replace(/[\u0000-\u001F\u007F]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!normalized) return null;
    return [...normalized].slice(0, maxLength).join('');
  };
}

function safeInteger(minimum: number, maximum: number): DetailSanitizer {
  return (value) => typeof value === 'number'
    && Number.isInteger(value)
    && value >= minimum
    && value <= maximum
    ? value
    : null;
}

function safeStringArray(allowed: ReadonlySet<string>, maximum: number): DetailSanitizer {
  return (value) => {
    if (!Array.isArray(value)) return null;
    const sanitized = value
      .filter((entry): entry is string => typeof entry === 'string' && allowed.has(entry))
      .slice(0, maximum);
    return sanitized.length > 0 ? sanitized : null;
  };
}

const SAFE_PROFILE_FIELDS = new Set<PassportField>([
  'bio',
  'gamer_since',
  'archetypes',
  'current_status',
  'location',
  'platforms',
  'games',
  'game_ids',
  'competitive',
  'events',
  'achievements',
  'teams',
  'social',
]);

const PUBLIC_DETAIL_SCHEMAS: Record<
  PassportVerificationSubjectType,
  Record<string, DetailSanitizer>
> = {
  profile: {
    verification_kind: safeString(60),
    verified_fields: safeStringArray(SAFE_PROFILE_FIELDS, 13),
  },
  game_account: {
    game: safeString(80),
    platform: safeString(40),
    provider: safeString(60),
    account_label: safeString(80),
  },
  match: {
    game: safeString(80),
    result: safeString(40),
    tournament_slug: safeString(120),
  },
  tournament: {
    event_key: safeString(120),
    stamp_type: safeString(40),
    game: safeString(80),
    placement: safeInteger(1, 10_000),
    partner_organization: safeString(120),
  },
  event: {
    event_key: safeString(120),
    stamp_type: safeString(40),
    game: safeString(80),
    placement: safeInteger(1, 10_000),
    partner_organization: safeString(120),
  },
  team: {
    team_slug: safeString(120),
    role: safeString(60),
  },
  achievement: {
    achievement_key: safeString(120),
    rarity: safeString(40),
  },
};

function isVerificationSubjectType(value: string): value is PassportVerificationSubjectType {
  return PASSPORT_VERIFICATION_SUBJECT_TYPES.includes(
    value as PassportVerificationSubjectType
  );
}

function sanitizeText(value: string, fallback: string, maximum: number): string {
  const result = safeString(maximum)(value);
  return typeof result === 'string' ? result : fallback;
}

export function sanitizePassportVerificationPublicDetails(
  subjectType: PassportVerificationSubjectType,
  value: unknown
): PublicDetails {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const source = value as Record<string, unknown>;
  const schema = PUBLIC_DETAIL_SCHEMAS[subjectType];
  const output: PublicDetails = {};
  for (const [key, sanitizer] of Object.entries(schema)) {
    if (!(key in source)) continue;
    const sanitized = sanitizer(source[key]);
    if (sanitized !== null) output[key] = sanitized;
  }
  return output;
}

export function resolvePublicPassportVerification(
  verification: PassportVerificationRecordPreview,
  identity: PassportIdentity,
  friendView = false
): PassportVerificationPreview | null {
  if (!isVerificationSubjectType(verification.subject_type)) return null;
  const subjectType = verification.subject_type;
  const fields = PASSPORT_VERIFICATION_VISIBILITY_FIELDS[subjectType];
  if (!fields.every((field) => isPassportFieldVisible(identity, field, friendView))) {
    return null;
  }

  return {
    id: sanitizeText(verification.id, '', 80),
    subject_type: subjectType,
    verification_state: sanitizeText(verification.verification_state, 'verified', 40),
    label: sanitizeText(verification.label, 'Verified record', 120),
    source_type: sanitizeText(verification.source_type, 'mechi', 60),
    public_details: sanitizePassportVerificationPublicDetails(
      subjectType,
      verification.public_details
    ),
    issued_at: Number.isNaN(Date.parse(verification.issued_at))
      ? ''
      : new Date(verification.issued_at).toISOString(),
  };
}

export function filterPublicPassportVerifications(
  verifications: PassportVerificationRecordPreview[],
  identity: PassportIdentity,
  friendView = false
): PassportVerificationPreview[] {
  return verifications.flatMap((verification) => {
    const visible = resolvePublicPassportVerification(verification, identity, friendView);
    return visible ? [visible] : [];
  });
}
