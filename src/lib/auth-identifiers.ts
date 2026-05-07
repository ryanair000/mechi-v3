import { getPhoneLookupVariants, normalizePhoneNumber } from '@/lib/phone';
import { createServiceClient } from '@/lib/supabase';

export type LoginMethod = 'auto' | 'email' | 'phone' | 'username';

export interface LoginIdentifierProfile {
  id: string;
  username?: string | null;
  phone?: string | null;
  email?: string | null;
  password_hash?: string | null;
  is_banned?: boolean | null;
  ban_reason?: string | null;
}

export function detectIdentifierType(identifier: string): Exclude<LoginMethod, 'auto'> {
  if (identifier.includes('@')) {
    return 'email';
  }

  if (/^[+\d][\d\s\-()]{7,}$/.test(identifier)) {
    return 'phone';
  }

  return 'username';
}

export function parseLoginMethod(value: unknown): LoginMethod {
  return value === 'email' || value === 'phone' || value === 'username' ? value : 'auto';
}

export async function getCandidateProfiles(identifier: string, loginMethod: LoginMethod) {
  const supabase = createServiceClient();
  const trimmedIdentifier = identifier.trim();
  const method = loginMethod === 'auto' ? detectIdentifierType(trimmedIdentifier) : loginMethod;

  if (method === 'email') {
    const result = await supabase
      .from('profiles')
      .select('*')
      .ilike('email', trimmedIdentifier.toLowerCase())
      .limit(1);

    return {
      profiles: (result.data as LoginIdentifierProfile[] | null) ?? [],
      error: result.error,
    };
  }

  if (method === 'phone') {
    const phoneVariants = getPhoneLookupVariants(normalizePhoneNumber(trimmedIdentifier));
    const result = await supabase
      .from('profiles')
      .select('*')
      .in('phone', phoneVariants)
      .limit(10);

    return {
      profiles: (result.data as LoginIdentifierProfile[] | null) ?? [],
      error: result.error,
    };
  }

  const result = await supabase
    .from('profiles')
    .select('*')
    .ilike('username', trimmedIdentifier)
    .limit(1);

  return {
    profiles: (result.data as LoginIdentifierProfile[] | null) ?? [],
    error: result.error,
  };
}

export function getSingleRecoverableProfile(profiles: LoginIdentifierProfile[]) {
  const uniqueProfiles = [...new Map(profiles.map((profile) => [profile.id, profile])).values()];

  if (uniqueProfiles.length !== 1) {
    return null;
  }

  const [profile] = uniqueProfiles;
  if (!profile?.email || profile.is_banned) {
    return null;
  }

  return profile;
}
