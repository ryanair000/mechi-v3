#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

dotenv.config({ path: '.env.local' });

const RESERVED_DOMAINS = new Set(['example.com', 'mechi.test', 'localhost', 'invalid']);
const APP_URL = normalizeEnvValue(process.env.NEXT_PUBLIC_APP_URL) || 'https://mechi.club';
const FROM_ADDRESS =
  normalizeEnvValue(process.env.EMAIL_FROM_ADDRESS) ||
  normalizeEnvValue(process.env.AWS_SES_FROM_EMAIL) ||
  'chezahub@gmail.com';
const FROM = `Mechi <${FROM_ADDRESS}>`;
const CAMPAIGNS = {
  welcome: {
    subject: 'Welcome to Mechi. Your arena is live.',
    title: 'The platform is live. Your player card is ready.',
    previewTitle: 'Welcome to the arena',
    ctaLabel: 'Open Mechi',
    render: (username) => {
      const dashboardUrl = escapeUrl(`${APP_URL}/dashboard`);
      const profileUrl = escapeUrl(`${APP_URL}/profile/settings`);
      const rewardsUrl = escapeUrl(`${APP_URL}/rewards`);
      return {
        bodyIntro: `Hey ${escapeHtml(username || 'Player')}, you are officially inside Mechi, the home base for Kenyan gamers who want cleaner matches, louder wins, and real rewards.`,
        bodyExtra:
          'Finish your profile loadout, add your exact game IDs, and start using queues, lobbies, tournaments, rewards, and support from one place instead of scattered chats.',
        bodyClose:
          'This is your player card, your match hub, and your route into the next PlayMechi run.',
        ctaUrl: dashboardUrl,
        infoRows: [
          ['First move', 'Finish your profile loadout'],
          ['Best setup win', 'Add your exact game tags'],
          ['Fastest momentum', 'Join your first queue today'],
        ],
        miniCards: [
          ['Platform', 'mechi.club'],
          ['Focus', 'Queues + Tournaments'],
          ['Next run', 'PlayMechi ready'],
        ],
        secondaryLinks: [
          ['Finish profile setup', profileUrl],
          ['See rewards', rewardsUrl],
        ],
      };
    },
  },
  tournament_live: {
    subject: 'PlayMechi goes live at 8:30 PM. Check in now.',
    title: 'Tournament night is live at 8:30 PM EAT.',
    previewTitle: 'Tournament live alert',
    ctaLabel: 'Check In Now',
    render: (username) => {
      const checkInUrl = escapeUrl(`${APP_URL}/playmechi/check-in`);
      const tournamentDeskUrl = escapeUrl(`${APP_URL}/playmechi/tournament`);
      const instagramUrl = 'https://www.instagram.com/playmechi/';
      const youtubeUrl = 'https://www.youtube.com/@playmechi';
      return {
        bodyIntro: `Hey ${escapeHtml(username || 'Player')}, PlayMechi tournament night goes live at <strong>8:30 PM EAT</strong>. If you are playing tonight, move now, not later.`,
        bodyExtra:
          'Check in before the desk gets busy, keep your registered in-game name ready, and make sure your phone, data, and game account are locked in before rooms and fixtures start moving.',
        bodyClose:
          'To stay eligible for rewards, follow PlayMechi on Instagram and subscribe on YouTube before match time. Admin verification is the final check.',
        ctaUrl: checkInUrl,
        infoRows: [
          ['Tournament start', '8:30 PM EAT'],
          ['Player action', 'Check in now'],
          ['Reward rule', 'Follow Instagram + Subscribe YouTube'],
        ],
        miniCards: [
          ['Check-in', 'Live now'],
          ['Stream brand', '@playmechi'],
          ['Tonight', 'Tournament desk'],
        ],
        secondaryLinks: [
          ['Open tournament desk', tournamentDeskUrl],
          ['Follow on Instagram', instagramUrl],
          ['Subscribe on YouTube', youtubeUrl],
        ],
      };
    },
  },
};
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const RESULTS_DIR = path.join(__dirname, '..', 'tmp');

