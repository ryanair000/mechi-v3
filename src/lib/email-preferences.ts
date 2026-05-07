import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { APP_URL } from '@/lib/urls';

export type EmailPreferenceScope = 'broadcast' | 'all';

const DEFAULT_SCOPE: EmailPreferenceScope = 'broadcast';

export function normalizeEmailPreferenceScope(value: string | null | undefined): EmailPreferenceScope {
  return value === 'all' ? 'all' : DEFAULT_SCOPE;
}

export function normalizePreferenceEmail(value: string | null | undefined) {
  return String(value ?? '').trim().toLowerCase();
}

function getUnsubscribeSecret() {
  const secret = process.env.EMAIL_UNSUBSCRIBE_SECRET?.trim() || process.env.JWT_SECRET?.trim();
  if (secret) {
    return secret;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('EMAIL_UNSUBSCRIBE_SECRET or JWT_SECRET is required');
  }

  return 'development-email-unsubscribe-secret';
}

export function createEmailUnsubscribeToken(
  email: string,
  scope: EmailPreferenceScope = DEFAULT_SCOPE
) {
  const normalizedEmail = normalizePreferenceEmail(email);
  return createHmac('sha256', getUnsubscribeSecret())
    .update(`${scope}:${normalizedEmail}`)
    .digest('base64url');
}

export function hashEmailUnsubscribeToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export function verifyEmailUnsubscribeToken(params: {
  email: string;
  scope?: string | null;
  token: string;
}) {
  const scope = normalizeEmailPreferenceScope(params.scope);
  const expectedToken = createEmailUnsubscribeToken(params.email, scope);
  const submittedToken = params.token.trim();
  const expected = Buffer.from(expectedToken);
  const submitted = Buffer.from(submittedToken);

  return expected.length === submitted.length && timingSafeEqual(expected, submitted);
}

export function buildEmailUnsubscribeUrl(
  email: string,
  scope: EmailPreferenceScope = DEFAULT_SCOPE
) {
  const normalizedEmail = normalizePreferenceEmail(email);
  const url = new URL('/api/email/unsubscribe', APP_URL);
  url.searchParams.set('email', normalizedEmail);
  url.searchParams.set('scope', scope);
  url.searchParams.set('token', createEmailUnsubscribeToken(normalizedEmail, scope));
  return url.toString();
}

export async function getUnsubscribedEmailSet(
  supabase: SupabaseClient,
  emails: string[],
  scope: EmailPreferenceScope = DEFAULT_SCOPE
) {
  const normalizedEmails = Array.from(
    new Set(emails.map(normalizePreferenceEmail).filter(Boolean))
  );

  if (normalizedEmails.length === 0) {
    return new Set<string>();
  }

  const { data, error } = await supabase
    .from('email_unsubscribes')
    .select('normalized_email, scope')
    .in('normalized_email', normalizedEmails)
    .in('scope', [scope, 'all']);

  if (error) {
    console.error('[Email Preferences] Failed to load unsubscribe preferences:', error);
    return new Set<string>();
  }

  return new Set(
    ((data ?? []) as Array<{ normalized_email?: string | null }>)
      .map((row) => normalizePreferenceEmail(row.normalized_email))
      .filter(Boolean)
  );
}
