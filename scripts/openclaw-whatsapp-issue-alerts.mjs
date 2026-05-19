#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { setTimeout as sleep } from 'node:timers/promises';

const DEFAULT_LOG_DIR = '/tmp/openclaw';
const DEFAULT_STATE_FILE = path.join(
  process.env.HOME || '/home/ubuntu',
  '.openclaw',
  'state',
  'whatsapp-issue-alerts.json'
);
const DEFAULT_CHAT_ID = '6806783421';
const POLL_MS = 1500;
const MAX_LINE_BYTES = 64_000;

const ISSUE_PATTERNS = [
  /\b(issue|problem|bug|error|failed|failure|not working|can't|cannot|unable|stuck)\b/i,
  /\b(report|reported|complain|complaint|wrong|missing|broken|down|crash|lag|delay)\b/i,
  /\b(payment|paid|paystack|mpesa|m-?pesa|refund|charged|transaction|receipt)\b/i,
  /\b(account|login|sign ?in|password|banned|ban|blocked|verify|verification)\b/i,
  /\b(room|lobby|slot|check[- ]?in|fixture|match|score|result|opponent|dispute)\b/i,
  /\b(prize|reward|payout|eligibility|eligible|disqualified|disqualification)\b/i,
];

const IGNORE_PATTERNS = [
  /^\s*(hi+|hey+|hello+|yo+|test|ping|thanks?|ok+|sawa|poa)\s*[.!?]*\s*$/i,
];

function stripWrappingQuotes(value) {
  const trimmed = String(value ?? '').trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const index = trimmed.indexOf('=');
    const key = trimmed.slice(0, index).trim();
    if (!key || process.env[key]) continue;
    process.env[key] = stripWrappingQuotes(trimmed.slice(index + 1));
  }
}

function loadConfig() {
  const home = process.env.OPENCLAW_HOME || path.join(process.env.HOME || '/home/ubuntu', '.openclaw');
  loadEnvFile(path.join(home, '.env'));
  loadEnvFile(path.join(process.cwd(), '.env.local'));

  const configPath = path.join(home, 'openclaw.json');
  if (!fs.existsSync(configPath)) return {};
  try {
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch {
    return {};
  }
}

function getTelegramSettings(config) {
  const token =
    process.env.MECHI_WHATSAPP_ISSUE_TELEGRAM_BOT_TOKEN?.trim() ||
    process.env.TELEGRAM_BOT_TOKEN?.trim() ||
    process.env.OPENCLAW_TELEGRAM_BOT_TOKEN?.trim() ||
    config.channels?.telegram?.botToken?.trim();
  const chatId =
    process.env.MECHI_WHATSAPP_ISSUE_TELEGRAM_CHAT_ID?.trim() ||
    process.env.TELEGRAM_BOSS_CHAT_ID?.trim() ||
    process.env.MECHI_SOCIAL_NOTIFY_CHAT_ID?.trim() ||
    process.env.TELEGRAM_CHAT_ID?.trim() ||
    DEFAULT_CHAT_ID;
  return { token, chatId };
}

function getLogFile() {
  const logDir = process.env.OPENCLAW_LOG_DIR || DEFAULT_LOG_DIR;
  const today = new Date().toISOString().slice(0, 10);
  const todayPath = path.join(logDir, `openclaw-${today}.log`);
  if (fs.existsSync(todayPath)) return todayPath;

  const files = fs
    .readdirSync(logDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /^openclaw-\d{4}-\d{2}-\d{2}\.log$/.test(entry.name))
    .map((entry) => path.join(logDir, entry.name))
    .sort();
  return files.at(-1) || todayPath;
}

function loadState(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return { file: '', offset: 0, alerted: [] };
  }
}

function saveState(filePath, state) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(state, null, 2)}\n`);
}

function isIssueText(text) {
  const normalized = String(text || '').trim();
  if (!normalized) return false;
  if (IGNORE_PATTERNS.some((pattern) => pattern.test(normalized))) return false;
  return ISSUE_PATTERNS.some((pattern) => pattern.test(normalized));
}

function extractInboundEvent(line) {
  if (!line.includes('"inbound web message"')) {
    return null;
  }

  let parsed;
  try {
    parsed = JSON.parse(line);
  } catch {
    return null;
  }

  const source = String(parsed?.['0'] || '');
  if (!source.includes('web-auto-reply')) return null;

  const event = parsed?.['1'];
  if (!event || typeof event !== 'object') return null;

  const body = String(event.body || '').trim();
  if (!isIssueText(body)) return null;

  return {
    correlationId: String(event.correlationId || `${event.from}:${event.to}:${body}`).slice(0, 160),
    from: String(event.from || 'unknown'),
    to: String(event.to || 'unknown'),
    body,
    mediaType: event.mediaType || null,
    time: parsed.time || new Date().toISOString(),
  };
}

function alertKey(event) {
  return `${event.correlationId}:${event.from}:${event.to}`;
}

function formatAlert(event) {
  const lines = [
    'WHATSAPP ISSUE REPORTED',
    `From: ${event.from}`,
    `To: ${event.to}`,
    `Time: ${event.time}`,
    '',
    event.body.length > 1200 ? `${event.body.slice(0, 1200).trimEnd()}...` : event.body,
  ];
  if (event.mediaType) lines.splice(3, 0, `Media: ${event.mediaType}`);
  return lines.join('\n');
}

async function sendTelegram({ token, chatId }, text) {
  if (!token) throw new Error('Missing Telegram bot token for WhatsApp issue alerts');
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      disable_web_page_preview: true,
    }),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || `Telegram sendMessage failed with ${response.status}`);
  }
}

function readNewLines(filePath, state) {
  if (!fs.existsSync(filePath)) return [];
  const stat = fs.statSync(filePath);
  if (state.file !== filePath || state.offset > stat.size) {
    state.file = filePath;
    state.offset = stat.size;
    return [];
  }

  if (stat.size === state.offset) return [];
  const length = Math.min(stat.size - state.offset, MAX_LINE_BYTES * 200);
  const fd = fs.openSync(filePath, 'r');
  const buffer = Buffer.alloc(length);
  fs.readSync(fd, buffer, 0, length, state.offset);
  fs.closeSync(fd);
  state.offset += length;
  return buffer.toString('utf8').split(/\r?\n/).filter(Boolean);
}

async function main() {
  const config = loadConfig();
  const telegram = getTelegramSettings(config);
  const stateFile = process.env.MECHI_WHATSAPP_ISSUE_STATE_FILE || DEFAULT_STATE_FILE;
  const state = loadState(stateFile);
  state.alerted = Array.isArray(state.alerted) ? state.alerted.slice(-300) : [];
  const alerted = new Set(state.alerted);

  console.log('whatsapp issue alert watcher started');

  while (true) {
    try {
      const logFile = getLogFile();
      const lines = readNewLines(logFile, state);
      for (const line of lines) {
        const event = extractInboundEvent(line);
        if (!event) continue;
        const key = alertKey(event);
        if (alerted.has(key)) continue;

        await sendTelegram(telegram, formatAlert(event));
        alerted.add(key);
        state.alerted = [...alerted].slice(-300);
        console.log(`alerted ${event.from} ${event.correlationId}`);
      }
      saveState(stateFile, state);
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
    }
    await sleep(POLL_MS);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exit(1);
});
