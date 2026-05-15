#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseBrandCaptionMediaArgs, usageFor } from './social-media-utils.mjs';

const scriptDir = dirname(fileURLToPath(import.meta.url));

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
    const errorMessage =
      body && typeof body === 'object' && typeof body.error === 'string'
        ? body.error
        : `Child publish failed for ${scriptName}`;
    return {
      ok: false,
      error: errorMessage,
      body,
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
  const parsed = parseBrandCaptionMediaArgs(process.argv.slice(2));
  if (!parsed.brand || !parsed.media) {
    console.error(usageFor('publish-meta-video.mjs', 'video'));
    process.exit(1);
  }

  const args = toChildArgs(parsed);
  const instagram = runChild('publish-instagram-video.mjs', args);
  const facebook = runChild('publish-facebook-video.mjs', args);
  const ok = instagram.ok && facebook.ok;

  console.log(
    JSON.stringify(
      {
        ok,
        brand: parsed.brand,
        instagram: instagram.body,
        facebook: facebook.body,
        error: ok ? null : instagram.error || facebook.error || 'Meta video cross-post failed.',
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
