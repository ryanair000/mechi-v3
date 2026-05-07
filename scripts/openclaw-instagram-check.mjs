#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const DEFAULT_ENV_FILE = '.env.instagram.local';

function parseArgs(argv) {
  const args = {
    envFile: DEFAULT_ENV_FILE,
    json: false,
    messages: false,
    conversationLimit: 5,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--json') {
      args.json = true;
    } else if (arg === '--messages') {
      args.messages = true;
    } else if (arg === '--env-file') {
      args.envFile = argv[index + 1] || DEFAULT_ENV_FILE;
      index += 1;
    } else if (arg === '--conversation-limit') {
      const next = Number.parseInt(argv[index + 1] || '', 10);
      args.conversationLimit = Number.isFinite(next) && next > 0 ? next : args.conversationLimit;
      index += 1;
    } else if (arg === '--help' || arg === '-h') {
      args.help = true;
    }
  }

  return args;
}

function loadEnvFile(path) {
  const resolved = resolve(process.cwd(), path);
  if (!existsSync(resolved)) {
    return { loaded: false, path: resolved };
  }

  const content = readFileSync(resolved, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const separator = line.indexOf('=');
    if (separator <= 0) {
      continue;
    }

    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim().replace(/^['"]|['"]$/g, '');
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }

  return { loaded: true, path: resolved };
}

function envFirst(names) {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) {
      return value;
    }
  }
  return '';
}

function getConfig() {
  return {
    apiVersion: envFirst([
      'MECHI_INSTAGRAM_API_VERSION',
      'INSTAGRAM_GRAPH_API_VERSION',
      'INSTAGRAM_API_VERSION',
    ]) || 'v25.0',
    accessToken: envFirst([
      'MECHI_INSTAGRAM_ACCESS_TOKEN',
      'INSTAGRAM_ACCESS_TOKEN',
      'INSTAGRAM_TOKEN',
    ]),
    igUserId: envFirst([
      'MECHI_INSTAGRAM_USER_ID',
      'INSTAGRAM_BUSINESS_ACCOUNT_ID',
      'INSTAGRAM_ACCOUNT_ID',
      'INSTAGRAM_IG_ID',
    ]),
    appId: envFirst(['MECHI_INSTAGRAM_APP_ID', 'INSTAGRAM_APP_ID', 'META_APP_ID']),
    appSecret: envFirst([
      'MECHI_INSTAGRAM_APP_SECRET',
      'INSTAGRAM_APP_SECRET',
      'META_APP_SECRET',
    ]),
  };
}

function graphUrl(host, apiVersion, path, params) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = new URL(`https://${host}/${apiVersion}${normalizedPath}`);
  for (const [key, value] of Object.entries(params || {})) {
    if (value !== undefined && value !== null && String(value).length > 0) {
      url.searchParams.set(key, String(value));
    }
  }
  return url;
}

async function graphRequest({ host, apiVersion, path, accessToken, params = {} }) {
  const url = graphUrl(host, apiVersion, path, {
    ...params,
    access_token: accessToken,
  });
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
    },
  });
  const text = await response.text();
  let body = text;

  try {
    body = text ? JSON.parse(text) : null;
  } catch {}

  return {
    ok: response.ok,
    status: response.status,
    body,
  };
}

function simplifyError(result) {
  const body = result?.body;
  if (body && typeof body === 'object' && body.error && typeof body.error === 'object') {
    return {
      status: result.status,
      message: body.error.message ?? 'Meta API error',
      type: body.error.type ?? null,
      code: body.error.code ?? null,
      subcode: body.error.error_subcode ?? null,
    };
  }

  return {
    status: result?.status ?? 0,
    message: typeof body === 'string' && body ? body : 'Meta API error',
  };
}

async function debugToken(config) {
  if (!config.appId || !config.appSecret) {
    return {
      skipped: true,
      reason: 'MECHI_INSTAGRAM_APP_ID and MECHI_INSTAGRAM_APP_SECRET were not provided',
    };
  }

  const result = await graphRequest({
    host: 'graph.facebook.com',
    apiVersion: config.apiVersion,
    path: '/debug_token',
    accessToken: `${config.appId}|${config.appSecret}`,
    params: {
      input_token: config.accessToken,
    },
  });

  if (!result.ok) {
    return { ok: false, error: simplifyError(result) };
  }

  const data = result.body?.data ?? {};
  return {
    ok: true,
    app_id: data.app_id ?? null,
    type: data.type ?? null,
    application: data.application ?? null,
    expires_at: data.expires_at ?? null,
    data_access_expires_at: data.data_access_expires_at ?? null,
    is_valid: data.is_valid ?? null,
    scopes: data.scopes ?? [],
    granular_scopes: data.granular_scopes ?? [],
    user_id: data.user_id ?? null,
  };
}

