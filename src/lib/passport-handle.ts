export const PASSPORT_PUBLICATION_CONSENT_VERSION = 'passport-publication-2026-08-14';

export const PASSPORT_PUBLICATION_STATUSES = ['draft', 'published'] as const;
export type PassportPublicationStatus = (typeof PASSPORT_PUBLICATION_STATUSES)[number];

export const PASSPORT_HANDLE_MIN_LENGTH = 3;
export const PASSPORT_HANDLE_MAX_LENGTH = 20;

const PASSPORT_RESERVED_HANDLES = new Set([
  'about', 'account', 'admin', 'api', 'app', 'auth', 'billing', 'blog', 'careers',
  'compare', 'contact', 'dashboard', 'discover', 'events', 'games', 'help', 'home',
  'login', 'logout', 'me', 'mechi', 'moderation', 'news', 'notifications', 'ops',
  'passport', 'playmechi', 'privacy', 'profile', 'register', 'resume', 'root',
  'search', 'security', 'settings', 'signin', 'signup', 'support', 'system', 'teams',
  'terms', 'tournaments', 'verify', 'www',
]);

const PASSPORT_HANDLE_PATTERN = /^[a-z][a-z0-9_]{2,19}$/;

export type PassportHandleValidation =
  | { valid: true; handle: string }
  | { valid: false; handle: string; error: string };

export function normalizePassportHandle(value: string): string {
  let decoded = value;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    return '';
  }

  const trimmed = decoded.trim();
  return (trimmed.startsWith('@') ? trimmed.slice(1) : trimmed).trim().toLowerCase();
}

export function validatePassportHandle(value: string): PassportHandleValidation {
  const handle = normalizePassportHandle(value);
  if (handle.length < PASSPORT_HANDLE_MIN_LENGTH || handle.length > PASSPORT_HANDLE_MAX_LENGTH) {
    return { valid: false, handle, error: 'Handle must be 3–20 characters.' };
  }
  if (!/^[a-z]/.test(handle)) {
    return { valid: false, handle, error: 'Handle must start with a letter.' };
  }
  if (!PASSPORT_HANDLE_PATTERN.test(handle)) {
    return {
      valid: false,
      handle,
      error: 'Use only lowercase letters, numbers, and underscores.',
    };
  }
  if (PASSPORT_RESERVED_HANDLES.has(handle)) {
    return { valid: false, handle, error: 'That handle is reserved.' };
  }
  return { valid: true, handle };
}

export function isSafePassportHandle(value: string): boolean {
  return validatePassportHandle(value).valid;
}

export function isSafePassportDisplayName(value: string): boolean {
  const displayName = value.trim();
  if (displayName.length < 2 || displayName.length > 40) return false;
  if (/\S+@\S+\.\S+/.test(displayName)) return false;
  if (/https?:\/\/|www\./i.test(displayName)) return false;
  if ((displayName.match(/\d/g) ?? []).length >= 7) return false;
  return true;
}

export function getPassportPathFromHandle(handle: string): string {
  const validation = validatePassportHandle(handle);
  return validation.valid ? `/@${validation.handle}` : '';
}
