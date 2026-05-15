#!/usr/bin/env node
import { basename, extname } from 'node:path';
import { readFile } from 'node:fs/promises';

const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL?.trim() || '';
const DEFAULT_USERNAME = process.env.DISCORD_WEBHOOK_USERNAME?.trim() || 'PlayMechi';

function usage() {
  console.error('Usage: node scripts/publish-discord-webhook.mjs (--message "text" | --message-file ./caption.txt) [media-path-or-url]');
}

function isUrl(value) {
  return /^https?:\/\//i.test(value);
}

function guessMimeType(path) {
  switch (extname(path).toLowerCase()) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.png':
      return 'image/png';
    case '.gif':
      return 'image/gif';
    case '.webp':
      return 'image/webp';
    case '.mp4':
      return 'video/mp4';
    case '.mov':
      return 'video/quicktime';
    default:
      return 'application/octet-stream';
  }
}

function parseArgs(argv) {
  let message = '';
  let messageFile = '';
  let media = '';

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--message') {
      message = argv[index + 1] || '';
      index += 1;
    } else if (arg === '--message-file') {
      messageFile = argv[index + 1] || '';
      index += 1;
    } else if (!media) {
      media = arg;
    }
  }

  return { message, messageFile, media };
}

async function resolveMessage(parsed) {
  if (parsed.message) {
    return parsed.message.trim();
  }
  if (parsed.messageFile) {
    return (await readFile(parsed.messageFile, 'utf8')).trim();
  }
  return '';
}

async function buildForm(parsed, message) {
  const payload = {
    content: message,
    username: DEFAULT_USERNAME,
  };

  if (!parsed.media) {
    return {
      url: withWaitParam(WEBHOOK_URL),
      init: {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      },
    };
  }

  const form = new FormData();
  form.append('payload_json', JSON.stringify(payload));

  if (isUrl(parsed.media)) {
    const response = await fetch(parsed.media);
    if (!response.ok) {
      throw new Error(`Could not fetch remote media: ${response.status}`);
    }
    const bytes = await response.arrayBuffer();
    const name = basename(new URL(parsed.media).pathname || 'attachment');
    form.append('files[0]', new Blob([bytes], { type: response.headers.get('content-type') || 'application/octet-stream' }), name);
  } else {
    const bytes = await readFile(parsed.media);
    form.append('files[0]', new Blob([bytes], { type: guessMimeType(parsed.media) }), basename(parsed.media));
  }

  return {
    url: withWaitParam(WEBHOOK_URL),
    init: {
      method: 'POST',
      body: form,
    },
  };
}

function withWaitParam(url) {
  const next = new URL(url);
  next.searchParams.set('wait', 'true');
  return next;
}

async function main() {
  if (!WEBHOOK_URL) {
    throw new Error('DISCORD_WEBHOOK_URL is required.');
  }

  const parsed = parseArgs(process.argv.slice(2));
  const message = await resolveMessage(parsed);
  if (!message && !parsed.media) {
    usage();
    process.exit(1);
  }

  const request = await buildForm(parsed, message);
  const response = await fetch(request.url, request.init);
  const raw = await response.text();
  let body = raw;

  try {
    body = raw ? JSON.parse(raw) : null;
  } catch {}

  if (!response.ok) {
    const errorMessage =
      body && typeof body === 'object' && 'message' in body
        ? String(body.message)
        : `Discord webhook failed with status ${response.status}`;
    throw new Error(errorMessage);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        id: body?.id ?? null,
        channelId: body?.channel_id ?? null,
        attachmentUrls: Array.isArray(body?.attachments)
          ? body.attachments.map((attachment) => attachment?.url).filter(Boolean)
          : [],
      },
      null,
      2
    )
  );
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
  process.exit(1);
});
