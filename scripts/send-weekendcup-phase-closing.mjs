#!/usr/bin/env node
/**
 * PlayMechi Weekend Cup Season 1 email campaign.
 *
 * Dry-run by default:
 *   node scripts/send-weekendcup-phase-closing.mjs --audience both
 *
 * Send after operator approval:
 *   node scripts/send-weekendcup-phase-closing.mjs --audience both --send
 */

import crypto from 'node:crypto';
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
const APP_URL = normalizeUrl(process.env.NEXT_PUBLIC_APP_URL || 'https://mechi.club');
const WEEKEND_CUP_SLUG = 'playmechi-weekend-cup-season-1-2026-05-29';
const CAMPAIGN_KEY = 'weekend-cup-last-chance-all-games-open-2026-05-30';
const FROM_ADDRESS =
  process.env.EMAIL_FROM_ADDRESS?.trim() ||
  process.env.AWS_SES_FROM_EMAIL?.trim() ||
  'chezahub@gmail.com';
const FROM = `PlayMechi <${FROM_ADDRESS}>`;
const REPLY_TO = 'chezahub@gmail.com';

const GAME_LABELS = {
  pubgm: 'PUBG Mobile',
  codm: 'CODM',
  efootball: 'eFootball',
  freefire: 'Free Fire',
  mystery: 'Free Fire',
};

const GAME_DATES = {
  pubgm: 'Sunday 31 May 2026, 8:00 PM EAT',
  codm: 'Saturday 30 May 2026, 8:00 PM EAT',
  efootball: 'Sunday 31 May 2026, 7:30 PM EAT',
  freefire: 'Sunday 31 May 2026, 8:00 PM EAT',
  mystery: 'Sunday 31 May 2026, 8:00 PM EAT',
};

const PHASE_2_FEES = {
  pubgm: 75,
  codm: 75,
  efootball: 125,
  freefire: 75,
  mystery: 75,
};

const FINAL_RUSH_FEES = {
  pubgm: 100,
  codm: 100,
  efootball: 150,
  freefire: 100,
  mystery: 100,
};

const BLAST_SUBJECT = 'Last chance: Weekend Cup registration is open for all games';
const REMINDER_SUBJECT = 'Last chance to finish Weekend Cup payment';

