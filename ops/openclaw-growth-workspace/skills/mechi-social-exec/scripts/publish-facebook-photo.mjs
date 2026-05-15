#!/usr/bin/env node
import { basename, extname } from 'node:path';
import { readFile } from 'node:fs/promises';
import { getBrandConfig } from './social-brand-config.mjs';

function usage() {
  console.error(
    'Usage: node scripts/publish-facebook-photo.mjs [--brand chezahub|playmechi] (--caption "text" | --caption-file ./caption.txt) <image-path-or-url>'
  );
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
    default:
      return 'application/octet-stream';
  }
}

function parseArgs(argv) {
  let brand = '';
  let caption = '';
  let captionFile = '';
  let media = '';

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--brand') {
      brand = argv[index + 1] || '';
      index += 1;
    } else if (arg === '--caption') {
      caption = argv[index + 1] || '';
      index += 1;
    } else if (arg === '--caption-file') {
      captionFile = argv[index + 1] || '';
      if (!captionFile) {
        usage();
        process.exit(1);
      }
      index += 1;
    } else if (!media) {
      media = arg;
    }
  }

  return { brand, caption, captionFile, media };
}

async function resolveCaption(parsed) {
  if (parsed.caption) {
    return parsed.caption.trim();
  }

  if (parsed.captionFile) {
    const text = await readFile(parsed.captionFile, 'utf8');
    return text.trim();
  }

  return '';
}

async function graphRequest(url, init) {
  const response = await fetch(url, init);
  const raw = await response.text();
  let body = raw;

  try {
    body = raw ? JSON.parse(raw) : null;
  } catch {}

  if (!response.ok) {
    const message =
      body && typeof body === 'object' && body.error && typeof body.error === 'object'
        ? body.error.message || `Facebook Graph API request failed with ${response.status}`
        : `Facebook Graph API request failed with ${response.status}`;
    throw new Error(message);
  }

  return body;
}

async function getPermalink(postId, accessToken, apiVersion) {
  if (!postId) {
    return null;
  }

  const url = new URL(`https://graph.facebook.com/${apiVersion}/${postId}`);
  url.searchParams.set('fields', 'permalink_url');
  url.searchParams.set('access_token', accessToken);
  const body = await graphRequest(url, { method: 'GET' });
  return typeof body?.permalink_url === 'string' ? body.permalink_url : null;
}

async function buildForm(media, caption, accessToken) {
  if (isUrl(media)) {
    const params = new URLSearchParams();
    params.set('url', media);
    params.set('caption', caption);
    params.set('published', 'true');
    params.set('access_token', accessToken);
    return params;
  }

  const bytes = await readFile(media);
  const form = new FormData();
  form.append('caption', caption);
  form.append('published', 'true');
  form.append('access_token', accessToken);
  form.append('source', new Blob([bytes], { type: guessMimeType(media) }), basename(media));
  return form;
}

async function main() {
  const parsed = parseArgs(process.argv.slice(2));
  if (!parsed.media) {
    usage();
    process.exit(1);
  }

  const scopedConfig = parsed.brand ? getBrandConfig(parsed.brand) : null;
  const apiVersion =
    scopedConfig?.facebook.graphApiVersion || process.env.FACEBOOK_GRAPH_API_VERSION?.trim() || 'v25.0';
  const pageId = scopedConfig?.facebook.pageId || process.env.FACEBOOK_PAGE_ID?.trim() || '';
  const accessToken =
    scopedConfig?.facebook.pageAccessToken || process.env.FACEBOOK_PAGE_ACCESS_TOKEN?.trim() || '';
  if (!pageId || !accessToken) {
    throw new Error(
      parsed.brand
        ? `Facebook is not ready for ${scopedConfig?.label || parsed.brand}. Missing page id or page access token.`
        : 'FACEBOOK_PAGE_ID and FACEBOOK_PAGE_ACCESS_TOKEN are required.'
    );
  }

  const caption = await resolveCaption(parsed);
  const body = await buildForm(parsed.media, caption, accessToken);
  const endpoint = `https://graph.facebook.com/${apiVersion}/${pageId}/photos`;
  const result = await graphRequest(endpoint, {
    method: 'POST',
    body,
  });

  const permalink = await getPermalink(result.post_id ?? null, accessToken, apiVersion);

  console.log(
    JSON.stringify(
      {
        ok: true,
        brand: scopedConfig?.brand ?? null,
        pageName: scopedConfig?.facebook.pageName ?? null,
        id: result.id ?? null,
        postId: result.post_id ?? null,
        permalink,
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
  process.exitCode = 1;
});
