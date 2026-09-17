export const PASSPORT_PRODUCT_EVENTS = [
  'passport_created',
  'passport_publication_changed',
  'passport_onboarding_completed',
  'passport_game_added',
  'passport_five_games_reached',
  'passport_current_game_added',
  'passport_record_claimed',
  'passport_comparison_completed',
  'passport_card_generated',
  'passport_card_shared',
  'passport_public_viewed',
  'passport_cv_viewed',
  'passport_cv_downloaded',
  'passport_friend_action',
  'passport_replay_generated',
  'passport_replay_shared',
] as const;

export type PassportProductEventName = (typeof PASSPORT_PRODUCT_EVENTS)[number];
export type PassportAnalyticsActorKind = 'anonymous' | 'owner' | 'friend' | 'member' | 'system';

const ALLOWED_PROPERTIES: Record<PassportProductEventName, ReadonlySet<string>> = {
  passport_created: new Set(['creation_source']),
  passport_publication_changed: new Set(['publication_status', 'discoverable', 'default_visibility']),
  passport_onboarding_completed: new Set(['completion_version']),
  passport_game_added: new Set(['play_status', 'source_type', 'visibility']),
  passport_five_games_reached: new Set(['game_count_at_milestone']),
  passport_current_game_added: new Set(['source_type', 'visibility']),
  passport_record_claimed: new Set(['subject_type', 'verification_state', 'source_type']),
  passport_comparison_completed: new Set(['relationship', 'shared_games_bucket', 'taste_match_bucket']),
  passport_card_generated: new Set(['format', 'delivery', 'render_state']),
  passport_card_shared: new Set(['format', 'channel']),
  passport_public_viewed: new Set(['access', 'viewer_kind']),
  passport_cv_viewed: new Set(['surface']),
  passport_cv_downloaded: new Set(['format']),
  passport_friend_action: new Set(['action']),
  passport_replay_generated: new Set(['replay_year', 'period_state']),
  passport_replay_shared: new Set(['channel', 'replay_year']),
};

function safeScalar(value: unknown): string | number | boolean | null | undefined {
  if (value === null || typeof value === 'boolean') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') return value.slice(0, 80);
  return undefined;
}

export function sanitizePassportAnalyticsProperties(
  event: PassportProductEventName,
  properties: Record<string, unknown> = {}
): Record<string, string | number | boolean | null> {
  const allowed = ALLOWED_PROPERTIES[event];
  const sanitized: Record<string, string | number | boolean | null> = {};
  for (const [key, rawValue] of Object.entries(properties)) {
    if (!allowed.has(key)) continue;
    const value = safeScalar(rawValue);
    if (value !== undefined) sanitized[key] = value;
  }
  return sanitized;
}

export function bucketCount(value: number): string {
  if (value <= 0) return '0';
  if (value === 1) return '1';
  if (value <= 4) return '2-4';
  if (value <= 9) return '5-9';
  return '10+';
}

export function bucketPercentage(value: number | null): string {
  if (value === null) return 'discovery';
  if (value < 25) return '0-24';
  if (value < 50) return '25-49';
  if (value < 75) return '50-74';
  return '75-100';
}