function normalizeUrl(value) {
  return String(value || 'https://mechi.club').trim().replace(/\/+$/, '');
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeText(value, fallback = '') {
  return String(value || fallback).trim();
}

function isDeliverableEmail(email) {
  if (!EMAIL_PATTERN.test(email)) return false;
  const domain = email.split('@')[1] || '';
  if (!domain || RESERVED_DOMAINS.has(domain)) return false;
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
  try {
    return new URL(String(value), APP_URL).toString();
  } catch {
    return APP_URL;
  }
}

function getUnsubscribeSecret() {
  return process.env.EMAIL_UNSUBSCRIBE_SECRET?.trim() || process.env.JWT_SECRET?.trim() || 'development-email-unsubscribe-secret';
}

function buildUnsubscribeUrl(email) {
  const normalizedEmail = normalizeEmail(email);
  const token = crypto
    .createHmac('sha256', getUnsubscribeSecret())
    .update(`broadcast:${normalizedEmail}`)
    .digest('base64url');
  const url = new URL('/api/email/unsubscribe', APP_URL);
  url.searchParams.set('email', normalizedEmail);
  url.searchParams.set('scope', 'broadcast');
  url.searchParams.set('token', token);
  return url.toString();
}

function htmlToText(html) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function hashForKey(value) {
  return crypto.createHash('sha256').update(normalizeEmail(value)).digest('hex').slice(0, 24);
}

function eventKeyFor(audience, recipient) {
  const segment = recipient.registrationId || recipient.game || 'profile';
  return [
    'email-campaign',
    CAMPAIGN_KEY,
    audience,
    hashForKey(recipient.email),
    String(segment).replace(/[^a-z0-9_-]+/gi, '-'),
  ].join(':');
}

async function claimDelivery(supabase, { audience, subject, recipient }) {
  const eventKey = eventKeyFor(audience, recipient);
  const metadata = {
    campaign: CAMPAIGN_KEY,
    audience,
    subject,
    registration_id: recipient.registrationId || null,
    game: recipient.game || null,
  };
  const { error } = await supabase.from('email_delivery_events').insert({
    event_key: eventKey,
    event_type: 'weekend_cup_phase_closing_campaign',
    recipient: recipient.email,
    user_id: recipient.userId || null,
    metadata,
    status: 'claimed',
    updated_at: new Date().toISOString(),
  });

  if (!error) {
    return { claimed: true, eventKey, metadata };
  }

  if (error.code !== '23505') {
    throw error;
  }

  const { data, error: lookupError } = await supabase
    .from('email_delivery_events')
    .select('status')
    .eq('event_key', eventKey)
    .maybeSingle();

  if (lookupError) {
    throw lookupError;
  }

  if (data?.status === 'failed') {
    const { error: reclaimError } = await supabase
      .from('email_delivery_events')
      .update({
        status: 'claimed',
        error: null,
        recipient: recipient.email,
        user_id: recipient.userId || null,
        metadata: { ...metadata, reclaimed_at: new Date().toISOString() },
        updated_at: new Date().toISOString(),
      })
      .eq('event_key', eventKey)
      .eq('status', 'failed');

    if (reclaimError) {
      throw reclaimError;
    }

    return { claimed: true, eventKey, metadata: { ...metadata, reclaimed: true } };
  }

  return {
    claimed: false,
    eventKey,
    metadata: { ...metadata, existing_status: data?.status || null },
  };
}

async function markDelivery(supabase, eventKey, status, metadata, error = null) {
  const update = {
    status,
    metadata,
    error,
    updated_at: new Date().toISOString(),
  };
  const { error: updateError } = await supabase
    .from('email_delivery_events')
    .update(update)
    .eq('event_key', eventKey);

  if (updateError) {
    console.error(`[delivery] Could not mark ${eventKey}: ${updateError.message}`);
  }
}

function baseLayout({ title, preheader, body, unsubscribeUrl }) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light only" />
  <title>${escapeHtml(title)}</title>
  <style>
    body { margin:0; padding:0; background:#eef4f7; color:#101827; font-family:Arial, Helvetica, sans-serif; }
    a { color:inherit; }
    .preheader { display:none; max-height:0; overflow:hidden; opacity:0; }
    .wrap { width:100%; padding:28px 12px 36px; background:linear-gradient(180deg,#eef4f7 0%,#dfeaf0 100%); }
    .card { max-width:680px; margin:0 auto; background:#ffffff; border:1px solid #d7e2e8; border-radius:18px; overflow:hidden; box-shadow:0 22px 54px rgba(16,24,39,.14); }
    .topbar { height:7px; background:linear-gradient(90deg,#32e0c4 0%,#32e0c4 46%,#ff6b6b 46%,#ff6b6b 100%); }
    .hero { padding:28px 30px 26px; background:#101827; color:#ffffff; }
    .brand { margin:0; font-size:30px; line-height:1; font-weight:900; letter-spacing:.01em; }
    .brand span { color:#ff6b6b; }
    .tag { margin:12px 0 0; color:#c8d6e0; font-size:14px; line-height:1.6; }
    .body { padding:30px; }
    .kicker { margin:0 0 10px; color:#138f80; font-size:12px; font-weight:900; letter-spacing:.12em; text-transform:uppercase; }
    h1 { margin:0 0 14px; color:#101827; font-size:30px; line-height:1.12; font-weight:900; }
    p { margin:0 0 16px; color:#4b5565; font-size:15px; line-height:1.72; }
    .grid { width:100%; margin:18px 0 22px; border:1px solid #dbe5ec; border-radius:14px; overflow:hidden; }
    .row { display:table; width:100%; border-bottom:1px solid #e4edf2; }
    .row:last-child { border-bottom:0; }
    .cell { display:table-cell; padding:13px 15px; vertical-align:top; }
    .label { color:#667587; font-size:11px; font-weight:900; letter-spacing:.08em; text-transform:uppercase; }
    .value { color:#101827; font-size:14px; font-weight:900; text-align:right; }
    .btn { display:inline-block; margin:4px 0 18px; padding:14px 22px; background:#ff6b6b; color:#ffffff !important; border-radius:12px; text-decoration:none; font-weight:900; font-size:14px; }
    .note { padding:14px 16px; border-radius:13px; background:#f4faf8; border:1px solid #cceee6; color:#225d55; font-size:13px; }
    .footer { padding:22px 30px 28px; border-top:1px solid #e4edf2; background:#f8fbfd; }
    .footer p { margin:0 0 8px; color:#6b7788; font-size:12px; line-height:1.6; }
    .footer a { color:#138f80 !important; font-weight:800; text-decoration:none; }
    @media(max-width:600px){ .hero,.body,.footer{padding-left:20px;padding-right:20px;} h1{font-size:24px;} .cell{display:block;} .value{text-align:left;padding-top:2px;} }
  </style>
</head>
<body>
  <div class="preheader">${escapeHtml(preheader)}</div>
  <div class="wrap">
    <div class="card">
      <div class="topbar"></div>
      <div class="hero">
        <p class="brand">PLAYMECHI<span>.</span></p>
        <p class="tag">Weekend Cup Season 1: PUBG Mobile, CODM, eFootball, and Free Fire.</p>
      </div>
      <div class="body">${body}</div>
      <div class="footer">
        <p><strong>mechi.club</strong></p>
        <p><a href="${escapeUrl('/weekendcup')}">Weekend Cup</a> &nbsp; | &nbsp; <a href="${escapeUrl('/dashboard')}">Dashboard</a> &nbsp; | &nbsp; <a href="${escapeUrl('/report')}">Support</a></p>
        <p>You are receiving this because your email is linked to a Mechi account. <a href="${escapeHtml(unsubscribeUrl)}">Unsubscribe from updates</a>.</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

function infoRow(label, value) {
  return `<div class="row"><div class="cell label">${escapeHtml(label)}</div><div class="cell value">${escapeHtml(value)}</div></div>`;
}

function buildBlastHtml(recipient) {
  const unsubscribeUrl = buildUnsubscribeUrl(recipient.email);
  const registerUrl = escapeUrl('/weekendcup');
  const body = `
    <p class="kicker">Last chance to register</p>
    <h1>Weekend Cup registration is open again for every game.</h1>
    <p>Hey ${escapeHtml(recipient.username || 'Player')}, PlayMechi Weekend Cup Season 1 registration is open for PUBG Mobile, CODM, eFootball, and Free Fire through the weekend.</p>
    <p><strong>Regular pricing is live now</strong>: PUBG Mobile, CODM, and Free Fire are <strong>KSh 75</strong>. eFootball is <strong>KSh 125</strong>. This is the last chance window before the weekend cup closes.</p>
    <div class="grid">
      ${infoRow('Regular now', 'PUBG/CODM/Free Fire KSh 75, eFootball KSh 125')}
      ${infoRow('Final Rush later', 'PUBG/CODM/Free Fire KSh 100, eFootball KSh 150')}
      ${infoRow('Prize pool', 'Up to KSh 10,500')}
      ${infoRow('Games', 'PUBG Mobile, CODM, eFootball, Free Fire')}
      ${infoRow('Registration window', 'Open through Sunday 31 May 2026')}
      ${infoRow('CODM', 'Saturday 30 May 2026, 8:00 PM EAT')}
      ${infoRow('PUBG Mobile', 'Sunday 31 May 2026, 8:00 PM EAT')}
      ${infoRow('Free Fire', 'Sunday 31 May 2026, 8:00 PM EAT')}
      ${infoRow('eFootball', 'Sunday 31 May 2026, 7:30 PM EAT')}
    </div>
    <p>Pick your game, use the exact in-game name, and pay through Paystack so your slot can be confirmed before match day.</p>
    <a class="btn" href="${registerUrl}">Register for Weekend Cup</a>
    <p class="note">Payment confirms the slot after it clears. Pending registrations are not locked.</p>
  `;

  return baseLayout({
    title: BLAST_SUBJECT,
    preheader: 'All Weekend Cup games are open again. Register and pay to lock your slot.',
    body,
    unsubscribeUrl,
  });
}

function buildReminderHtml(recipient) {
  const unsubscribeUrl = buildUnsubscribeUrl(recipient.email);
  const game = recipient.game || 'codm';
  const gameLabel = GAME_LABELS[game] || 'your game';
  const registerUrl = escapeUrl(`/weekendcup/register?game=${encodeURIComponent(game)}`);
  const paymentUrl = escapeUrl(`/weekendcup/register?game=${encodeURIComponent(game)}`);
  const phase2Fee = PHASE_2_FEES[game] || 75;
  const finalRushFee = FINAL_RUSH_FEES[game] || 100;
  const amountDue = Number.isFinite(Number(recipient.entryFeeKes)) && Number(recipient.entryFeeKes) >= phase2Fee
    ? Number(recipient.entryFeeKes)
    : phase2Fee;

  const body = `
    <p class="kicker">Payment reminder</p>
    <h1>Your ${escapeHtml(gameLabel)} slot is saved, but not locked yet.</h1>
    <p>Hey ${escapeHtml(recipient.username || 'Player')}, your Weekend Cup registration is still waiting for payment confirmation. Finish payment now so your slot can move from pending to confirmed while registration is open again.</p>
    <div class="grid">
      ${infoRow('Game', gameLabel)}
      ${infoRow('Game tag', recipient.inGameUsername || 'Submitted on registration')}
      ${infoRow('Match time', GAME_DATES[game] || '29-31 May 2026')}
      ${infoRow('Amount due', `KSh ${amountDue}`)}
      ${infoRow('Regular price now', `KSh ${phase2Fee}`)}
      ${infoRow('Final Rush later', `KSh ${finalRushFee}`)}
      ${infoRow('Registration window', 'Open through Sunday 31 May 2026')}
      ${infoRow('Payment reference', recipient.paymentReference || 'Open registration to continue')}
    </div>
    <p>If checkout timed out, open your Weekend Cup registration again and continue from there. Your slot is only confirmed after Paystack clears the payment.</p>
    <a class="btn" href="${paymentUrl}">Complete payment</a>
    <p><a href="${registerUrl}" style="color:#138f80;font-weight:900;text-decoration:none;">Open registration details</a></p>
    <p class="note">Do not wait. Complete payment while registration is open again.</p>
  `;

  return baseLayout({
    title: REMINDER_SUBJECT,
    preheader: `Complete your ${gameLabel} payment before Weekend Cup registration closes.`,
    body,
    unsubscribeUrl,
  });
}

function parseArgs(argv) {
  const options = {
    audience: 'both',
    send: false,
    limit: 0,
    skip: 0,
    delayMs: 450,
    only: [],
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--send') options.send = true;
    if (arg === '--dry-run') options.send = false;
    if (arg === '--audience') {
      const next = argv[index + 1];
      if (['all', 'unpaid', 'both'].includes(next)) {
        options.audience = next;
        index += 1;
      }
    }
    if (arg === '--limit') {
      const next = Number.parseInt(argv[index + 1] || '', 10);
      if (Number.isFinite(next) && next > 0) options.limit = next;
      index += 1;
    }
    if (arg === '--skip') {
      const next = Number.parseInt(argv[index + 1] || '', 10);
      if (Number.isFinite(next) && next > 0) options.skip = next;
      index += 1;
    }
    if (arg === '--delay-ms') {
      const next = Number.parseInt(argv[index + 1] || '', 10);
      if (Number.isFinite(next) && next >= 0) options.delayMs = next;
      index += 1;
    }
    if (arg === '--only') {
      options.only = String(argv[index + 1] || '')
        .split(/[,\s;]+/)
        .map(normalizeEmail)
        .filter(Boolean);
      index += 1;
    }
  }

  return options;
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
  }

  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function toAddressArray(value) {
  return (Array.isArray(value) ? value : value ? [value] : [])
    .map((address) => String(address || '').trim())
    .filter(Boolean);
}

function sha256Hex(value) {
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex');
}

function hmac(key, value) {
  return crypto.createHmac('sha256', key).update(value, 'utf8').digest();
}

function hmacHex(key, value) {
  return crypto.createHmac('sha256', key).update(value, 'utf8').digest('hex');
}

function getAwsSignatureKey(secretAccessKey, dateStamp, region) {
  const dateKey = hmac(`AWS4${secretAccessKey}`, dateStamp);
  const regionKey = hmac(dateKey, region);
  const serviceKey = hmac(regionKey, 'ses');
  return hmac(serviceKey, 'aws4_request');
}

function getAmzDate(date) {
  return date.toISOString().replace(/[:-]|\.\d{3}/g, '');
}

function getDateStamp(amzDate) {
  return amzDate.slice(0, 8);
}

function getAwsSesRegion() {
  return (
    process.env.AWS_SES_REGION?.trim() ||
    process.env.AWS_REGION?.trim() ||
    process.env.AWS_DEFAULT_REGION?.trim() ||
    'us-east-2'
  );
}

function getAwsSesCredentials() {
  const accessKeyId = process.env.AWS_SES_ACCESS_KEY_ID?.trim() || process.env.AWS_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.AWS_SES_SECRET_ACCESS_KEY?.trim() || process.env.AWS_SECRET_ACCESS_KEY?.trim();
  const sessionToken = process.env.AWS_SESSION_TOKEN?.trim() || '';

  if (!accessKeyId || !secretAccessKey) {
    throw new Error('AWS SES credentials are required when EMAIL_TRANSPORT=ses.');
  }

  return { accessKeyId, secretAccessKey, sessionToken };
}

function getAwsSesHeaders(headers) {
  return Object.entries(headers ?? {})
    .map(([name, value]) => ({ Name: name, Value: String(value) }))
    .filter((header) => header.Name && header.Value)
    .slice(0, 15);
}

async function sendWithAwsSes(message) {
  const region = getAwsSesRegion();
  const credentials = getAwsSesCredentials();
  const endpoint = new URL(
    process.env.AWS_SES_ENDPOINT_URL?.trim() ||
      `https://email.${region}.amazonaws.com/v2/email/outbound-emails`
  );
  const amzDate = getAmzDate(new Date());
  const dateStamp = getDateStamp(amzDate);
  const headers = getAwsSesHeaders(message.headers);
  const body = JSON.stringify({
    ...(process.env.AWS_SES_CONFIGURATION_SET?.trim()
      ? { ConfigurationSetName: process.env.AWS_SES_CONFIGURATION_SET.trim() }
      : {}),
    FromEmailAddress: message.from,
    Destination: {
      ToAddresses: toAddressArray(message.to),
      ...(message.bcc ? { BccAddresses: toAddressArray(message.bcc) } : {}),
    },
    ...(message.replyTo ? { ReplyToAddresses: toAddressArray(message.replyTo) } : {}),
    Content: {
      Simple: {
        Subject: { Charset: 'UTF-8', Data: message.subject },
        Body: {
          Html: { Charset: 'UTF-8', Data: message.html },
          Text: { Charset: 'UTF-8', Data: message.text ?? htmlToText(message.html) },
        },
        ...(headers.length > 0 ? { Headers: headers } : {}),
      },
    },
  });
  const signedHeaders = credentials.sessionToken
    ? 'content-type;host;x-amz-date;x-amz-security-token'
    : 'content-type;host;x-amz-date';
  const canonicalHeaders = [
    'content-type:application/json',
    `host:${endpoint.host}`,
    `x-amz-date:${amzDate}`,
    ...(credentials.sessionToken ? [`x-amz-security-token:${credentials.sessionToken}`] : []),
    '',
  ].join('\n');
  const canonicalRequest = [
    'POST',
    endpoint.pathname,
    '',
    canonicalHeaders,
    signedHeaders,
    sha256Hex(body),
  ].join('\n');
  const credentialScope = `${dateStamp}/${region}/ses/aws4_request`;
  const signature = hmacHex(
    getAwsSignatureKey(credentials.secretAccessKey, dateStamp, region),
    ['AWS4-HMAC-SHA256', amzDate, credentialScope, sha256Hex(canonicalRequest)].join('\n')
  );
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization:
        `AWS4-HMAC-SHA256 Credential=${credentials.accessKeyId}/${credentialScope}, ` +
        `SignedHeaders=${signedHeaders}, Signature=${signature}`,
      'Content-Type': 'application/json',
      'X-Amz-Date': amzDate,
      ...(credentials.sessionToken ? { 'X-Amz-Security-Token': credentials.sessionToken } : {}),
    },
    body,
  });
  const responseText = await response.text();

  if (!response.ok) {
    throw new Error(`AWS SES email send failed: ${response.status} ${responseText}`);
  }

  const data = responseText ? JSON.parse(responseText) : {};
  return { messageId: data.MessageId ?? null };
}

function getTransport() {
  const preference = process.env.EMAIL_TRANSPORT?.trim().toLowerCase();
  if (preference === 'ses' || preference === 'aws-ses') {
    return {
      async verify() {
        getAwsSesCredentials();
      },
      async sendMail(message) {
        return sendWithAwsSes(message);
      },
      close() {},
    };
  }

  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  const port = Number.parseInt(process.env.SMTP_PORT?.trim() || '587', 10);
  const secureValue = process.env.SMTP_SECURE?.trim().toLowerCase();
  const secure = secureValue ? ['1', 'true', 'yes', 'on'].includes(secureValue) : port === 465;

  if (!host || !user || !pass) {
    throw new Error('SMTP_HOST, SMTP_USER, and SMTP_PASS are required.');
  }

  return nodemailer.createTransport({
    pool: true,
    maxConnections: 1,
    host,
    port,
    secure,
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 25_000,
    auth: { user, pass },
  });
}

async function fetchProfiles(supabase) {
  const recipients = new Map();
  let offset = 0;
  const pageSize = 500;

  while (true) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, email')
      .not('email', 'is', null)
      .order('created_at', { ascending: true })
      .range(offset, offset + pageSize - 1);

    if (error) throw error;
    for (const row of data || []) {
      const email = normalizeEmail(row.email);
      if (!isDeliverableEmail(email)) continue;
      if (!recipients.has(email)) {
        recipients.set(email, {
          userId: row.id,
          username: normalizeText(row.username, 'Player'),
          email,
          normalizedEmail: email,
        });
      }
    }

    if ((data || []).length < pageSize) break;
    offset += pageSize;
  }

  return Array.from(recipients.values());
}

async function fetchUnpaidRegistrations(supabase) {
  const { data, error } = await supabase
    .from('online_tournament_registrations')
    .select('id, user_id, game, in_game_username, email, entry_fee_kes, payment_reference, payment_status, profiles:user_id(username, email)')
    .eq('event_slug', WEEKEND_CUP_SLUG)
    .in('payment_status', ['pending_payment', 'failed', 'manual_review'])
    .order('created_at', { ascending: true });

  if (error) throw error;

  const recipients = new Map();
  for (const row of data || []) {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    const email = normalizeEmail(row.email || profile?.email);
    if (!isDeliverableEmail(email)) continue;
    const key = `${email}:${row.game}`;
    if (!recipients.has(key)) {
      recipients.set(key, {
        registrationId: row.id,
        userId: row.user_id,
        username: normalizeText(profile?.username || row.in_game_username, 'Player'),
        email,
        normalizedEmail: email,
        game: row.game,
        inGameUsername: normalizeText(row.in_game_username, ''),
        entryFeeKes: row.entry_fee_kes,
        paymentReference: normalizeText(row.payment_reference, ''),
        paymentStatus: row.payment_status,
      });
    }
  }

  return Array.from(recipients.values());
}

async function filterUnsubscribed(supabase, recipients) {
  const normalizedEmails = Array.from(new Set(recipients.map((r) => r.normalizedEmail).filter(Boolean)));
  if (normalizedEmails.length === 0) {
    return { optedIn: [], skippedByUnsubscribe: 0 };
  }

  const { data, error } = await supabase
    .from('email_unsubscribes')
    .select('normalized_email')
    .in('normalized_email', normalizedEmails)
    .in('scope', ['broadcast', 'all']);

  if (error) throw error;
  const unsubscribed = new Set((data || []).map((row) => normalizeEmail(row.normalized_email)).filter(Boolean));
  return {
    optedIn: recipients.filter((recipient) => !unsubscribed.has(recipient.normalizedEmail)),
    skippedByUnsubscribe: recipients.filter((recipient) => unsubscribed.has(recipient.normalizedEmail)).length,
  };
}

function applySelection(recipients, options) {
  let selected = recipients;
  if (options.only.length > 0) {
    const only = new Set(options.only);
    selected = selected.filter((recipient) => only.has(recipient.normalizedEmail));
  }
  if (options.skip > 0) selected = selected.slice(options.skip);
  if (options.limit > 0) selected = selected.slice(0, options.limit);
  return selected;
}

function summarizeAudience(name, subject, recipients, skippedByUnsubscribe, options) {
  return {
    name,
    subject,
    recipientCount: recipients.length,
    skippedByUnsubscribe,
    sample: recipients.slice(0, 10).map((recipient) => ({
      email: recipient.email,
      username: recipient.username,
      ...(recipient.game ? { game: recipient.game, paymentStatus: recipient.paymentStatus } : {}),
    })),
    send: options.send,
  };
}

function timestampLabel() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, '0');
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function writeCheckpoint(outputPath, summary) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(summary, null, 2), 'utf8');
}

async function sendAudience({ supabase, transporter, name, subject, recipients, buildHtml, delayMs, summary, outputPath }) {
  for (let index = 0; index < recipients.length; index += 1) {
    const recipient = recipients[index];
    const unsubscribeUrl = buildUnsubscribeUrl(recipient.email);
    let claimed;
    try {
      claimed = await claimDelivery(supabase, { audience: name, subject, recipient });
    } catch (error) {
      summary.failed.push({
        audience: name,
        email: recipient.email,
        username: recipient.username,
        error: error instanceof Error ? error.message : String(error),
      });
      writeCheckpoint(outputPath, summary);
      continue;
    }

    if (!claimed.claimed) {
      summary.skipped.push({
        audience: name,
        email: recipient.email,
        username: recipient.username,
        eventKey: claimed.eventKey,
        reason: 'delivery event already exists',
      });
      writeCheckpoint(outputPath, summary);
      continue;
    }

    try {
      const html = buildHtml(recipient);
      const info = await transporter.sendMail({
        from: FROM,
        to: recipient.email,
        replyTo: REPLY_TO,
        subject,
        html,
        text: htmlToText(html),
        headers: {
          'List-Unsubscribe': `<${unsubscribeUrl}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
          'X-Mechi-Campaign': `${CAMPAIGN_KEY}:${name}`,
        },
      });
      summary.sent.push({
        audience: name,
        email: recipient.email,
        username: recipient.username,
        messageId: info.messageId || null,
        eventKey: claimed.eventKey,
      });
      await markDelivery(
        supabase,
        claimed.eventKey,
        'sent',
        { ...claimed.metadata, sent_at: new Date().toISOString(), message_id: info.messageId || null }
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      summary.failed.push({
        audience: name,
        email: recipient.email,
        username: recipient.username,
        eventKey: claimed.eventKey,
        error: message,
      });
      await markDelivery(
        supabase,
        claimed.eventKey,
        'failed',
        { ...claimed.metadata, failed_at: new Date().toISOString() },
        message
      );
    }

    writeCheckpoint(outputPath, summary);

    if ((index + 1) % 25 === 0 || index === recipients.length - 1) {
      console.log(`[${name}] ${index + 1}/${recipients.length}`);
    }

    if (index < recipients.length - 1 && delayMs > 0) {
      await wait(delayMs);
    }
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const supabase = getSupabase();
  const summary = {
    ok: true,
    campaign: CAMPAIGN_KEY,
    slug: WEEKEND_CUP_SLUG,
    from: FROM,
    replyTo: REPLY_TO,
    send: options.send,
    audiences: [],
    sent: [],
    failed: [],
    skipped: [],
  };

  let allProfiles = [];
  let unpaidRegistrations = [];

  if (options.audience === 'all' || options.audience === 'both') {
    const rawProfiles = await fetchProfiles(supabase);
    const filtered = await filterUnsubscribed(supabase, rawProfiles);
    allProfiles = applySelection(filtered.optedIn, options);
    summary.audiences.push(summarizeAudience('all', BLAST_SUBJECT, allProfiles, filtered.skippedByUnsubscribe, options));
  }

  if (options.audience === 'unpaid' || options.audience === 'both') {
    const rawUnpaid = await fetchUnpaidRegistrations(supabase);
    const filtered = await filterUnsubscribed(supabase, rawUnpaid);
    unpaidRegistrations = applySelection(filtered.optedIn, options);
    summary.audiences.push(summarizeAudience('unpaid', REMINDER_SUBJECT, unpaidRegistrations, filtered.skippedByUnsubscribe, options));
  }

  if (!options.send) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  fs.mkdirSync(RESULTS_DIR, { recursive: true });
  const outputPath = path.join(RESULTS_DIR, `${CAMPAIGN_KEY}-${timestampLabel()}.json`);
  writeCheckpoint(outputPath, summary);
  const transporter = getTransport();
  await transporter.verify();

  if (allProfiles.length > 0) {
    await sendAudience({
      supabase,
      transporter,
      name: 'all',
      subject: BLAST_SUBJECT,
      recipients: allProfiles,
      buildHtml: buildBlastHtml,
      delayMs: options.delayMs,
      summary,
      outputPath,
    });
    writeCheckpoint(outputPath, summary);
  }

  if (unpaidRegistrations.length > 0) {
    await sendAudience({
      supabase,
      transporter,
      name: 'unpaid',
      subject: REMINDER_SUBJECT,
      recipients: unpaidRegistrations,
      buildHtml: buildReminderHtml,
      delayMs: options.delayMs,
      summary,
      outputPath,
    });
    writeCheckpoint(outputPath, summary);
  }

  if (typeof transporter.close === 'function') {
    transporter.close();
  }

  writeCheckpoint(outputPath, summary);
  console.log(JSON.stringify({
    ok: true,
    outputPath,
    sentCount: summary.sent.length,
    failedCount: summary.failed.length,
    skippedCount: summary.skipped.length,
    audiences: summary.audiences.map(({ name, recipientCount }) => ({ name, recipientCount })),
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exit(1);
});
