export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 30;

export interface UsernameValidationResult {
  username: string;
  error: string | null;
}

export function normalizeUsername(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

export function validateUsername(value: unknown): UsernameValidationResult {
  const username = normalizeUsername(value);

  if (!username) {
    return {
      username,
      error: 'Enter a username first',
    };
  }

  if (username.length < USERNAME_MIN_LENGTH) {
    return {
      username,
      error: `Username must be at least ${USERNAME_MIN_LENGTH} characters`,
    };
  }

  if (username.length > USERNAME_MAX_LENGTH) {
    return {
      username,
      error: `Username must be ${USERNAME_MAX_LENGTH} characters or fewer`,
    };
  }

  return {
    username,
    error: null,
  };
}
