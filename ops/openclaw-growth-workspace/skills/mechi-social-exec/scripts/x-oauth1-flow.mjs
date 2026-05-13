#!/usr/bin/env node
import { createHmac, randomBytes } from 'node:crypto';
import { envFirst } from './social-brand-config.mjs';

const DEFAULT_BASE_URL = 'https://api.twitter.com';

function usage() {
  console.error(`Usage:
  node scripts/x-oauth1-flow.mjs request [--consumer-key KEY] [--consumer-secret SECRET] [--callback oob] [--base-url https://api.twitter.com]
  node scripts/x-oauth1-flow.mjs exchange [--consumer-key KEY] [--consumer-secret SECRET] --oauth-token TOKEN --token-secret SECRET --verifier CODE [--base-url https://api.twitter.com]`);
}

function parseArgs(argv) {
  const [command = '', ...rest] = argv;
  const options = {
    command,
    callback: 'oob',
    baseUrl: DEFAULT_BASE_URL,
  };

  for (let index = 0; index < rest.length; index += 1) {
    const arg = rest[index];
    if (!arg.startsWith('--')) {
      continue;
    }

    const key = arg.slice(2);
    const value = rest[index + 1] || '';
    options[key.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] = value;
    index += 1;
  }

  return options;
}

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

function buildSignatureBase(method, url, params) {
  const pairs = [];
  for (const [key, value] of Object.entries(params)) {
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

async function oauthFormPost(url, oauthParams, consumerSecret, tokenSecret = '') {
  const signatureBase = buildSignatureBase('POST', url, oauthParams);
  const oauthSignature = signRequest(signatureBase, consumerSecret, tokenSecret);
  const authorization = buildAuthorizationHeader({
    ...oauthParams,
    oauth_signature: oauthSignature,
  });

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: authorization,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: '',
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(text || `X OAuth request failed with ${response.status}`);
  }

  return Object.fromEntries(new URLSearchParams(text).entries());
}

function resolveConsumerKey(raw) {
  return raw || envFirst(['X_API_KEY']);
}

function resolveConsumerSecret(raw) {
  return raw || envFirst(['X_API_SECRET']);
}

async function runRequest(options) {
  const consumerKey = resolveConsumerKey(options.consumerKey);
  const consumerSecret = resolveConsumerSecret(options.consumerSecret);
  if (!consumerKey || !consumerSecret) {
    throw new Error('Consumer key and consumer secret are required.');
  }

  const requestUrl = `${options.baseUrl || DEFAULT_BASE_URL}/oauth/request_token`;
  const oauthParams = {
    oauth_callback: options.callback || 'oob',
    oauth_consumer_key: consumerKey,
    oauth_nonce: nonce(),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: timestamp(),
    oauth_version: '1.0',
  };

  const result = await oauthFormPost(requestUrl, oauthParams, consumerSecret);
  const oauthToken = result.oauth_token || '';
  if (!oauthToken) {
    throw new Error('X request token response did not include oauth_token.');
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        oauthToken,
        tokenSecret: result.oauth_token_secret || null,
        callbackConfirmed: result.oauth_callback_confirmed || null,
        authorizeUrl: `https://api.twitter.com/oauth/authorize?oauth_token=${encodeURIComponent(oauthToken)}`,
      },
      null,
      2
    )
  );
}

async function runExchange(options) {
  const consumerKey = resolveConsumerKey(options.consumerKey);
  const consumerSecret = resolveConsumerSecret(options.consumerSecret);
  const oauthToken = options.oauthToken || '';
  const tokenSecret = options.tokenSecret || '';
  const verifier = options.verifier || '';

  if (!consumerKey || !consumerSecret || !oauthToken || !tokenSecret || !verifier) {
    throw new Error('Consumer key, consumer secret, oauth token, token secret, and verifier are required.');
  }

  const accessUrl = `${options.baseUrl || DEFAULT_BASE_URL}/oauth/access_token`;
  const oauthParams = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: nonce(),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: timestamp(),
    oauth_token: oauthToken,
    oauth_verifier: verifier,
    oauth_version: '1.0',
  };

  const result = await oauthFormPost(accessUrl, oauthParams, consumerSecret, tokenSecret);
  if (!result.oauth_token || !result.oauth_token_secret) {
    throw new Error('X access token response did not include oauth_token and oauth_token_secret.');
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        accessToken: result.oauth_token,
        tokenSecret: result.oauth_token_secret,
        userId: result.user_id || null,
        screenName: result.screen_name || null,
      },
      null,
      2
    )
  );
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (!options.command || !['request', 'exchange'].includes(options.command)) {
    usage();
    process.exit(1);
  }

  if (options.command === 'request') {
    await runRequest(options);
    return;
  }

  await runExchange(options);
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
