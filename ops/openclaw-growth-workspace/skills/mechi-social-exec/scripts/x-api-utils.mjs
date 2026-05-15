#!/usr/bin/env node
import { createHmac, randomBytes } from 'node:crypto';
import { extname } from 'node:path';
import { readFile } from 'node:fs/promises';
import { envFirst } from './social-brand-config.mjs';
import { resolveMediaToLocalPath } from './social-media-utils.mjs';

const DEFAULT_API_BASE = 'https://api.x.com';
const DEFAULT_UPLOAD_BASE = 'https://upload.twitter.com';

function percentEncode(value) {
  return encodeURIComponent(String(value))
    .replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}

function nonce() {
  return randomBytes(16).toString('hex');
}

function timestamp() {
  return String(Math.floor(Date.now() / 1000));
}

function normalizeQueryEntries(entries) {
  return Object.fromEntries(
    Object.entries(entries || {}).filter(([, value]) => value !== undefined && value !== null && value !== '')
  );
}

function buildSignatureBase(method, url, params) {
  const pairs = [];
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        pairs.push([percentEncode(key), percentEncode(item)]);
      }
      continue;
    }
    pairs.push([percentEncode(key), percentEncode(value)]);
  }

  pairs.sort(([leftKey, leftValue], [rightKey, rightValue]) => {
    if (leftKey === rightKey) {
      return leftValue.localeCompare(rightValue);
    }
    return leftKey.localeCompare(rightKey);
  });

  const paramString = pairs.map(([key, value]) => `${key}=${value}`).join('&');
  return [
    method.toUpperCase(),
    percentEncode(url),
    percentEncode(paramString),
  ].join('&');
}

function signRequest(baseString, consumerSecret, tokenSecret = '') {
  const signingKey = `${percentEncode(consumerSecret)}&${percentEncode(tokenSecret)}`;
  return createHmac('sha1', signingKey).update(baseString).digest('base64');
}

