import 'server-only';

import { isMissingColumnError, isMissingFunctionError } from '@/lib/db-compat';
import { createServiceClient } from '@/lib/supabase';
import type {
  AgePolicySource,
  AgePolicyStatus,
  PrivateAgePolicy,
} from '@/lib/passport-types';

export const MINOR_PASSPORT_PRIVACY_ERROR =
  'Minor-account privacy protections keep this Gamer Passport private';

export function normalizeAgePolicyStatus(value: unknown): AgePolicyStatus {
  return value === 'minor' || value === 'adult' ? value : 'unknown';
}

function normalizeAgePolicySource(value: unknown): AgePolicySource | null {
  return value === 'self_declared' || value === 'admin' ? value : null;
}

function mapAgePolicy(row: Record<string, unknown> | null, storageReady: boolean): PrivateAgePolicy {
  return {
    status: normalizeAgePolicyStatus(row?.age_policy_status),
    source: normalizeAgePolicySource(row?.age_policy_source),
    updated_at: typeof row?.age_policy_updated_at === 'string'
      ? row.age_policy_updated_at
      : null,
    storage_ready: storageReady,
  };
}

export async function getProfileAgePolicy(userId: string): Promise<PrivateAgePolicy> {
  const { data, error } = await createServiceClient()
    .from('profiles')
    .select('age_policy_status, age_policy_source, age_policy_updated_at')
    .eq('id', userId)
    .maybeSingle();

  if (error && isMissingColumnError(error, 'profiles.age_policy_status')) {
    return mapAgePolicy(null, false);
  }
  if (error || !data) {
    return mapAgePolicy(null, !error);
  }
  return mapAgePolicy(data as Record<string, unknown>, true);
}

export async function isMinorAccount(userId: string): Promise<boolean> {
  return (await getProfileAgePolicy(userId)).status === 'minor';
}

type AgePolicyMutationResult = {
  policy: PrivateAgePolicy | null;
  error: string | null;
  storageReady: boolean;
};

async function setAgePolicy(params: {
  userId: string;
  actorId: string;
  status: AgePolicyStatus;
  source: AgePolicySource;
  reason?: string | null;
}): Promise<AgePolicyMutationResult> {
  const { data, error } = await createServiceClient().rpc('set_profile_age_policy', {
    p_user_id: params.userId,
    p_actor_id: params.actorId,
    p_new_status: params.status,
    p_source: params.source,
    p_reason: params.reason ?? null,
  });

  if (error) {
    if (isMissingFunctionError(error, 'set_profile_age_policy')) {
      return {
        policy: null,
        error: 'Minor-account policy storage is not ready',
        storageReady: false,
      };
    }
    const message = error.message.includes('administrator review')
      ? 'Minor protections require administrator review to remove'
      : error.message.includes('reason')
        ? 'A reason is required for this age-policy change'
        : 'Could not update minor-account privacy policy';
    return { policy: null, error: message, storageReady: true };
  }

  const row = Array.isArray(data) ? data[0] : data;
  return {
    policy: mapAgePolicy((row ?? null) as Record<string, unknown> | null, true),
    error: null,
    storageReady: true,
  };
}

export function setSelfDeclaredAgePolicy(
  userId: string,
  status: Extract<AgePolicyStatus, 'minor' | 'adult'>
) {
  return setAgePolicy({
    userId,
    actorId: userId,
    status,
    source: 'self_declared',
  });
}

export function setAdminAgePolicy(params: {
  userId: string;
  actorId: string;
  status: AgePolicyStatus;
  reason: string;
}) {
  return setAgePolicy({
    ...params,
    source: 'admin',
  });
}
