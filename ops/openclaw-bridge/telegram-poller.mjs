import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  MECHI_ALLOWED_TOPICS,
  MECHI_BLOCKED_TOPICS,
  buildMechiBridgeContext,
  buildMechiBridgeSystemPrompt,
} from './mechi-knowledge.mjs';

const TELEGRAM_BOT_TOKEN =
  process.env.MECHI_OPENCLAW_TELEGRAM_BOT_TOKEN?.trim() ||
  process.env.TELEGRAM_BOT_TOKEN?.trim() ||
  '';
const OPENCLAW_BIN = process.env.OPENCLAW_BIN?.trim() || 'openclaw';
const TELEGRAM_MODE = normalizeTelegramMode(process.env.MECHI_OPENCLAW_TELEGRAM_MODE);
const RAW_TELEGRAM_AGENT =
  process.env.MECHI_OPENCLAW_TELEGRAM_AGENT?.trim() ||
  process.env.MECHI_OPENCLAW_SUPPORT_AGENT?.trim() ||
  'support';
const TELEGRAM_AGENT = normalizeTelegramAgent(RAW_TELEGRAM_AGENT);
const TELEGRAM_MODEL =
  process.env.MECHI_OPENCLAW_TELEGRAM_MODEL?.trim() ||
  process.env.MECHI_OPENCLAW_SUPPORT_MODEL?.trim() ||
  'openai-codex/gpt-5.5';
const OPENCLAW_THINKING =
  process.env.MECHI_OPENCLAW_TELEGRAM_THINKING?.trim() ||
  process.env.MECHI_OPENCLAW_THINKING?.trim() ||
  'fast';
const OPENCLAW_TIMEOUT_SECONDS = toPositiveInt(
  process.env.MECHI_OPENCLAW_TELEGRAM_TIMEOUT_SECONDS ??
    process.env.MECHI_OPENCLAW_TIMEOUT_SECONDS,
  120
);
const POLL_TIMEOUT_SECONDS = Math.min(
  50,
  toPositiveInt(process.env.MECHI_OPENCLAW_TELEGRAM_POLL_TIMEOUT_SECONDS, 25)
);
const RETRY_DELAY_MS = toPositiveInt(process.env.MECHI_OPENCLAW_TELEGRAM_RETRY_DELAY_MS, 3000);
const OFFSET_FILE =
  process.env.MECHI_OPENCLAW_TELEGRAM_OFFSET_FILE?.trim() ||
  path.join(os.homedir(), '.openclaw', 'telegram-poller-offset.json');
const DELETE_WEBHOOK_ON_START = toBoolean(
  process.env.MECHI_OPENCLAW_TELEGRAM_DELETE_WEBHOOK,
  true
);
const ALLOWED_CHAT_TYPES = parseCsvSet(
  process.env.MECHI_OPENCLAW_TELEGRAM_ALLOWED_CHAT_TYPES || 'private,group,supergroup'
);
const ALLOWED_CHAT_IDS = parseCsvSet(
  process.env.MECHI_OPENCLAW_TELEGRAM_ALLOWED_CHAT_IDS || ''
);
const ALLOWED_UPDATES = [...parseCsvSet(process.env.MECHI_OPENCLAW_TELEGRAM_ALLOWED_UPDATES || 'message')];
const GROUP_REQUIRE_MENTION = toBoolean(
  process.env.MECHI_OPENCLAW_TELEGRAM_GROUP_REQUIRE_MENTION,
  true
);

let shuttingDown = false;
let botUsername = '';

function toPositiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function toBoolean(value, fallback) {
  if (typeof value !== 'string') {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true;
  }
  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false;
  }
  return fallback;
}

