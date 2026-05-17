#!/usr/bin/env node
import { createHash, randomBytes } from 'node:crypto';
import { envFirst } from './social-brand-config.mjs';

const AUTH_URL = 'https://www.tiktok.com/v2/auth/authorize/';
const TOKEN_URL = 'https://open.tiktokapis.com/v2/oauth/token/';
const DEFAULT_REDIRECT_URI = 'https://mechi.club/api/auth/tiktok/callback';
const DEFAULT_SCOPES = ['video.upload', 'video.publish'];

function usage() {
  console.error(`Usage:
  node scripts/tiktok-oauth-flow.mjs authorize [--client-key KEY] [--redirect-uri URL] [--scope "video.upload,video.publish"]
  node scripts/tiktok-oauth-flow.mjs exchange --code CODE [--client-key KEY] [--client-secret SECRET] [--redirect-uri URL] [--code-verifier VERIFIER]
  node scripts/tiktok-oauth-flow.mjs refresh --refresh-token TOKEN [--client-key KEY] [--client-secret SECRET]`);
}

function parseArgs(argv) {
  const [command = '', ...rest] = argv;
  const options = {
    command,
    redirectUri: DEFAULT_REDIRECT_URI,
    scope: DEFAULT_SCOPES.join(','),
  };

  for (let index = 0; index < rest.length; index += 1) {
    const arg = rest[index];
    if (!arg.startsWith('--')) continue;
    const key = arg.slice(2).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    options[key] = rest[index + 1] || '';
    index += 1;
  }

  return options;
}

function base64Url(buffer) {
  return Buffer.from(buffer)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function resolveClientKey(raw) {
  return raw || envFirst(['PLAYMECHI_TIKTOK_CLIENT_KEY', 'TIKTOK_CLIENT_KEY']);
}

function resolveClientSecret(raw) {
  return raw || envFirst(['PLAYMECHI_TIKTOK_CLIENT_SECRET', 'TIKTOK_CLIENT_SECRET']);
}

function normalizeScopes(raw) {
  return String(raw || '')
    .split(/[,\s]+/)
    .map((scope) => scope.trim())
    .filter(Boolean)
    .join(',');
}

async function tokenRequest(params) {
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(params),
  });
  const body = await response.json().catch(async () => ({ raw: await response.text() }));
  if (!response.ok) {
    throw new Error(body?.error_description || body?.message || body?.error || `TikTok token request failed with ${response.status}`);
  }
  return body;
}

async function runAuthorize(options) {
  const clientKey = resolveClientKey(options.clientKey);
  if (!clientKey) {
    throw new Error('TikTok client key is required.');
  }

  const state = options.state || randomBytes(12).toString('hex');
  const codeVerifier = options.codeVerifier || base64Url(randomBytes(48));
  const codeChallenge = base64Url(createHash('sha256').update(codeVerifier).digest());
  const url = new URL(AUTH_URL);
  url.searchParams.set('client_key', clientKey);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', normalizeScopes(options.scope));
  url.searchParams.set('redirect_uri', options.redirectUri || DEFAULT_REDIRECT_URI);
  url.searchParams.set('state', state);
  url.searchParams.set('code_challenge', codeChallenge);
  url.searchParams.set('code_challenge_method', 'S256');

  console.log(
    JSON.stringify(
      {
        ok: true,
        authorizeUrl: url.toString(),
        state,
        codeVerifier,
        redirectUri: options.redirectUri || DEFAULT_REDIRECT_URI,
        scopes: normalizeScopes(options.scope),
        next: 'Open authorizeUrl, approve with the PlayMechi TikTok account, then run exchange with the returned code and this codeVerifier.',
      },
      null,
      2
    )
  );
}

async function runExchange(options) {
  const clientKey = resolveClientKey(options.clientKey);
  const clientSecret = resolveClientSecret(options.clientSecret);
  if (!clientKey || !clientSecret || !options.code) {
    throw new Error('TikTok client key, client secret, and code are required.');
  }

  const params = {
    client_key: clientKey,
    client_secret: clientSecret,
    code: options.code,
    grant_type: 'authorization_code',
    redirect_uri: options.redirectUri || DEFAULT_REDIRECT_URI,
  };
  if (options.codeVerifier) {
    params.code_verifier = options.codeVerifier;
  }

  const body = await tokenRequest(params);
  console.log(JSON.stringify({ ok: true, ...body }, null, 2));
}

async function runRefresh(options) {
  const clientKey = resolveClientKey(options.clientKey);
  const clientSecret = resolveClientSecret(options.clientSecret);
  if (!clientKey || !clientSecret || !options.refreshToken) {
    throw new Error('TikTok client key, client secret, and refresh token are required.');
  }

  const body = await tokenRequest({
    client_key: clientKey,
    client_secret: clientSecret,
    grant_type: 'refresh_token',
    refresh_token: options.refreshToken,
  });
  console.log(JSON.stringify({ ok: true, ...body }, null, 2));
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (!['authorize', 'exchange', 'refresh'].includes(options.command)) {
    usage();
    process.exit(1);
  }

  if (options.command === 'authorize') {
    await runAuthorize(options);
  } else if (options.command === 'exchange') {
    await runExchange(options);
  } else {
    await runRefresh(options);
  }
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }, null, 2));
  process.exitCode = 1;
});
