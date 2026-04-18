function normalizeUrl(value: string) {
  return value.replace(/\/+$/, '');
}

export const APP_URL = normalizeUrl(
  process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXT_PUBLIC_BASE_URL ??
    'https://mechi.club'
);

export const ADMIN_URL = normalizeUrl(
  process.env.NEXT_PUBLIC_ADMIN_URL ?? 'https://mechi.lokimax.top'
);

export const ADMIN_HOST = new URL(ADMIN_URL).host.toLowerCase();
