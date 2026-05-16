#!/usr/bin/env node
import { mkdir, readdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { envFirst } from './social-brand-config.mjs';

const scriptDir = dirname(fileURLToPath(import.meta.url));

function stateRoot() {
  return (
    process.env.MECHI_SOCIAL_SCHEDULE_DIR ||
    resolve(scriptDir, '..', '..', 'state', 'scheduled-posts')
  );
}

function publishScriptFor(type) {
  if (type === 'video') return 'publish-social-video.mjs';
  return 'publish-social-photo.mjs';
}

async function moveJob(source, folder, job, extra = {}) {
  const root = stateRoot();
  const targetDir = resolve(root, folder);
  await mkdir(targetDir, { recursive: true });
  const target = resolve(targetDir, source.split(/[\\/]/).pop());
  await writeFile(source, JSON.stringify({ ...job, ...extra }, null, 2) + '\n', { mode: 0o600 });
  await rename(source, target);
  return target;
}

function runPublish(job) {
  const args = [
    resolve(scriptDir, publishScriptFor(job.type)),
    '--brand',
    job.brand,
    '--channels',
    job.channels,
  ];
  if (job.caption) args.push('--caption', job.caption);
  args.push(job.media);

  const result = spawnSync(process.execPath, args, {
    cwd: scriptDir,
    encoding: 'utf8',
    shell: false,
  });

  const raw = (result.stdout || result.stderr || '').trim();
  let body = raw;
  try {
    body = raw ? JSON.parse(raw) : null;
  } catch {}

  return {
    ok: result.status === 0,
    status: result.status,
    body,
    raw,
  };
}

function summarizePublishResult(result) {
  const body = result.body;
  if (!body || typeof body !== 'object') {
    return result.raw || '';
  }

  if (Array.isArray(body.results)) {
    return body.results
      .map((entry) => {
        const channel = entry.channel || entry.target || 'channel';
        if (entry.ok === false) return `${channel}: skipped/failed ${entry.error || entry.reason || ''}`.trim();
        return `${channel}: ${entry.id || entry.mediaId || entry.permalink || entry.url || 'ok'}`;
      })
      .join('\n');
  }

  return JSON.stringify(body);
}

async function notifyBoss(job, result) {
  const token = envFirst(['TELEGRAM_BOT_TOKEN', 'OPENCLAW_TELEGRAM_BOT_TOKEN']);
  const chatId = envFirst([
    'MECHI_SOCIAL_NOTIFY_CHAT_ID',
    'TELEGRAM_SOCIO_NOTIFY_CHAT_ID',
    'TELEGRAM_BOSS_CHAT_ID',
  ]);
  if (!token || !chatId) return;

  const status = result.ok ? 'POSTED SCHEDULED POST' : 'SCHEDULED POST FAILED';
  const lines = [
    status,
    `job: ${job.id}`,
    `brand: ${job.brand}`,
    `channels: ${job.channels}`,
    `scheduled: ${job.scheduledAt}`,
    `caption: ${job.caption || '(empty)'}`,
  ];
  const summary = summarizePublishResult(result);
  if (summary) lines.push(`result: ${summary}`);

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: lines.join('\n'),
        disable_web_page_preview: true,
      }),
    });
  } catch {
    // Cron should never fail only because the notification channel is unavailable.
  }
}

async function main() {
  const now = Date.now();
  const root = stateRoot();
  const pendingDir = resolve(root, 'pending');
  await mkdir(pendingDir, { recursive: true });

  const files = (await readdir(pendingDir)).filter((name) => name.endsWith('.json')).sort();
  const results = [];

  for (const name of files) {
    const file = resolve(pendingDir, name);
    const job = JSON.parse(await readFile(file, 'utf8'));
    const due = new Date(job.scheduledAt).getTime();
    if (Number.isNaN(due) || due > now) continue;

    const startedAt = new Date().toISOString();
    const result = runPublish(job);
    const finishedAt = new Date().toISOString();
    const folder = result.ok ? 'sent' : 'failed';
    const target = await moveJob(file, folder, job, {
      status: result.ok ? 'sent' : 'failed',
      startedAt,
      finishedAt,
      result: result.body ?? result.raw,
    });
    await notifyBoss(job, result);
    results.push({ id: job.id, ok: result.ok, target });
  }

  console.log(JSON.stringify({ ok: true, processed: results.length, results }, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: error.message || String(error) }, null, 2));
  process.exit(1);
});