function buildAuthorizationHeader(oauthParams) {
  const entries = Object.entries(oauthParams)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${percentEncode(key)}="${percentEncode(value)}"`);

  return `OAuth ${entries.join(', ')}`;
}

function guessVideoMimeType(pathLike) {
  switch (extname(pathLike).toLowerCase()) {
    case '.mp4':
      return 'video/mp4';
    case '.mov':
      return 'video/quicktime';
    case '.m4v':
      return 'video/x-m4v';
    case '.webm':
      return 'video/webm';
    default:
      return 'application/octet-stream';
  }
}

function resolveXCredentials() {
  return {
    consumerKey: envFirst(['X_API_KEY']),
    consumerSecret: envFirst(['X_API_SECRET']),
    accessToken: envFirst(['X_ACCESS_TOKEN']),
    accessTokenSecret: envFirst(['X_ACCESS_TOKEN_SECRET']),
  };
}

function assertXCredentials() {
  const credentials = resolveXCredentials();
  if (
    !credentials.consumerKey ||
    !credentials.consumerSecret ||
    !credentials.accessToken ||
    !credentials.accessTokenSecret
  ) {
    throw new Error(
      'X API credentials are incomplete. X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, and X_ACCESS_TOKEN_SECRET are required.'
    );
  }
  return credentials;
}

async function xRequest({
  method = 'GET',
  url,
  query = {},
  signedParams = {},
  headers = {},
  body = undefined,
}) {
  const credentials = assertXCredentials();
  const finalUrl = new URL(url);
  const queryEntries = normalizeQueryEntries(query);
  for (const [key, value] of Object.entries(queryEntries)) {
    finalUrl.searchParams.set(key, String(value));
  }

  const oauthParams = {
    oauth_consumer_key: credentials.consumerKey,
    oauth_nonce: nonce(),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: timestamp(),
    oauth_token: credentials.accessToken,
    oauth_version: '1.0',
  };
  const signatureBase = buildSignatureBase(method, `${finalUrl.origin}${finalUrl.pathname}`, {
    ...queryEntries,
    ...signedParams,
    ...oauthParams,
  });
  const authorization = buildAuthorizationHeader({
    ...oauthParams,
    oauth_signature: signRequest(signatureBase, credentials.consumerSecret, credentials.accessTokenSecret),
  });

  const response = await fetch(finalUrl, {
    method,
    headers: {
      Authorization: authorization,
      ...headers,
    },
    body,
  });

  const raw = await response.text();
  let payload = raw;
  try {
    payload = raw ? JSON.parse(raw) : null;
  } catch {}

  if (!response.ok) {
    const detail =
      payload && typeof payload === 'object'
        ? payload.detail || payload.error || payload.title || JSON.stringify(payload)
        : raw;
    throw new Error(detail || `X API request failed with ${response.status}`);
  }

  return payload;
}

async function verifyXCredentials() {
  return xRequest({
    method: 'GET',
    url: `${DEFAULT_API_BASE}/2/users/me`,
    query: {
      'user.fields': 'id,name,username,verified,public_metrics',
    },
  });
}

async function uploadXPhoto(media) {
  const localPath = await resolveMediaToLocalPath(media, 'image');
  const bytes = await readFile(localPath);
  const body = new URLSearchParams();
  body.set('media_data', bytes.toString('base64'));
  body.set('media_category', 'tweet_image');

  const payload = await xRequest({
    method: 'POST',
    url: `${DEFAULT_UPLOAD_BASE}/1.1/media/upload.json`,
    signedParams: {
      media_data: body.get('media_data'),
      media_category: 'tweet_image',
    },
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  const mediaId = payload?.media_id_string || String(payload?.media_id || '');
  if (!mediaId) {
    throw new Error('X image upload succeeded but no media id was returned.');
  }

  return {
    mediaId,
    payload,
  };
}

async function uploadXVideo(media) {
  const localPath = await resolveMediaToLocalPath(media, 'video');
  const bytes = await readFile(localPath);
  const mediaType = guessVideoMimeType(localPath);

  const initBody = new URLSearchParams();
  initBody.set('command', 'INIT');
  initBody.set('media_type', mediaType);
  initBody.set('total_bytes', String(bytes.byteLength));
  initBody.set('media_category', 'tweet_video');

  const init = await xRequest({
    method: 'POST',
    url: `${DEFAULT_UPLOAD_BASE}/1.1/media/upload.json`,
    signedParams: {
      command: 'INIT',
      media_type: mediaType,
      total_bytes: String(bytes.byteLength),
      media_category: 'tweet_video',
    },
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: initBody.toString(),
  });

  const mediaId = init?.media_id_string || String(init?.media_id || '');
  if (!mediaId) {
    throw new Error('X video init succeeded but no media id was returned.');
  }

  const chunkSize = 5 * 1024 * 1024;
  let segmentIndex = 0;
  for (let offset = 0; offset < bytes.byteLength; offset += chunkSize) {
    const chunk = bytes.subarray(offset, Math.min(offset + chunkSize, bytes.byteLength));
    const form = new FormData();
    form.append('command', 'APPEND');
    form.append('media_id', mediaId);
    form.append('segment_index', String(segmentIndex));
    form.append('media', new Blob([chunk], { type: mediaType }), `segment-${segmentIndex}`);

    await xRequest({
      method: 'POST',
      url: `${DEFAULT_UPLOAD_BASE}/1.1/media/upload.json`,
      headers: {},
      body: form,
    });

    segmentIndex += 1;
  }

  const finalizeBody = new URLSearchParams();
  finalizeBody.set('command', 'FINALIZE');
  finalizeBody.set('media_id', mediaId);
  let finalize = await xRequest({
    method: 'POST',
    url: `${DEFAULT_UPLOAD_BASE}/1.1/media/upload.json`,
    signedParams: {
      command: 'FINALIZE',
      media_id: mediaId,
    },
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: finalizeBody.toString(),
  });

  let processing = finalize?.processing_info;
  while (processing && ['pending', 'in_progress'].includes(processing.state)) {
    const waitSeconds = Math.max(1, Number(processing.check_after_secs || 2));
    await new Promise((resolve) => setTimeout(resolve, waitSeconds * 1000));
    finalize = await xRequest({
      method: 'GET',
      url: `${DEFAULT_UPLOAD_BASE}/1.1/media/upload.json`,
      query: {
        command: 'STATUS',
        media_id: mediaId,
      },
    });
    processing = finalize?.processing_info;
  }

  if (processing && processing.state === 'failed') {
    throw new Error(processing.error?.message || 'X video processing failed.');
  }

  return {
    mediaId,
    payload: finalize,
  };
}

async function createXTweet({ text, mediaIds = [] }) {
  const body = {
    text,
    ...(mediaIds.length ? { media: { media_ids: mediaIds.map(String) } } : {}),
  };

  return xRequest({
    method: 'POST',
    url: `${DEFAULT_API_BASE}/2/tweets`,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

export {
  assertXCredentials,
  createXTweet,
  resolveXCredentials,
  uploadXPhoto,
  uploadXVideo,
  verifyXCredentials,
  xRequest,
};
