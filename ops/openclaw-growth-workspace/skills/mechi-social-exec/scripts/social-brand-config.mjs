import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const DEFAULT_GRAPH_API_VERSION = 'v25.0';

const BRAND_DEFINITIONS = {
  chezahub: {
    label: 'ChezaHub',
    fallbackToGenericInstagramId: true,
    fallbackToGenericFacebookPage: true,
    fallbackToGenericFacebookPageToken: true,
    aliases: ['chezahub', 'cheza hub', 'chezahub.co.ke', '@chezahub'],
  },
  playmechi: {
    label: 'PlayMechi',
    fallbackToGenericInstagramId: false,
    fallbackToGenericFacebookPage: false,
    fallbackToGenericFacebookPageToken: false,
    aliases: ['playmechi', 'play mechi', '@playmechi', 'mechi.club/playmechi'],
  },
};

function normalizeValue(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed) {
    return '';
  }

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }

  return trimmed;
}

function buildScopedNames(brandKey, suffix) {
  const upper = brandKey.toUpperCase();
  return [`${upper}_${suffix}`, `SOCIO_${upper}_${suffix}`];
}

function loadEnvFiles() {
  const env = new Map();
  const candidates = [
    resolve(process.cwd(), '.env'),
    resolve(process.cwd(), '../../.env'),
    process.env.HOME ? resolve(process.env.HOME, '.openclaw/.env') : '',
    process.env.HOME ? resolve(process.env.HOME, '.openclaw/workspace-growth/.env') : '',
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (!existsSync(candidate)) {
      continue;
    }

    for (const line of readFileSync(candidate, 'utf8').split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) {
        continue;
      }

      const [left, ...rest] = trimmed.split('=');
      const key = left.replace(/^export\s+/, '').trim();
      const value = normalizeValue(rest.join('=').trim());
      if (key && value && !env.has(key)) {
        env.set(key, value);
      }
    }
  }

  return env;
}

const loadedEnv = loadEnvFiles();

function envFirst(names) {
  for (const name of names) {
    const value = normalizeValue(process.env[name] ?? loadedEnv.get(name) ?? '');
    if (value) {
      return value;
    }
  }

  return '';
}

function collectPresence(names) {
  return Object.fromEntries(names.map((name) => [name, Boolean(envFirst([name]))]));
}

function resolveBrandKey(input) {
  const normalized = String(input || '').trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  if (BRAND_DEFINITIONS[normalized]) {
    return normalized;
  }

  for (const [brandKey, definition] of Object.entries(BRAND_DEFINITIONS)) {
    if (definition.aliases.some((alias) => alias.toLowerCase() === normalized)) {
      return brandKey;
    }
  }

  return null;
}

function inferBrandFromText(input) {
  const normalized = String(input || '').trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  for (const [brandKey, definition] of Object.entries(BRAND_DEFINITIONS)) {
    if (definition.aliases.some((alias) => normalized.includes(alias.toLowerCase()))) {
      return brandKey;
    }
  }

  return null;
}

function buildGenericInstagramNames() {
  return ['INSTAGRAM_ACCESS_TOKEN', 'MECHI_INSTAGRAM_ACCESS_TOKEN'];
}

function buildGenericInstagramIdNames() {
  return ['INSTAGRAM_BUSINESS_ACCOUNT_ID', 'MECHI_INSTAGRAM_USER_ID'];
}

function buildGenericFacebookNames() {
  return {
    userAccessToken: ['FACEBOOK_USER_ACCESS_TOKEN'],
    appId: ['FACEBOOK_APP_ID'],
    appSecret: ['FACEBOOK_APP_SECRET'],
    pageId: ['FACEBOOK_PAGE_ID'],
    pageAccessToken: ['FACEBOOK_PAGE_ACCESS_TOKEN'],
    graphApiVersion: ['FACEBOOK_GRAPH_API_VERSION'],
  };
}