async function getAccount(config) {
  const result = await graphRequest({
    host: 'graph.instagram.com',
    apiVersion: config.apiVersion,
    path: `/${config.igUserId || 'me'}`,
    accessToken: config.accessToken,
    params: {
      fields: 'id,username,account_type,media_count',
    },
  });

  if (!result.ok) {
    return { ok: false, error: simplifyError(result) };
  }

  return { ok: true, account: result.body };
}

async function getConversations(config, limit) {
  const result = await graphRequest({
    host: 'graph.instagram.com',
    apiVersion: config.apiVersion,
    path: `/${config.igUserId || 'me'}/conversations`,
    accessToken: config.accessToken,
    params: {
      platform: 'instagram',
      limit,
    },
  });

  if (!result.ok) {
    return { ok: false, error: simplifyError(result) };
  }

  return {
    ok: true,
    conversations: Array.isArray(result.body?.data) ? result.body.data : [],
    paging: result.body?.paging ?? null,
  };
}

async function getRecentMessages(config, conversations) {
  const firstConversation = conversations[0];
  if (!firstConversation?.id) {
    return { skipped: true, reason: 'No conversations returned' };
  }

  const listResult = await graphRequest({
    host: 'graph.instagram.com',
    apiVersion: config.apiVersion,
    path: `/${firstConversation.id}`,
    accessToken: config.accessToken,
    params: {
      fields: 'messages.limit(5)',
    },
  });

  if (!listResult.ok) {
    return { ok: false, error: simplifyError(listResult) };
  }

  const messageIds = Array.isArray(listResult.body?.messages?.data)
    ? listResult.body.messages.data.map((message) => message.id).filter(Boolean)
    : [];
  const details = [];

  for (const messageId of messageIds.slice(0, 5)) {
    const detailResult = await graphRequest({
      host: 'graph.instagram.com',
      apiVersion: config.apiVersion,
      path: `/${messageId}`,
      accessToken: config.accessToken,
      params: {
        fields: 'id,created_time,from,to,message',
      },
    });
    details.push(detailResult.ok ? detailResult.body : { id: messageId, error: simplifyError(detailResult) });
  }

  return {
    ok: true,
    conversation_id: firstConversation.id,
    messages: details,
  };
}

function printHuman(report) {
  console.log('Instagram/OpenClaw read-only check');
  console.log(`Env file: ${report.env.loaded ? 'loaded' : 'not found'} (${report.env.path})`);
  console.log(`API version: ${report.config.apiVersion}`);
  console.log(`Token present: ${report.config.accessTokenPresent ? 'yes' : 'no'}`);
  console.log(`IG user ID configured: ${report.config.igUserId || 'using /me'}`);
  console.log('');

  console.log('Token debug:');
  console.log(JSON.stringify(report.debug_token, null, 2));
  console.log('');

  console.log('Account:');
  console.log(JSON.stringify(report.account, null, 2));
  console.log('');

  console.log('Conversations:');
  console.log(JSON.stringify(report.conversations, null, 2));

  if (report.messages) {
    console.log('');
    console.log('Recent messages from first conversation:');
    console.log(JSON.stringify(report.messages, null, 2));
  }
}

function usage() {
  console.log(`Usage: npm run ops:instagram:check -- [options]

Read-only by default. Loads .env.instagram.local unless --env-file is provided.

Required:
  MECHI_INSTAGRAM_ACCESS_TOKEN or INSTAGRAM_ACCESS_TOKEN

Recommended:
  MECHI_INSTAGRAM_USER_ID or INSTAGRAM_BUSINESS_ACCOUNT_ID
  MECHI_INSTAGRAM_APP_ID and MECHI_INSTAGRAM_APP_SECRET for debug_token

Options:
  --json                         Print machine-readable JSON
  --messages                     Fetch recent messages from the first conversation
  --conversation-limit <number>   Number of conversations to list (default 5)
  --env-file <path>              Load a specific local env file
`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    usage();
    return;
  }

  const env = loadEnvFile(args.envFile);
  const config = getConfig();

  if (!config.accessToken) {
    console.error(
      'Missing Instagram access token. Add MECHI_INSTAGRAM_ACCESS_TOKEN to .env.instagram.local.'
    );
    process.exitCode = 1;
    return;
  }

  const report = {
    env,
    config: {
      apiVersion: config.apiVersion,
      accessTokenPresent: Boolean(config.accessToken),
      igUserId: config.igUserId || null,
      appIdPresent: Boolean(config.appId),
      appSecretPresent: Boolean(config.appSecret),
    },
    debug_token: await debugToken(config),
    account: await getAccount(config),
    conversations: null,
    messages: null,
  };

  report.conversations = await getConversations(config, args.conversationLimit);

  if (args.messages) {
    report.messages = report.conversations.ok
      ? await getRecentMessages(config, report.conversations.conversations)
      : { skipped: true, reason: 'Conversations request failed' };
  }

  if (args.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    printHuman(report);
  }

  const failed = [report.debug_token, report.account, report.conversations, report.messages]
    .filter(Boolean)
    .some((section) => section.ok === false);
  if (failed) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
