import 'server-only';

import { createHash } from 'node:crypto';

export type PassportRolloutFeature = 'connections' | 'developer_api' | 'partner_api' | 'webhook_delivery';

const FEATURE_ENV: Record<PassportRolloutFeature, string> = {
  connections: 'PASSPORT_CONNECTIONS_ENABLED',
  developer_api: 'PASSPORT_DEVELOPER_API_ENABLED',
  partner_api: 'PASSPORT_PARTNER_API_ENABLED',
  webhook_delivery: 'PASSPORT_WEBHOOK_DELIVERY_ENABLED',
};

function booleanEnv(name: string) {
  const value = process.env[name]?.trim().toLowerCase();
  if (value === 'true' || value === '1' || value === 'yes') return true;
  if (value === 'false' || value === '0' || value === 'no') return false;
  return process.env.NODE_ENV !== 'production';
}

function rolloutPercent() {
  const value = Number.parseInt(process.env.PASSPORT_EXTERNAL_ROLLOUT_PERCENT ?? '', 10);
  if (Number.isFinite(value)) return Math.max(0, Math.min(100, value));
  return process.env.NODE_ENV === 'production' ? 0 : 100;
}

function explicitBetaUsers() {
  return new Set((process.env.PASSPORT_BETA_USER_IDS ?? '').split(',').map((value) => value.trim()).filter(Boolean));
}

function cohortBucket(userId: string) {
  const digest = createHash('sha256').update(`mechi-passport-rollout:${userId}`).digest();
  return digest.readUInt32BE(0) % 100;
}

export function getPassportFeatureAccess(feature: PassportRolloutFeature, userId?: string | null) {
  const configured = booleanEnv(FEATURE_ENV[feature]);
  const percent = rolloutPercent();
  const cohortControlled = feature === 'connections' || feature === 'developer_api';
  const explicitlyAllowed = Boolean(userId && explicitBetaUsers().has(userId));
  const inCohort = !cohortControlled || !userId || explicitlyAllowed || cohortBucket(userId) < percent;
  const enabled = configured && inCohort;
  return {
    feature,
    enabled,
    configured,
    rollout_percent: percent,
    cohort_controlled: cohortControlled,
    explicitly_allowed: explicitlyAllowed,
    reason: enabled ? null : !configured ? 'Feature is disabled by the operator kill switch' : 'Account is outside the current rollout cohort',
  };
}

export function getPassportRolloutSnapshot() {
  return {
    environment: process.env.NODE_ENV ?? 'development',
    connections: getPassportFeatureAccess('connections'),
    developer_api: getPassportFeatureAccess('developer_api'),
    partner_api: getPassportFeatureAccess('partner_api'),
    webhook_delivery: getPassportFeatureAccess('webhook_delivery'),
    rollout_percent: rolloutPercent(),
    beta_user_count: explicitBetaUsers().size,
  };
}
