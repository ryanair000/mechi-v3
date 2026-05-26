#!/usr/bin/env node
/**
 * Weekend Cup Season 1 — PlayMechi Launch Returnees
 *
 * Sends a personal invite to every player who registered for the original
 * PlayMechi Launch tournament (event_slug = 'mechi-online-gaming-tournament').
 * Pulls emails from online_tournament_registrations and falls back to profiles.
 *
 * Usage:
 *   node scripts/send-weekendcup-returnees.mjs --dry-run
 *   node scripts/send-weekendcup-returnees.mjs
 *   node scripts/send-weekendcup-returnees.mjs --limit 10
 *   node scripts/send-weekendcup-returnees.mjs --only player@example.com
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

dotenv.config({ path: '.env.local' });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RESULTS_DIR = path.join(__dirname, '..', '.campaign-results');
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESERVED_DOMAINS = new Set(['example.com', 'mechi.test', 'localhost', 'invalid']);
const PLAYMECHI_EVENT_SLUG = 'mechi-online-gaming-tournament';

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || 'https://mechi.club').replace(/\/$/, '');
const FROM_ADDRESS =
  process.env.EMAIL_FROM_ADDRESS?.trim() ||
  process.env.AWS_SES_FROM_EMAIL?.trim() ||
  'noreply@mechi.club';
const FROM = `Mechi <${FROM_ADDRESS}>`;

const SUBJECT = 'You played PlayMechi Launch. Weekend Cup is next.';

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function isDeliverableEmail(email) {
  if (!EMAIL_PATTERN.test(email)) return false;
  const domain = email.split('@')[1] ?? '';
  if (!domain) return false;
  if (RESERVED_DOMAINS.has(domain)) return false;
  return !domain.endsWith('.test') && !domain.endsWith('.example') && !domain.endsWith('.invalid');
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeUrl(url) {
  try {
    return new URL(url).toString();
  } catch {
    return '#';
  }
}

function buildEmailHtml(username, game) {
  const name = escapeHtml(username || 'Player');
  const gameLabel = game === 'pubgm' ? 'PUBG Mobile' : game === 'codm' ? 'CODM' : game === 'efootball' ? 'eFootball' : 'your game';
  const registerUrl = escapeUrl(`${APP_URL}/weekendcup`);
  const unsubscribeUrl = escapeUrl(`${APP_URL}/api/email/unsubscribe?scope=broadcast`);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="x-apple-disable-message-reformatting" />
  <title>Come back for Weekend Cup</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
  <style>
    body { margin: 0; padding: 0; background: #0d0d0d; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    .wrapper { width: 100%; background: #0d0d0d; padding: 32px 16px; }
    .card { max-width: 580px; margin: 0 auto; background: #141414; border-radius: 16px; overflow: hidden; border: 1px solid rgba(255,255,255,0.08); }
    .topline { height: 3px; background: linear-gradient(90deg, #a855f7, #ec4899, #f97316); }
    .header { padding: 32px 32px 24px; text-align: center; }
    .brand { font-size: 22px; font-weight: 800; letter-spacing: 4px; color: #ffffff; margin: 0; }
    .brand-mark { color: #a855f7; }
    .tagline { font-size: 12px; color: rgba(255,255,255,0.35); margin: 8px 0 0; letter-spacing: 0.5px; }
    .body { padding: 0 32px 32px; }
    .kicker { font-size: 11px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: #a855f7; margin: 0 0 12px; }
    h2 { font-size: 26px; font-weight: 800; color: #ffffff; margin: 0 0 20px; line-height: 1.25; }
    p { font-size: 15px; color: rgba(255,255,255,0.7); line-height: 1.65; margin: 0 0 16px; }
    .alumni-badge { display: inline-block; background: rgba(168,85,247,0.15); border: 1px solid rgba(168,85,247,0.3); color: #c084fc; font-size: 12px; font-weight: 700; letter-spacing: 1px; padding: 6px 14px; border-radius: 100px; margin-bottom: 20px; text-transform: uppercase; }
    .info-box { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 20px; margin: 20px 0; }
    .info-row { display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
    .info-row:last-child { border-bottom: none; }
    .info-label { font-size: 12px; color: rgba(255,255,255,0.35); font-weight: 500; }
    .info-value { font-size: 13px; color: rgba(255,255,255,0.85); font-weight: 600; }
    .btn { display: inline-block; background: linear-gradient(135deg, #a855f7, #ec4899); color: #ffffff; font-size: 15px; font-weight: 700; padding: 14px 36px; border-radius: 100px; text-decoration: none; margin: 8px 0 24px; letter-spacing: 0.5px; }
    .note { font-size: 12px; color: rgba(255,255,255,0.25); margin-top: 24px; }
    .secondary-link { color: rgba(255,255,255,0.3); font-size: 12px; }
    .footer { padding: 24px 32px; border-top: 1px solid rgba(255,255,255,0.06); text-align: center; }
    .footer p { font-size: 11px; color: rgba(255,255,255,0.2); margin: 4px 0; }
    .footer a { color: rgba(255,255,255,0.25); text-decoration: none; }
    @media (max-width: 600px) {
      .body, .header, .footer { padding-left: 20px; padding-right: 20px; }
      h2 { font-size: 22px; }
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="topline"></div>
      <div class="header">
        <p class="brand">MECHI<span class="brand-mark">.</span></p>
        <p class="tagline">Kenya's competitive gaming arena</p>
      </div>
      <div class="body">
        <p class="kicker">PlayMechi Alumni · Weekend Cup Season 1</p>
        <div class="alumni-badge">🎮 PlayMechi Launch Alum</div>
        <h2>You showed up for the launch. We want to see you at Weekend Cup.</h2>
        <p>Hey ${name}, you were part of the PlayMechi Launch — the first real Mechi tournament night. You played <strong style="color:#fff;">${escapeHtml(gameLabel)}</strong> and helped make that night happen.</p>
        <p>Weekend Cup Season 1 is the next level. Bigger prize pool, four games, three nights, and a proper bracket. Early Bird slots are almost gone — only <strong style="color:#f97316;">20% remain</strong>.</p>
        <p>You already know what this is. Come back and finish what you started.</p>
        <div class="info-box">
          <div class="info-row">
            <span class="info-label">Event</span>
            <span class="info-value">Weekend Cup Season 1</span>
          </div>
          <div class="info-row">
            <span class="info-label">Dates</span>
            <span class="info-value">Fri 29 – Sun 31 May 2026</span>
          </div>
          <div class="info-row">
            <span class="info-label">Prize pool</span>
            <span class="info-value">Up to KSh 7,500</span>
          </div>
          <div class="info-row">
            <span class="info-label">Games</span>
            <span class="info-value">PUBG Mobile · CODM · eFootball · Free Fire</span>
          </div>
          <div class="info-row">
            <span class="info-label">Early Bird — PUBG / CODM / Free Fire</span>
            <span class="info-value">KSh 50</span>
          </div>
          <div class="info-row">
            <span class="info-label">Early Bird — eFootball</span>
            <span class="info-value">KSh 100</span>
          </div>
          <div class="info-row">
            <span class="info-label">Slots remaining</span>
            <span class="info-value" style="color:#f97316;font-weight:800;">~20% Early Bird left</span>
          </div>
        </div>
        <p>Register now before Early Bird closes. Phase 2 prices are higher and the bracket fills up fast once word spreads.</p>
        <a href="${registerUrl}" class="btn">Claim Your Weekend Cup Slot →</a>
        <p class="note">You received this because you participated in the PlayMechi Launch tournament.</p>
        <p><a href="${unsubscribeUrl}" class="secondary-link">Unsubscribe from Mechi updates</a></p>
      </div>
      <div class="footer">
        <p><strong>mechi.club</strong></p>
        <p><a href="${registerUrl}">Weekend Cup</a> &nbsp;·&nbsp; <a href="${escapeUrl(`${APP_URL}/dashboard`)}">Dashboard</a> &nbsp;·&nbsp; <a href="${escapeUrl(`${APP_URL}/rewards`)}">Rewards</a></p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

function getTransport() {
  const host = process.env.SMTP_HOST?.trim() || '';
  const port = Number.parseInt(process.env.SMTP_PORT?.trim() || '587', 10);
  const secureEnv = (process.env.SMTP_SECURE?.trim() || '').toLowerCase();
  const secure = secureEnv === '' ? port === 465 : ['1', 'true', 'yes', 'on'].includes(secureEnv);
  const user = process.env.SMTP_USER?.trim() || '';
  const pass = process.env.SMTP_PASS?.trim() || '';

  if (!host || !user || !pass) {
    throw new Error('SMTP_HOST, SMTP_USER, and SMTP_PASS must be set in .env.local');
  }

  return nodemailer.createTransport({ pool: true, maxConnections: 1, host, port, secure, auth: { user, pass } });
}

async function loadReturnees({ only, skip, limit }) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');

  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  const { data, error } = await supabase
    .from('online_tournament_registrations')
    .select('user_id, game, email, in_game_username, profiles:user_id(username, email)')
    .eq('event_slug', PLAYMECHI_EVENT_SLUG);

  if (error) throw error;

  const deduped = new Map();
  for (const row of data ?? []) {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    const rawEmail = row.email || profile?.email || '';
    const email = normalizeEmail(rawEmail);
    if (!isDeliverableEmail(email)) continue;
    if (only.length > 0 && !only.includes(email)) continue;
    if (!deduped.has(email)) {
      deduped.set(email, {
        userId: row.user_id,
        username: profile?.username || row.in_game_username || 'Player',
        email,
        game: row.game || '',
      });
    }
  }

  if (only.length > 0) {
    for (const email of only) {
      if (isDeliverableEmail(email) && !deduped.has(email)) {
        deduped.set(email, { userId: null, username: 'Player', email, game: '' });
      }
    }
  }

  let all = Array.from(deduped.values());
  if (skip > 0) all = all.slice(skip);
  if (limit) all = all.slice(0, limit);
  return all;
}

function parseArgs(argv) {
  const dryRun = argv.includes('--dry-run');
  const limitIdx = argv.indexOf('--limit');
  const limit = limitIdx >= 0 ? Number.parseInt(argv[limitIdx + 1], 10) : 0;
  const skipIdx = argv.indexOf('--skip');
  const skip = skipIdx >= 0 ? Number.parseInt(argv[skipIdx + 1], 10) : 0;
  const delayIdx = argv.indexOf('--delay-ms');
  const delayMs = delayIdx >= 0 ? Number.parseInt(argv[delayIdx + 1], 10) : 400;
  const onlyIdx = argv.indexOf('--only');
  const only = onlyIdx >= 0 ? (argv[onlyIdx + 1] || '').split(',').map((e) => normalizeEmail(e)).filter(Boolean) : [];
  return { dryRun, limit: limit > 0 ? limit : 0, skip: skip > 0 ? skip : 0, delayMs, only };
}

function timestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const recipients = await loadReturnees(options);

  if (recipients.length === 0) {
    console.log(JSON.stringify({ ok: false, error: `No deliverable PlayMechi Launch registrants found (event_slug=${PLAYMECHI_EVENT_SLUG}).` }, null, 2));
    process.exit(1);
  }

  const summary = {
    ok: true,
    campaign: 'weekend-cup-returnees',
    eventSlug: PLAYMECHI_EVENT_SLUG,
    subject: SUBJECT,
    recipientCount: recipients.length,
    dryRun: options.dryRun,
    sample: recipients.slice(0, 10).map((r) => ({ email: r.email, game: r.game, username: r.username })),
    sent: [],
    failed: [],
  };

  if (options.dryRun) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  fs.mkdirSync(RESULTS_DIR, { recursive: true });
  const ts = timestamp();
  const checkpointPath = path.join(RESULTS_DIR, `weekend-cup-returnees-${ts}-checkpoint.json`);

  const transporter = getTransport();
  await transporter.verify();

  for (let i = 0; i < recipients.length; i++) {
    const r = recipients[i];
    try {
      const info = await transporter.sendMail({
        from: FROM,
        to: r.email,
        subject: SUBJECT,
        html: buildEmailHtml(r.username, r.game),
        headers: {
          'List-Unsubscribe': `<${APP_URL}/api/email/unsubscribe?scope=broadcast>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      });
      summary.sent.push({ email: r.email, username: r.username, game: r.game, messageId: info.messageId || null });
      if ((i + 1) % 25 === 0 || i === recipients.length - 1) {
        fs.writeFileSync(checkpointPath, JSON.stringify(summary, null, 2), 'utf8');
        console.log(`[returnees] Sent ${i + 1}/${recipients.length}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      summary.failed.push({ email: r.email, username: r.username, game: r.game, error: msg });
      fs.writeFileSync(checkpointPath, JSON.stringify(summary, null, 2), 'utf8');
      console.error(`[returnees] Failed ${r.email}: ${msg}`);
    }

    if (i < recipients.length - 1 && options.delayMs > 0) {
      await wait(options.delayMs);
    }
  }

  if (typeof transporter.close === 'function') transporter.close();

  const outputPath = path.join(RESULTS_DIR, `weekend-cup-returnees-${ts}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(summary, null, 2), 'utf8');
  console.log(JSON.stringify({
    ok: true,
    outputPath,
    recipientCount: recipients.length,
    sentCount: summary.sent.length,
    failedCount: summary.failed.length,
  }, null, 2));
}

main().catch((err) => {
  console.error(err instanceof Error ? err.stack || err.message : String(err));
  process.exit(1);
});
