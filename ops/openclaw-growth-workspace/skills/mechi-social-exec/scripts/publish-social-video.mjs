#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseBrandCaptionMediaArgs, usageFor } from './social-media-utils.mjs';

const scriptDir = dirname(fileURLToPath(import.meta.url));

function parseChannels(argv) {
  let channels = '';
  const rest = [];

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--channels') {
      channels = argv[index + 1] || '';
      index += 1;
      continue;
    }
    rest.push(arg);
  }

  return {
    channels,
    rest,
  };
}

function normalizeChannels(value) {
  const raw = (value || 'instagram').trim().toLowerCase();
  if (!raw) {
    return ['instagram'];
  }
  if (raw === 'all') {
    return ['instagram', 'facebook', 'x'];
  }

  return Array.from(
    new Set(
      raw
        .split(/[,+/]/)
        .map((entry) => entry.trim())
        .map((entry) => (entry === 'tiktokdraft' || entry === 'tiktok_draft' ? 'tiktok-draft' : entry))
        .filter(Boolean)
    )
  );
}

function runChild(scriptName, args) {
  const result = spawnSync(process.execPath, [resolve(scriptDir, scriptName), ...args], {
    encoding: 'utf8',
    shell: false,
  });

  const raw = (result.stdout || result.stderr || '').trim();
  let body = raw;
  try {
    body = raw ? JSON.parse(raw) : null;
  } catch {}

  if (result.status !== 0) {
    return {
      ok: false,
      body,
      error:
        body && typeof body === 'object' && typeof body.error === 'string'
          ? body.error
          : `Child publish failed for ${scriptName}`,
    };
  }

  return {
    ok: true,
    body,
  };
}

function toChildArgs(parsed) {
  const args = ['--brand', parsed.brand];
  if (parsed.caption) {
    args.push('--caption', parsed.caption);
  } else if (parsed.captionFile) {
    args.push('--caption-file', parsed.captionFile);
  }
  args.push(parsed.media);
  return args;
}

async function main() {
  const parsedChannels = parseChannels(process.argv.slice(2));
  const parsed = parseBrandCaptionMediaArgs(parsedChannels.rest);
  if (!parsed.brand || !parsed.media) {
    console.error(
      `${usageFor('publish-social-video.mjs', 'video')} --channels instagram|facebook|x|tiktok|tiktok-draft|all|instagram/facebook`
    );
    process.exit(1);
  }

  const channels = normalizeChannels(parsedChannels.channels);
  const childArgs = toChildArgs(parsed);
  const results = {};

  for (const channel of channels) {
    if (channel === 'instagram') {
      results.instagram = runChild('publish-instagram-video.mjs', childArgs);
    } else if (channel === 'facebook') {
      results.facebook = runChild('publish-facebook-video.mjs', childArgs);
    } else if (channel === 'x') {
      results.x = runChild('publish-x-video.mjs', childArgs);
    } else if (channel === 'tiktok') {
      results.tiktok = runChild('publish-tiktok-video.mjs', childArgs);
    } else if (channel === 'tiktok-draft') {
      results.tiktokDraft = runChild('publish-tiktok-draft-video.mjs', childArgs);
    } else {
      results[channel] = {
        ok: false,
        error: `Unsupported channel: ${channel}`,
      };
    }
  }

  const ok = Object.values(results).every((entry) => entry && entry.ok);
  console.log(
    JSON.stringify(
      {
        ok,
        brand: parsed.brand,
        channels,
        results: Object.fromEntries(
          Object.entries(results).map(([key, value]) => [key, value.body ?? { ok: false, error: value.error }])
        ),
      },
      null,
      2
    )
  );

  if (!ok) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      },
      null,
      2
    )
  );
  process.exitCode = 1;
});
