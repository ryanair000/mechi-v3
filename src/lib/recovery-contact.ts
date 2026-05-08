import { getPhoneLookupVariants, isValidPhoneNumber, normalizePhoneNumber } from '@/lib/phone';

export type RecoveryContactKind = 'email' | 'phone';

export interface ParsedRecoveryContact {
  kind: RecoveryContactKind;
  normalized: string;
  rateLimitKey: string;
  lookupVariants: string[];
}

export function isValidEmailAddress(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function normalizeRecoveryContactInput(value: string | null | undefined) {
  const trimmedValue = String(value ?? '').trim();
  return trimmedValue.includes('@') ? trimmedValue.toLowerCase() : trimmedValue;
}

export function parseRecoveryContact(value: string | null | undefined): ParsedRecoveryContact | null {
  const normalizedInput = normalizeRecoveryContactInput(value);
  if (!normalizedInput) {
    return null;
  }

  if (isValidEmailAddress(normalizedInput)) {
    return {
      kind: 'email',
      normalized: normalizedInput,
      rateLimitKey: normalizedInput,
      lookupVariants: [normalizedInput],
    };
  }

  if (!isValidPhoneNumber(normalizedInput)) {
    return null;
  }

  const normalizedPhone = normalizePhoneNumber(normalizedInput);
  const phoneVariants = getPhoneLookupVariants(normalizedPhone);

  return {
    kind: 'phone',
    normalized: normalizedPhone,
    rateLimitKey: normalizedPhone,
    lookupVariants: phoneVariants,
  };
}