function parseCsvSet(value) {
  return new Set(
    String(value || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  );
}

function normalizeTelegramMode(value) {
  const normalized = String(value || '')
    .trim()
    .toLowerCase();

  if (normalized === 'direct' || normalized === 'control' || normalized === 'operator') {
    return 'direct';
  }

  return 'support';
}

function normalizeTelegramAgent(value) {
  const normalized = String(value || '').trim();
  if (!normalized) {
    return 'support';
  }

  if (['default', 'main'].includes(normalized.toLowerCase())) {
    return null;
  }

  return normalized;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function stringifyJson(value) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function parseJsonCandidate(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) {
    return null;
  }

  try {
    return JSON.parse(trimmed);
  } catch {}

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]+?)\s*```/i);
  if (fenced?.[1]) {
    try {
      return JSON.parse(fenced[1]);
    } catch {}
  }

  const objectMatch = trimmed.match(/\{[\s\S]*\}/);
  if (objectMatch?.[0]) {
    try {
      return JSON.parse(objectMatch[0]);
    } catch {}
  }

  const arrayMatch = trimmed.match(/\[[\s\S]*\]/);
  if (arrayMatch?.[0]) {
    try {
      return JSON.parse(arrayMatch[0]);
    } catch {}
  }

  return null;
}

function flattenTextCandidates(value) {
  if (typeof value === 'string') {
    return [value.trim()].filter(Boolean);
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => flattenTextCandidates(item));
  }

  if (!value || typeof value !== 'object') {
    return [];
  }

  const object = value;
  const priorityKeys = [
    'text',
    'message',
    'reply',
    'response',
    'content',
    'finalText',
    'assistant',
    'output',
  ];

  const collected = [];
  for (const key of priorityKeys) {
    if (key in object) {
      collected.push(...flattenTextCandidates(object[key]));
    }
  }

  for (const child of Object.values(object)) {
    if (typeof child === 'object' && child !== null) {
      collected.push(...flattenTextCandidates(child));
    }
  }

  return collected;
}

function parseCliPayload(stdout) {
  const trimmed = stdout.trim();
  if (!trimmed) {
    return { raw: '', json: null, text: '' };
  }

  const jsonLines = trimmed
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (let index = jsonLines.length - 1; index >= 0; index -= 1) {
    const parsed = parseJsonCandidate(jsonLines[index]);
    if (parsed !== null) {
      const texts = flattenTextCandidates(parsed);
      return {
        raw: trimmed,
        json: parsed,
        text: texts.join('\n').trim(),
      };
    }
  }

  const parsed = parseJsonCandidate(trimmed);
  if (parsed !== null) {
    const texts = flattenTextCandidates(parsed);
    return {
      raw: trimmed,
      json: parsed,
      text: texts.join('\n').trim(),
    };
  }

  return {
    raw: trimmed,
    json: null,
    text: trimmed,
  };
}

function normalizeMultiReplyResponse(cliResult) {
  const collectReplies = (parsed) => {
    if (Array.isArray(parsed)) {
      return parsed.flatMap((item) => flattenTextCandidates(item)).filter(Boolean).slice(0, 4);
    }

    if (parsed && typeof parsed === 'object') {
      const directReplies = Array.isArray(parsed.replies)
        ? parsed.replies.flatMap((item) => flattenTextCandidates(item))
        : [];
      const messageReplies = Array.isArray(parsed.messages)
        ? parsed.messages.flatMap((item) => flattenTextCandidates(item))
        : [];
      const singleReply = flattenTextCandidates(parsed.reply ?? parsed.text ?? parsed.message);
      return [...directReplies, ...messageReplies, ...singleReply].filter(Boolean).slice(0, 4);
    }

    return [];
  };

  const primaryReplies = collectReplies(cliResult.json);
  if (primaryReplies.length > 0) {
    return { replies: primaryReplies };
  }

  const reparsedText = parseJsonCandidate(cliResult.text);
  const textReplies = collectReplies(reparsedText);
  if (textReplies.length > 0) {
    return { replies: textReplies };
  }

  return { replies: cliResult.text ? [cliResult.text] : [] };
}

function toSessionId(prefix, rawValue) {
  const normalized = String(rawValue || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  const suffix = normalized || 'unknown';
  return `${prefix}-${suffix}`.slice(0, 120);
}

function splitTelegramText(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed) {
    return [];
  }

  const maxLength = 3500;
  const parts = [];
  let remaining = trimmed;

  while (remaining.length > maxLength) {
    let splitAt = remaining.lastIndexOf('\n', maxLength);
    if (splitAt < 0) {
      splitAt = remaining.lastIndexOf(' ', maxLength);
    }
    if (splitAt < 1) {
      splitAt = maxLength;
    }
    parts.push(remaining.slice(0, splitAt).trim());
    remaining = remaining.slice(splitAt).trim();
  }

  if (remaining) {
    parts.push(remaining);
  }

  return parts.filter(Boolean);
}

function buildTelegramPrompt(event) {
  const mechiContext = buildMechiBridgeContext({ channel: 'telegram' });
  const mechiSystemPrompt = buildMechiBridgeSystemPrompt('telegram');

  if (TELEGRAM_MODE === 'direct') {
    return [
      'This is a direct Telegram control message for the dedicated Mechi OpenClaw host.',
      'The sender is an authorized operator for this Telegram control chat.',
      'Use the full capabilities of the current OpenClaw agent and workspace when needed.',
      'Reply in plain text that is ready to send back in Telegram.',
      'If an action is destructive, irreversible, or risky, pause and ask for confirmation first.',
      '',
      'MECHI OPERATING PROMPT:',
      mechiSystemPrompt,
      '',
      'MECHI CONTEXT:',
      mechiContext,
      '',
      'ALLOWED TOPICS:',
      stringifyJson(MECHI_ALLOWED_TOPICS),
      '',
      'BLOCKED TOPICS:',
      stringifyJson(MECHI_BLOCKED_TOPICS),
      '',
      `CHAT ID: ${event.chatId}`,
      `CHAT TYPE: ${event.chatType}`,
      `USER ID: ${event.fromId || ''}`,
      `USERNAME: ${event.username || ''}`,
      `NAME: ${[event.firstName, event.lastName].filter(Boolean).join(' ')}`,
      `MESSAGE ID: ${event.messageId || ''}`,
      `MESSAGE THREAD ID: ${event.messageThreadId || ''}`,
      `MESSAGE DATE: ${event.dateIso || ''}`,
      '',
      'OPERATOR MESSAGE:',
      event.text || '[no text]',
      '',
      'ATTACHMENTS:',
      stringifyJson(event.attachments),
      '',
      'RAW UPDATE:',
      stringifyJson(event.raw),
    ].join('\n');
  }

  return [
    'You are the dedicated Mechi Telegram assistant running inside OpenClaw.',
    'Return strict JSON only with the schema {"replies":["message 1","message 2"]}.',
    'Do not include markdown fences or commentary outside the JSON.',
    'Rules:',
    '- Keep replies concise, helpful, and ready to send in Telegram.',
    '- If the user is asking for something that needs a human, explain that briefly and ask for the next needed detail.',
    '- Do not invent account actions, payments, or backend state.',
    '',
    'MECHI OPERATING PROMPT:',
    mechiSystemPrompt,
    '',
    'MECHI CONTEXT:',
    mechiContext,
    '',
    'ALLOWED TOPICS:',
    stringifyJson(MECHI_ALLOWED_TOPICS),
    '',
    'BLOCKED TOPICS:',
    stringifyJson(MECHI_BLOCKED_TOPICS),
    '',
    `CHAT ID: ${event.chatId}`,
    `CHAT TYPE: ${event.chatType}`,
    `USER ID: ${event.fromId || ''}`,
    `USERNAME: ${event.username || ''}`,
    `NAME: ${[event.firstName, event.lastName].filter(Boolean).join(' ')}`,
    `MESSAGE ID: ${event.messageId || ''}`,
    `MESSAGE THREAD ID: ${event.messageThreadId || ''}`,
    `MESSAGE DATE: ${event.dateIso || ''}`,
    '',
    'MESSAGE:',
    event.text || '[no text]',
    '',
    'ATTACHMENTS:',
    stringifyJson(event.attachments),
    '',
    'RAW UPDATE:',
    stringifyJson(event.raw),
  ].join('\n');
}

function runOpenClawAgent({ agent, sessionId, prompt, timeoutSeconds, model }) {
  return new Promise((resolve, reject) => {
    const args = [
      'agent',
      '--session-id',
      sessionId,
      '--message',
      prompt,
      '--thinking',
      OPENCLAW_THINKING,
      '--timeout',
      String(timeoutSeconds),
      '--model',
      model,
      '--json',
    ];

    if (agent) {
      args.splice(1, 0, '--agent', agent);
    }

    const child = spawn(
      OPENCLAW_BIN,
      args,
      {
        env: {
          ...process.env,
          PATH: `${process.env.HOME}/.npm-global/bin:${process.env.PATH || ''}`,
        },
      }
    );

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`OpenClaw exited with code ${code}: ${stderr.trim() || stdout.trim()}`));
        return;
      }

      resolve(parseCliPayload(stdout));
    });
  });
}

function createTelegramApiUrl(method) {
  return `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/${method}`;
}

async function telegramApi(method, payload) {
  const response = await fetch(createTelegramApiUrl(method), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload ?? {}),
  });

  const rawText = await response.text();
  let parsed = null;

  try {
    parsed = rawText ? JSON.parse(rawText) : null;
  } catch {
    parsed = rawText;
  }

  if (!response.ok) {
    throw new Error(`Telegram ${method} failed (${response.status}): ${rawText}`);
  }

  if (!parsed || typeof parsed !== 'object' || parsed.ok !== true) {
    throw new Error(`Telegram ${method} returned an unexpected response: ${rawText}`);
  }

  return parsed.result;
}

async function deleteTelegramWebhookIfNeeded() {
  if (!DELETE_WEBHOOK_ON_START) {
    return;
  }

  await telegramApi('deleteWebhook', {
    drop_pending_updates: false,
  });
}

async function getTelegramMe() {
  return telegramApi('getMe');
}

async function getTelegramUpdates(offset) {
  return telegramApi('getUpdates', {
    offset,
    timeout: POLL_TIMEOUT_SECONDS,
    allowed_updates: ALLOWED_UPDATES,
  });
}

async function sendTelegramMessage(chatId, text, replyToMessageId, messageThreadId) {
  const payload = {
    chat_id: /^-?\d+$/.test(String(chatId)) ? Number(chatId) : String(chatId),
    text,
    reply_parameters:
      typeof replyToMessageId === 'number'
        ? {
            message_id: replyToMessageId,
            allow_sending_without_reply: true,
          }
        : undefined,
  };

  if (typeof messageThreadId === 'number' && messageThreadId > 1) {
    payload.message_thread_id = messageThreadId;
  }

  return telegramApi('sendMessage', payload);
}

function readMessageText(message) {
  if (typeof message?.text === 'string' && message.text.trim()) {
    return message.text.trim();
  }

  if (typeof message?.caption === 'string' && message.caption.trim()) {
    return message.caption.trim();
  }

  return '';
}

function collectAttachments(message) {
  const attachments = [];
  const keys = [
    'photo',
    'video',
    'voice',
    'audio',
    'document',
    'sticker',
    'animation',
    'contact',
    'location',
  ];

  for (const key of keys) {
    if (message?.[key]) {
      attachments.push({
        type: key,
        value:
          typeof message[key] === 'object' && message[key] !== null
            ? stringifyJson(message[key]).slice(0, 1000)
            : String(message[key]),
      });
    }
  }

  return attachments;
}

function isAllowedChat(event) {
  if (ALLOWED_CHAT_TYPES.size > 0 && !ALLOWED_CHAT_TYPES.has(event.chatType)) {
    return false;
  }

  if (ALLOWED_CHAT_IDS.size > 0 && !ALLOWED_CHAT_IDS.has(event.chatId)) {
    return false;
  }

  return true;
}

function isGroupChat(event) {
  return event.chatType === 'group' || event.chatType === 'supergroup';
}

function isBotAddressed(event) {
  if (!isGroupChat(event) || !GROUP_REQUIRE_MENTION) {
    return true;
  }

  const text = String(event.text || '').trim();
  if (!text) {
    return false;
  }

  const normalizedBotUsername = botUsername.replace(/^@/, '').toLowerCase();
  const loweredText = text.toLowerCase();

  if (normalizedBotUsername && loweredText.includes(`@${normalizedBotUsername}`)) {
    return true;
  }

  const commandMatch = text.match(/^\/[a-z0-9_]+(?:@([a-z0-9_]+))?\b/i);
  if (!commandMatch) {
    return false;
  }

  const addressedUsername = commandMatch[1]?.toLowerCase();
  return !addressedUsername || addressedUsername === normalizedBotUsername;
}

function extractIncomingTelegramEvent(update) {
  if (!update || typeof update !== 'object') {
    return null;
  }

  const message = update.message;
  if (!message || typeof message !== 'object') {
    return null;
  }

  if (message.from?.is_bot) {
    return null;
  }

  const chatId =
    typeof message.chat?.id === 'number' || typeof message.chat?.id === 'string'
      ? String(message.chat.id)
      : '';
  if (!chatId) {
    return null;
  }

  const timestamp =
    typeof message.date === 'number' && Number.isFinite(message.date)
      ? new Date(message.date * 1000).toISOString()
      : new Date().toISOString();

  return {
    updateId:
      typeof update.update_id === 'number' && Number.isFinite(update.update_id)
        ? update.update_id
        : null,
    chatId,
    chatType: typeof message.chat?.type === 'string' ? message.chat.type : 'unknown',
    messageId:
      typeof message.message_id === 'number' && Number.isFinite(message.message_id)
        ? message.message_id
        : null,
    messageThreadId:
      typeof message.message_thread_id === 'number' && Number.isFinite(message.message_thread_id)
        ? message.message_thread_id
        : null,
    fromId:
      typeof message.from?.id === 'number' || typeof message.from?.id === 'string'
        ? String(message.from.id)
        : '',
    username: typeof message.from?.username === 'string' ? message.from.username : '',
    firstName: typeof message.from?.first_name === 'string' ? message.from.first_name : '',
    lastName: typeof message.from?.last_name === 'string' ? message.from.last_name : '',
    text: readMessageText(message),
    attachments: collectAttachments(message),
    dateIso: timestamp,
    raw: update,
  };
}

async function readOffset() {
  try {
    const raw = await readFile(OFFSET_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return typeof parsed?.offset === 'number' && Number.isFinite(parsed.offset) ? parsed.offset : 0;
  } catch {
    return 0;
  }
}

async function writeOffset(offset) {
  await mkdir(path.dirname(OFFSET_FILE), { recursive: true });
  await writeFile(
    OFFSET_FILE,
    `${JSON.stringify({ offset, updated_at: new Date().toISOString() }, null, 2)}\n`,
    'utf8'
  );
}

async function handleTelegramEvent(event) {
  if (!isAllowedChat(event)) {
    console.log(
      JSON.stringify({
        level: 'warn',
        service: 'mechi-openclaw-telegram-poller',
        reason: 'chat_not_allowed',
        chat_id: event.chatId,
        chat_type: event.chatType,
      })
    );
    return;
  }

  if (!isBotAddressed(event)) {
    console.log(
      JSON.stringify({
        level: 'info',
        service: 'mechi-openclaw-telegram-poller',
        reason: 'group_mention_required',
        chat_id: event.chatId,
        chat_type: event.chatType,
        message_thread_id: event.messageThreadId ?? null,
      })
    );
    return;
  }

  if (/^\/start(?:@[a-z0-9_]+)?$/i.test(event.text)) {
    await sendTelegramMessage(
      event.chatId,
      TELEGRAM_MODE === 'direct'
        ? 'Mechi OpenClaw control is live here. Send a message and I will route it straight into the Mechi control agent.'
        : 'Mechi OpenClaw is live here. Send a message and I will route it through the Mechi support agent.',
      event.messageId ?? undefined,
      event.messageThreadId ?? undefined
    );
    return;
  }

  if (!event.text) {
    await sendTelegramMessage(
      event.chatId,
      'I can handle text messages here right now. Send your message in text and I will reply.',
      event.messageId ?? undefined,
      event.messageThreadId ?? undefined
    );
    return;
  }

  try {
    const cliResult = await runOpenClawAgent({
      agent: TELEGRAM_AGENT,
      sessionId: toSessionId(
        'telegram',
        event.messageThreadId ? `${event.chatId}:topic:${event.messageThreadId}` : event.chatId
      ),
      prompt: buildTelegramPrompt(event),
      timeoutSeconds: OPENCLAW_TIMEOUT_SECONDS,
      model: TELEGRAM_MODEL,
    });

    const replies = normalizeMultiReplyResponse(cliResult).replies;
    const messages = replies.length > 0 ? replies : ['I could not generate a reply right now.'];

    for (const reply of messages) {
      for (const chunk of splitTelegramText(reply)) {
        await sendTelegramMessage(
          event.chatId,
          chunk,
          event.messageId ?? undefined,
          event.messageThreadId ?? undefined
        );
      }
    }
  } catch (error) {
    console.error('[telegram-poller] OpenClaw error:', error);
    await sendTelegramMessage(
      event.chatId,
      'I hit a snag on my side while reaching the Mechi agent. Please try again in a moment.',
      event.messageId ?? undefined,
      event.messageThreadId ?? undefined
    );
  }
}

async function main() {
  if (!TELEGRAM_BOT_TOKEN) {
    throw new Error(
      'MECHI_OPENCLAW_TELEGRAM_BOT_TOKEN or TELEGRAM_BOT_TOKEN must be configured'
    );
  }

  await deleteTelegramWebhookIfNeeded();
  const me = await getTelegramMe();
  botUsername = typeof me?.username === 'string' ? me.username : '';
  let offset = await readOffset();

  console.log(
    JSON.stringify({
      level: 'info',
      service: 'mechi-openclaw-telegram-poller',
      bot_username: me?.username ?? null,
      bot_id: me?.id ?? null,
      telegram_mode: TELEGRAM_MODE,
      telegram_agent: TELEGRAM_AGENT ?? 'default',
      telegram_agent_raw: RAW_TELEGRAM_AGENT,
      telegram_model: TELEGRAM_MODEL,
      allowed_chat_types: [...ALLOWED_CHAT_TYPES],
      allowed_chat_ids: [...ALLOWED_CHAT_IDS],
      allowed_updates: ALLOWED_UPDATES,
      group_require_mention: GROUP_REQUIRE_MENTION,
      offset_file: OFFSET_FILE,
      offset,
    })
  );

  while (!shuttingDown) {
    try {
      const updates = await getTelegramUpdates(offset);

      for (const update of Array.isArray(updates) ? updates : []) {
        const nextOffset =
          typeof update?.update_id === 'number' && Number.isFinite(update.update_id)
            ? update.update_id + 1
            : offset;

        try {
          const event = extractIncomingTelegramEvent(update);
          if (event) {
            await handleTelegramEvent(event);
          }
        } catch (error) {
          console.error('[telegram-poller] Update handling error:', error);
        } finally {
          if (nextOffset > offset) {
            offset = nextOffset;
            await writeOffset(offset);
          }
        }
      }
    } catch (error) {
      console.error('[telegram-poller] Polling error:', error);
      if (!shuttingDown) {
        await sleep(RETRY_DELAY_MS);
      }
    }
  }
}

function requestShutdown(signal) {
  shuttingDown = true;
  console.log(
    JSON.stringify({
      level: 'info',
      service: 'mechi-openclaw-telegram-poller',
      signal,
      status: 'shutting_down',
    })
  );
}

process.on('SIGINT', () => requestShutdown('SIGINT'));
process.on('SIGTERM', () => requestShutdown('SIGTERM'));

main().catch((error) => {
  console.error('[telegram-poller] Fatal error:', error);
  process.exitCode = 1;
});
