#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';

function parseArgs(argv) {
  const parsed = {
    brand: '',
    channels: 'instagram',
    type: 'photo',
    media: '',
    caption: '',
    captionFile: '',
    at: '',
    id: '',
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--brand') parsed.brand = argv[++index] || '';
    else if (arg === '--channels') parsed.channels = argv[++index] || '';
    else if (arg === '--type') parsed.type = argv[++index] || '';
    else if (arg === '--media') parsed.media = argv[++index] || '';
    else if (arg === '--caption') parsed.caption = argv[++index] || '';
    else if (arg === '--caption-file') parsed.captionFile = argv[++index] || '';
    else if (arg === '--at') parsed.at = argv[++index] || '';
    else if (arg === '--id') parsed.id = argv[++index] || '';
  }

  return parsed;
}

function stateRoot() {
  return (
    process.env.MECHI_SOCIAL_SCHEDULE_DIR ||
    resolve(process.cwd(), '..', '..', 'state', 'scheduled-posts')
  );
}

function parseWhen(value) {
  const normalized = value && !/[zZ]|[+-]\d\d:?\d\d$/.test(value) ? `${value}+03:00` : value;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid --at date/time: ${value}`);
  }
  return date.toISOString();
}

async function resolveCaption(parsed) {
  if (parsed.caption) return parsed.caption.trim();
  if (parsed.captionFile) return (await readFile(resolve(parsed.captionFile), 'utf8')).trim();
  return '';
}

async function main() {
  const parsed = parseArgs(process.argv.slice(2));
  if (!parsed.brand || !parsed.channels || !parsed.type || !parsed.media || !parsed.at) {
    console.error(
      'Usage: node scripts/schedule-social-post.mjs --brand <chezahub|playmechi> --channels <instagram|facebook|x|tiktok|tiktok-draft|all|instagram/facebook> --type <photo|video> --media <path-or-url> (--caption "text" | --caption-file ./caption.txt) --at <ISO-or-EAT-time>'
    );
    process.exit(1);
  }

  const id = (parsed.id || randomUUID()).replace(/[^A-Za-z0-9._-]+/g, '-');
  const root = stateRoot();
  const pendingDir = resolve(root, 'pending');
  await mkdir(pendingDir, { recursive: true });

  const job = {
    id,
    brand: parsed.brand.toLowerCase(),
    channels: parsed.channels.toLowerCase(),
    type: parsed.type.toLowerCase(),
    media: parsed.media,
    caption: await resolveCaption(parsed),
    scheduledAt: parseWhen(parsed.at),
    createdAt: new Date().toISOString(),
    status: 'pending',
  };

  const file = resolve(pendingDir, `${job.scheduledAt.replace(/[:.]/g, '-')}-${id}.json`);
  await writeFile(file, JSON.stringify(job, null, 2) + '\n', { mode: 0o600 });
  console.log(JSON.stringify({ ok: true, job, file }, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: error.message || String(error) }, null, 2));
  process.exit(1);
});