function normalizeEnvValue(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function parseArgs(argv) {
  const options = {
    campaign: 'welcome',
    dryRun: false,
    delayMs: 350,
    limit: null,
    only: [],
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--dry-run') {
      options.dryRun = true;
      continue;
    }

    if (arg === '--campaign') {
      const next = argv[index + 1];
      if (next && CAMPAIGNS[next]) {
        options.campaign = next;
        index += 1;
      }
      continue;
    }

    if (arg === '--limit') {
      const next = argv[index + 1];
      if (next) {
        const parsed = Number.parseInt(next, 10);
        if (Number.isFinite(parsed) && parsed > 0) {
          options.limit = parsed;
        }
        index += 1;
      }
      continue;
    }

    if (arg === '--only') {
      const next = argv[index + 1];
      if (next) {
        options.only = next
          .split(/[,\s;]+/)
          .map((value) => normalizeEmail(value))
          .filter(Boolean);
        index += 1;
      }
      continue;
    }

    if (arg === '--delay-ms') {
      const next = argv[index + 1];
      if (next) {
        const parsed = Number.parseInt(next, 10);
        if (Number.isFinite(parsed) && parsed >= 0) {
          options.delayMs = parsed;
        }
        index += 1;
      }
    }
  }

  return options;
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function isDeliverableEmail(email) {
  const normalized = normalizeEmail(email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    return false;
  }

  const domain = normalized.split('@')[1] || '';
  if (!domain) {
    return false;
  }

  if (RESERVED_DOMAINS.has(domain)) {
    return false;
  }

  return !domain.endsWith('.test') && !domain.endsWith('.example') && !domain.endsWith('.invalid');
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeUrl(value) {
  const url = String(value ?? '').trim();
  if (!url) {
    return APP_URL;
  }

  if (url.startsWith('https://') || url.startsWith('http://')) {
    return escapeHtml(url);
  }

  if (url.startsWith('/')) {
    return escapeHtml(`${APP_URL}${url}`);
  }

  return escapeHtml(APP_URL);
}

function buildCampaignHtml(campaignKey, username) {
  const campaign = CAMPAIGNS[campaignKey] ?? CAMPAIGNS.welcome;
  const dashboardUrl = escapeUrl(`${APP_URL}/dashboard`);
  const playMechiUrl = escapeUrl(`${APP_URL}/playmechi`);
  const logoUrl = escapeUrl(`${APP_URL}/mechi-logo-shield.png`);
  const view = campaign.render(username || 'Player');
  const miniCards = view.miniCards
    .map(
      ([label, value], index) => `
                    <td class="mini-cell" width="33%">
                      <span class="mini-label">${escapeHtml(label)}</span>
                      <span class="mini-value">${escapeHtml(value)}</span>
                    </td>${index < view.miniCards.length - 1 ? '\n                    <td width="10"></td>' : ''}`
    )
    .join('');
  const infoRows = view.infoRows
    .map(
      ([label, value]) => `
                  <div class="info-row">
                    <span class="info-label">${escapeHtml(label)}</span>
                    <span class="info-value">${escapeHtml(value)}</span>
                  </div>`
    )
    .join('');
  const secondaryLinks = view.secondaryLinks
    .map(([label, href], index) => {
      const separator = index < view.secondaryLinks.length - 1 ? ' &nbsp;·&nbsp; ' : '';
      return `<a href="${escapeUrl(href)}" class="secondary-link">${escapeHtml(label)}</a>${separator}`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light only" />
  <meta name="supported-color-schemes" content="light only" />
  <title>${escapeHtml(campaign.title)}</title>
  <style>
    body { margin: 0; padding: 0; background: #e2e8f0; font-family: 'Segoe UI', Arial, Helvetica, sans-serif; color: #0b1121; }
    table { border-collapse: collapse; }
    a { color: inherit; }
    img { border: 0; line-height: 100%; outline: none; text-decoration: none; }
    .wrapper { width: 100%; background: radial-gradient(circle at top left, rgba(50, 224, 196, 0.26), transparent 32%), radial-gradient(circle at top right, rgba(255, 107, 107, 0.18), transparent 28%), linear-gradient(180deg, #eff4fa 0%, #e2e8f0 58%, #d9e3ee 100%); padding: 36px 12px 44px; }
    .shell { width: 100%; max-width: 700px; margin: 0 auto; }
    .card { background: #ffffff; border: 1px solid #d4deea; border-radius: 28px; overflow: hidden; box-shadow: 0 30px 74px rgba(11, 17, 33, 0.18); }
    .topline { height: 8px; background: linear-gradient(90deg, #32e0c4 0%, #32e0c4 42%, #ff6b6b 58%, #ff6b6b 100%); }
    .header { background: radial-gradient(circle at top left, rgba(50, 224, 196, 0.18), transparent 34%), radial-gradient(circle at top right, rgba(255, 107, 107, 0.16), transparent 30%), linear-gradient(135deg, #10182c 0%, #0b1121 64%, #17233b 100%); padding: 28px 30px 30px; }
    .label-pill { display: inline-block; padding: 6px 12px; border-radius: 999px; background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.12); color: #d8e6f6; font-size: 11px; font-weight: 900; letter-spacing: 0.12em; text-transform: uppercase; }
    .logo { display: inline-block; height: 52px; width: 52px; border-radius: 18px; vertical-align: middle; }
    .brand { color: #ffffff; display: inline-block; font-size: 31px; font-weight: 900; letter-spacing: -0.03em; line-height: 1; margin: 0 0 0 12px; vertical-align: middle; }
    .brand-mark { color: #ff6b6b; }
    .tagline { color: #d8e6f6; margin: 18px 0 0; font-size: 14px; line-height: 1.72; max-width: 520px; }
    .body { padding: 34px 30px 30px; background: linear-gradient(180deg, #ffffff 0%, #fbfdff 100%); }
    .campaign-kicker { color: #ff6b6b; display: inline-block; font-size: 11px; font-weight: 900; letter-spacing: 0.12em; margin: 0 0 12px; text-transform: uppercase; }
    .body h2 { color: #0b1121; margin: 0 0 12px; font-size: 31px; font-weight: 900; letter-spacing: -0.03em; line-height: 1.12; }
    .body p { color: #465366; line-height: 1.76; margin: 0 0 16px; font-size: 15px; }
    .mini-grid { width: 100%; margin: 20px 0 4px; }
    .mini-cell { background: linear-gradient(180deg, #10182c 0%, #17243a 100%); border: 1px solid rgba(50, 224, 196, 0.18); border-radius: 18px; padding: 16px; box-shadow: 0 18px 30px rgba(11, 17, 33, 0.14); }
    .mini-label { color: #9fb0c7; display: block; font-size: 11px; font-weight: 800; letter-spacing: 0.08em; line-height: 1.2; text-transform: uppercase; }
    .mini-value { color: #ffffff; display: block; font-size: 17px; font-weight: 900; line-height: 1.35; margin-top: 6px; }
    .info-box { background: linear-gradient(180deg, #f8fbff 0%, #f3f8fc 100%); border: 1px solid #d8e4ef; border-radius: 20px; padding: 6px 18px; margin: 24px 0; box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.8); }
    .info-row { display: table; width: 100%; padding: 14px 0; border-bottom: 1px solid #e2e8f0; }
    .info-row:last-child { border-bottom: none; }
    .info-label { display: table-cell; color: #64748b; font-size: 11px; font-weight: 900; letter-spacing: 0.08em; line-height: 1.45; padding-right: 16px; text-transform: uppercase; vertical-align: top; }
    .info-value { display: table-cell; color: #0b1121; font-size: 14px; font-weight: 900; line-height: 1.45; text-align: right; vertical-align: top; }
    .btn { display: inline-block; background: #ff6b6b; color: #ffffff !important; text-decoration: none; padding: 15px 24px; border-radius: 14px; font-weight: 900; font-size: 14px; margin-top: 8px; box-shadow: 0 14px 28px rgba(255, 107, 107, 0.24); }
    .secondary-link { color: #138f80 !important; font-size: 13px; font-weight: 900; text-decoration: none; }
    .footer { padding: 24px 30px 30px; border-top: 1px solid #e2e8f0; background: linear-gradient(180deg, #f7fbff 0%, #f2f7fb 100%); }
    .footer p { color: #64748b; font-size: 12px; margin: 0 0 6px; line-height: 1.6; }
    .footer-nav { margin: 0 0 12px; }
    .footer-nav a { color: #0b1121 !important; font-size: 12px; font-weight: 900; text-decoration: none; margin-right: 14px; }
  </style>
</head>
<body>
  <table role="presentation" class="wrapper" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center">
        <table role="presentation" class="shell" cellpadding="0" cellspacing="0">
          <tr>
            <td class="card">
              <div class="topline"></div>
              <div class="header">
                <span class="label-pill">Mechi mail</span>
                <div style="padding-top:16px;">
                  <img src="${logoUrl}" width="52" height="52" alt="Mechi" class="logo" />
                  <p class="brand">MECHI<span class="brand-mark">.</span></p>
                </div>
                <p class="tagline">Competitive Kenyan gaming, cleaned up into one fast platform for matches, tournaments, rewards, and real support when the room gets noisy.</p>
              </div>
              <div class="body">
                <p class="campaign-kicker">${escapeHtml(campaign.previewTitle)}</p>
                <h2>${escapeHtml(campaign.title)}</h2>
                <p>${view.bodyIntro}</p>
                <p>${view.bodyExtra}</p>
                <table role="presentation" class="mini-grid" cellpadding="0" cellspacing="0">
                  <tr>
                    ${miniCards}
                  </tr>
                </table>
                <div class="info-box">
                  ${infoRows}
                </div>
                <p>${view.bodyClose}</p>
                <a href="${view.ctaUrl}" class="btn">${escapeHtml(campaign.ctaLabel)}</a>
                <p>${secondaryLinks}</p>
              </div>
              <div class="footer">
                <p class="footer-nav">
                  <a href="${dashboardUrl}">Dashboard</a>
                  <a href="${escapeUrl(`${APP_URL}/rewards`)}">Rewards</a>
                  <a href="${playMechiUrl}">PlayMechi</a>
                </p>
                <p><strong>mechi.club</strong></p>
                <p>You are receiving this because your email is linked to a Mechi account.</p>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function getTransport() {
  const host = normalizeEnvValue(process.env.SMTP_HOST);
  const port = Number.parseInt(normalizeEnvValue(process.env.SMTP_PORT) || '465', 10);
  const secureEnv = normalizeEnvValue(process.env.SMTP_SECURE).toLowerCase();
  const secure =
    secureEnv === '' ? port === 465 : ['1', 'true', 'yes', 'on'].includes(secureEnv);
  const user = normalizeEnvValue(process.env.SMTP_USER);
  const pass = normalizeEnvValue(process.env.SMTP_PASS);

  if (!host || !user || !pass) {
    throw new Error('SMTP_HOST, SMTP_USER, and SMTP_PASS are required.');
  }

  return nodemailer.createTransport({
    pool: true,
    maxConnections: 1,
    host,
    port,
    secure,
    auth: { user, pass },
  });
}

async function loadRecipients(options) {
  const url = normalizeEnvValue(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = normalizeEnvValue(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!url || !key) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
  }

  const supabase = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, email')
    .not('email', 'is', null)
    .order('created_at', { ascending: true });

  if (error) {
    throw error;
  }

  const deduped = new Map();
  for (const row of data ?? []) {
    const email = normalizeEmail(row.email);
    if (!isDeliverableEmail(email)) {
      continue;
    }

    if (options.only.length > 0 && !options.only.includes(email)) {
      continue;
    }

    if (!deduped.has(email)) {
      deduped.set(email, {
        id: row.id,
        username: row.username || 'Player',
        email,
      });
    }
  }

  if (options.only.length > 0) {
    for (const email of options.only) {
      if (isDeliverableEmail(email) && !deduped.has(email)) {
        deduped.set(email, {
          id: null,
          username: 'Player',
          email,
        });
      }
    }
  }

  const recipients = Array.from(deduped.values());
  if (options.limit) {
    return recipients.slice(0, options.limit);
  }

  return recipients;
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function timestampLabel() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, '0');
  return [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    '-',
    pad(now.getHours()),
    pad(now.getMinutes()),
    pad(now.getSeconds()),
  ].join('');
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const campaign = CAMPAIGNS[options.campaign] ?? CAMPAIGNS.welcome;
  const recipients = await loadRecipients(options);

  if (recipients.length === 0) {
    console.log(JSON.stringify({ ok: false, error: 'No deliverable recipients found.' }, null, 2));
    process.exit(1);
  }

  const summary = {
    ok: true,
    campaign: options.campaign,
    subject: campaign.subject,
    recipientCount: recipients.length,
    dryRun: options.dryRun,
    sample: recipients.slice(0, 10).map((recipient) => recipient.email),
    sent: [],
    failed: [],
  };

  if (options.dryRun) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  fs.mkdirSync(RESULTS_DIR, { recursive: true });
  const transporter = getTransport();
  await transporter.verify();

  for (let index = 0; index < recipients.length; index += 1) {
    const recipient = recipients[index];
    try {
      const info = await transporter.sendMail({
        from: FROM,
        to: recipient.email,
        subject: campaign.subject,
        html: buildCampaignHtml(options.campaign, recipient.username),
      });
      summary.sent.push({
        email: recipient.email,
        username: recipient.username,
        messageId: info.messageId || null,
      });
      if ((index + 1) % 25 === 0 || index === recipients.length - 1) {
        console.log(`Sent ${index + 1}/${recipients.length}`);
      }
    } catch (error) {
      summary.failed.push({
        email: recipient.email,
        username: recipient.username,
        error: error instanceof Error ? error.message : String(error),
      });
      console.error(`Failed ${recipient.email}: ${summary.failed[summary.failed.length - 1].error}`);
    }

    if (index < recipients.length - 1 && options.delayMs > 0) {
      await wait(options.delayMs);
    }
  }

  if (typeof transporter.close === 'function') {
    transporter.close();
  }

  const outputPath = path.join(RESULTS_DIR, `welcome-backfill-${timestampLabel()}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(summary, null, 2), 'utf8');
  console.log(
    JSON.stringify(
      {
        ok: true,
        outputPath,
        recipientCount: recipients.length,
        sentCount: summary.sent.length,
        failedCount: summary.failed.length,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exit(1);
});
