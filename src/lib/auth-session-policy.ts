export const LEGACY_AUTH_SESSION_VERSION = 1;

export function normalizeAuthSessionVersion(value: unknown): number {
  const version = typeof value === 'number' ? value : Number(value);
  return Number.isSafeInteger(version) && version >= 1
    ? version
    : LEGACY_AUTH_SESSION_VERSION;
}

export function isAuthSessionVersionCurrent(
  tokenVersion: unknown,
  profileVersion: unknown
): boolean {
  return normalizeAuthSessionVersion(tokenVersion)
    === normalizeAuthSessionVersion(profileVersion);
}

export function nextAuthSessionVersion(value: unknown): number {
  const current = normalizeAuthSessionVersion(value);
  if (current >= 2_147_483_647) {
    throw new RangeError('Auth session version cannot be incremented');
  }
  return current + 1;
}
