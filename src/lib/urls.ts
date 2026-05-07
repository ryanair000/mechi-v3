function normalizeUrl(value: string) {
  return value.replace(/\/+$/, '');
}

function normalizeHost(value: string) {
  return value.split(':')[0].trim().toLowerCase();
}

export const APP_URL = normalizeUrl(
  process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXT_PUBLIC_BASE_URL ??
    'https://mechi.club'
);

export const ADMIN_URL = normalizeUrl(
  process.env.NEXT_PUBLIC_ADMIN_URL ?? 'https://mechi.lokimax.top'
);

export const APP_HOST = normalizeHost(new URL(APP_URL).host);
export const ADMIN_HOST = normalizeHost(new URL(ADMIN_URL).host);