function getBrandConfig(input) {
  const brandKey = resolveBrandKey(input);
  if (!brandKey) {
    throw new Error(`Unknown social brand: ${input}`);
  }

  const definition = BRAND_DEFINITIONS[brandKey];
  const genericFacebookNames = buildGenericFacebookNames();
  const instagramAccessTokenNames = [
    ...buildScopedNames(brandKey, 'INSTAGRAM_ACCESS_TOKEN'),
    ...buildGenericInstagramNames(),
  ];
  const instagramBusinessAccountIdNames = [
    ...buildScopedNames(brandKey, 'INSTAGRAM_BUSINESS_ACCOUNT_ID'),
    ...buildScopedNames(brandKey, 'INSTAGRAM_USER_ID'),
    ...(definition.fallbackToGenericInstagramId ? buildGenericInstagramIdNames() : []),
  ];
  const facebookPageIdNames = [
    ...buildScopedNames(brandKey, 'FACEBOOK_PAGE_ID'),
    ...(definition.fallbackToGenericFacebookPage ? genericFacebookNames.pageId : []),
  ];
  const facebookPageAccessTokenNames = [
    ...buildScopedNames(brandKey, 'FACEBOOK_PAGE_ACCESS_TOKEN'),
    ...(definition.fallbackToGenericFacebookPageToken ? genericFacebookNames.pageAccessToken : []),
  ];

  const config = {
    brand: brandKey,
    label: definition.label,
    instagram: {
      accessToken: envFirst(instagramAccessTokenNames),
      businessAccountId: envFirst(instagramBusinessAccountIdNames),
      username:
        envFirst(buildScopedNames(brandKey, 'INSTAGRAM_USERNAME')) ||
        (brandKey === 'chezahub' ? 'chezahub' : brandKey),
      requiredNames: {
        accessToken: instagramAccessTokenNames,
        businessAccountId: instagramBusinessAccountIdNames,
      },
    },
    facebook: {
      userAccessToken: envFirst([
        ...buildScopedNames(brandKey, 'FACEBOOK_USER_ACCESS_TOKEN'),
        ...genericFacebookNames.userAccessToken,
      ]),
      appId: envFirst([
        ...buildScopedNames(brandKey, 'FACEBOOK_APP_ID'),
        ...genericFacebookNames.appId,
      ]),
      appSecret: envFirst([
        ...buildScopedNames(brandKey, 'FACEBOOK_APP_SECRET'),
        ...genericFacebookNames.appSecret,
      ]),
      pageId: envFirst(facebookPageIdNames),
      pageAccessToken: envFirst(facebookPageAccessTokenNames),
      graphApiVersion:
        envFirst([
          ...buildScopedNames(brandKey, 'FACEBOOK_GRAPH_API_VERSION'),
          ...genericFacebookNames.graphApiVersion,
        ]) || DEFAULT_GRAPH_API_VERSION,
      pageName:
        envFirst(buildScopedNames(brandKey, 'FACEBOOK_PAGE_NAME')) || definition.label,
      requiredNames: {
        pageId: facebookPageIdNames,
        pageAccessToken: facebookPageAccessTokenNames,
      },
    },
    imgurClientId: envFirst(['IMGUR_CLIENT_ID', ...buildScopedNames(brandKey, 'IMGUR_CLIENT_ID')]),
    cloudinary: {
      cloudName: envFirst(['CLOUDINARY_CLOUD_NAME']),
      apiKey: envFirst(['CLOUDINARY_API_KEY']),
      apiSecret: envFirst(['CLOUDINARY_API_SECRET']),
    },
  };

  config.readiness = {
    instagram: Boolean(config.instagram.accessToken && config.instagram.businessAccountId),
    facebook: Boolean(config.facebook.pageId && config.facebook.pageAccessToken),
    crossPostPair: Boolean(
      config.instagram.accessToken &&
        config.instagram.businessAccountId &&
        config.facebook.pageId &&
        config.facebook.pageAccessToken
    ),
  };

  return config;
}

function getAllBrandConfigs() {
  return Object.fromEntries(
    Object.keys(BRAND_DEFINITIONS).map((brandKey) => [brandKey, getBrandConfig(brandKey)])
  );
}

export {
  BRAND_DEFINITIONS,
  DEFAULT_GRAPH_API_VERSION,
  collectPresence,
  envFirst,
  getAllBrandConfigs,
  getBrandConfig,
  inferBrandFromText,
  normalizeValue,
  resolveBrandKey,
};
