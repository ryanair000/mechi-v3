#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { collectPresence, getAllBrandConfigs } from './social-brand-config.mjs';
import { verifyXCredentials } from './x-api-utils.mjs';

const REQUIRED = {
  instagram: ['INSTAGRAM_ACCESS_TOKEN', 'INSTAGRAM_BUSINESS_ACCOUNT_ID'],
  facebook: ['FACEBOOK_PAGE_ID', 'FACEBOOK_PAGE_ACCESS_TOKEN'],
  tiktok: [],
  x: [],
  discord: [],
  mediaStaging: [],
};

const OPTIONAL = {
  instagram: ['IMGUR_CLIENT_ID'],
  facebook: ['FACEBOOK_APP_ID', 'FACEBOOK_APP_SECRET', 'FACEBOOK_USER_ACCESS_TOKEN'],
  tiktok: [
    'TIKTOK_ACCESS_TOKEN',
    'PLAYMECHI_TIKTOK_ACCESS_TOKEN',
    'CHEZAHUB_TIKTOK_ACCESS_TOKEN',
    'TIKTOK_CLIENT_KEY',
    'TIKTOK_CLIENT_SECRET',
    'TIKTOK_PRIVACY_LEVEL',
  ],
  x: ['X_API_KEY', 'X_API_SECRET', 'X_ACCESS_TOKEN', 'X_ACCESS_TOKEN_SECRET', 'X_OAUTH2_ACCESS_TOKEN'],
  discord: ['DISCORD_BOT_TOKEN', 'DISCORD_GUILD_ID', 'DISCORD_USER_ID', 'DISCORD_POST_CHANNEL_ID', 'DISCORD_WEBHOOK_URL'],
  mediaStaging: ['SOCIO_S3_STAGING_BUCKET', 'SOCIO_S3_STAGING_PREFIX', 'CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'],
};

function resolveXurlBin() {
  const home = process.env.HOME || '';
  const candidates = [
    process.env.XURL_BIN || '',
    home ? `${home}/.npm-global/bin/xurl` : '',
    '/usr/local/bin/xurl',
    '/usr/bin/xurl',
    'xurl',
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (candidate === 'xurl' || existsSync(candidate)) {
      return candidate;
    }
  }

  return 'xurl';
}

function commandStatus(command, args = []) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    shell: false,
  });

  if (result.error) {
    return {
      ok: false,
      exitCode: null,
      stdout: '',
      stderr: result.error.message,
    };
  }

  return {
    ok: result.status === 0,
    exitCode: result.status,
    stdout: (result.stdout || '').trim(),
    stderr: (result.stderr || '').trim(),
  };
}

const json = process.argv.includes('--json');
const brands = getAllBrandConfigs();

const report = {
  brands: Object.fromEntries(
    Object.entries(brands).map(([brandKey, config]) => [
      brandKey,
      {
        label: config.label,
        readiness: config.readiness,
        instagram: {
          username: config.instagram.username,
          required: {
            accessTokenPresent: Boolean(config.instagram.accessToken),
            businessAccountIdPresent: Boolean(config.instagram.businessAccountId),
          },
        },
        facebook: {
          pageName: config.facebook.pageName,
          required: {
            pageIdPresent: Boolean(config.facebook.pageId),
            pageAccessTokenPresent: Boolean(config.facebook.pageAccessToken),
          },
        },
        tiktok: {
          username: config.tiktok.username,
          privacyLevel: config.tiktok.privacyLevel,
          required: {
            accessTokenPresent: Boolean(config.tiktok.accessToken),
            clientKeyPresent: Boolean(config.tiktok.clientKey),
            clientSecretPresent: Boolean(config.tiktok.clientSecret),
          },
        },
      },
    ])
  ),
  instagram: {
    required: collectPresence(REQUIRED.instagram),
    optional: collectPresence(OPTIONAL.instagram),
  },
  facebook: {
    required: collectPresence(REQUIRED.facebook),
    optional: collectPresence(OPTIONAL.facebook),
  },
  tiktok: {
    required: collectPresence(REQUIRED.tiktok),
    optional: collectPresence(OPTIONAL.tiktok),
  },
  x: {
    optional: collectPresence(OPTIONAL.x),
    xurl: commandStatus(resolveXurlBin(), ['auth', 'status']),
  },
  discord: {
    optional: collectPresence(OPTIONAL.discord),
  },
  mediaStaging: {
    optional: collectPresence(OPTIONAL.mediaStaging),
  },
};

if (
  report.x.optional.X_API_KEY &&
  report.x.optional.X_API_SECRET &&
  report.x.optional.X_ACCESS_TOKEN &&
  report.x.optional.X_ACCESS_TOKEN_SECRET
) {
  try {
    const whoami = await verifyXCredentials();
    report.x.directApi = {
      ok: true,
      user: whoami?.data ?? null,
    };
  } catch (error) {
    report.x.directApi = {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

if (json) {
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}

function renderSection(name, section) {
  console.log(name);
  if (section.required) {
    console.log('  required');
    for (const [key, value] of Object.entries(section.required)) {
      console.log(`    ${key}: ${value ? 'present' : 'missing'}`);
    }
  }
  if (section.optional) {
    console.log('  optional');
    for (const [key, value] of Object.entries(section.optional)) {
      console.log(`    ${key}: ${value ? 'present' : 'missing'}`);
    }
  }
  if (section.xurl) {
    console.log(`  xurl installed/auth ok: ${section.xurl.ok ? 'yes' : 'no'}`);
    if (section.xurl.stdout) {
      console.log(`  xurl stdout: ${section.xurl.stdout}`);
    }
    if (section.xurl.stderr) {
      console.log(`  xurl stderr: ${section.xurl.stderr}`);
    }
  }
  if (section.directApi) {
    console.log(`  direct api ok: ${section.directApi.ok ? 'yes' : 'no'}`);
    if (section.directApi.user) {
      console.log(`  direct api user: ${JSON.stringify(section.directApi.user)}`);
    }
    if (section.directApi.error) {
      console.log(`  direct api error: ${section.directApi.error}`);
    }
  }
}

console.log('brands');
for (const [brandKey, config] of Object.entries(report.brands)) {
  console.log(`  ${brandKey}`);
  console.log(`    instagram ready: ${config.readiness.instagram ? 'yes' : 'no'}`);
  console.log(`    facebook ready: ${config.readiness.facebook ? 'yes' : 'no'}`);
  console.log(`    tiktok ready: ${config.readiness.tiktok ? 'yes' : 'no'}`);
  console.log(`    instagram+facebook pair ready: ${config.readiness.crossPostPair ? 'yes' : 'no'}`);
}

renderSection('instagram', report.instagram);
renderSection('facebook', report.facebook);
renderSection('tiktok', report.tiktok);
renderSection('x', report.x);
renderSection('discord', report.discord);
renderSection('mediaStaging', report.mediaStaging);
