import { normalizeEnvValue } from '@/lib/db-compat';
import type { AuthUser } from '@/types';

export const POSTHOG_PROXY_PATH =
  normalizePublicPath(process.env.NEXT_PUBLIC_POSTHOG_PROXY_PATH) ?? '/_mhq';
export const POSTHOG_TOKEN = normalizeEnvValue(process.env.NEXT_PUBLIC_POSTHOG_TOKEN);
export const POSTHOG_REGION = normalizePostHogRegion(process.env.NEXT_PUBLIC_POSTHOG_REGION);
export const POSTHOG_API_HOST =
  normalizeEnvValue(process.env.NEXT_PUBLIC_POSTHOG_HOST) || POSTHOG_PROXY_PATH;
export const POSTHOG_UI_HOST =
  normalizeEnvValue(process.env.NEXT_PUBLIC_POSTHOG_UI_HOST) ||
  (POSTHOG_REGION === 'eu' ? 'https://eu.posthog.com' : 'https://us.posthog.com');
export const POSTHOG_SERVER_HOST =
  normalizeEnvValue(process.env.POSTHOG_SERVER_HOST) ||
  (POSTHOG_REGION === 'eu' ? 'https://eu.i.posthog.com' : 'https://us.i.posthog.com');
export const POSTHOG_ENABLED = Boolean(POSTHOG_TOKEN);

type PostHogBrowserClient = typeof import('posthog-js').default;

let postHogBrowserClientPromise: Promise<PostHogBrowserClient | null> | null = null;

const SENSITIVE_QUERY_PARAMS = new Set([
  'access_token',
  'auth_token',
  'code',
  'device',
  'device_id',
  'device_serial',
  'email',
  'ign',
  'key',
  'otp',
  'password',
  'phone',
  'refresh_token',
  'serial',
  'serial_number',
  'state',
  'token',
  'uid',
  'whatsapp',
  'whatsapp_number',
]);

function normalizePostHogRegion(value: string | undefined) {
  return normalizeEnvValue(value).toLowerCase() === 'eu' ? 'eu' : 'us';
}

function normalizePublicPath(value: string | undefined) {
  const cleaned = normalizeEnvValue(value);
  if (!cleaned) {
    return null;
  }

  const path = cleaned.startsWith('/') ? cleaned : `/${cleaned}`;
  return path.replace(/\/+$/, '') || null;
}

export function getSafeAnalyticsPath(pathname: string, searchParams: { toString(): string }) {
  const safeParams = new URLSearchParams(searchParams.toString());

  for (const key of Array.from(safeParams.keys())) {
    if (SENSITIVE_QUERY_PARAMS.has(key.toLowerCase())) {
      safeParams.delete(key);
    }
  }

  const query = safeParams.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function getPostHogPersonProperties(user: AuthUser) {
  return {
    username: user.username,
    role: user.role ?? 'user',
    plan: user.plan ?? 'free',
    country: user.country ?? null,
    region: user.region ?? null,
    selected_games: user.selected_games,
    platforms: user.platforms,
    level: user.level ?? null,
    is_banned: Boolean(user.is_banned),
  };
}

export function getPostHogBrowserClient(): Promise<PostHogBrowserClient | null> {
  if (!POSTHOG_ENABLED || typeof window === 'undefined') {
    return Promise.resolve(null);
  }

  if (!postHogBrowserClientPromise) {
    postHogBrowserClientPromise = import('posthog-js').then(({ default: posthog }) => {
      posthog.init(POSTHOG_TOKEN, {
        api_host: POSTHOG_API_HOST,
        ui_host: POSTHOG_UI_HOST,
        defaults: '2026-01-30',
        capture_pageview: false,
        person_profiles: 'identified_only',
        loaded: (client) => {
          const captureInDevelopment =
            process.env.NEXT_PUBLIC_POSTHOG_CAPTURE_IN_DEV === 'true';
          if (process.env.NODE_ENV !== 'production' && !captureInDevelopment) {
            client.opt_out_capturing();
          }
        },
      });

      return posthog;
    });
  }

  return postHogBrowserClientPromise;
}
