import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { createHash, createHmac } from 'node:crypto';
import { DEFAULT_RATING } from '@/lib/config';
import { getRankDivision } from '@/lib/gamification';
import { shouldHideOpponentPlatformIds, usesEfootballRoomCodeFlow } from '@/lib/match-room';
import { isMockProviderMode, shouldCaptureProviderTranscripts } from '@/lib/provider-mode';
import { captureProviderTranscript } from '@/lib/provider-transcript';
import { formatTournamentDateTime, getTournamentCheckInDate } from '@/lib/tournament-schedule';
import { APP_URL } from '@/lib/urls';
import type { GameKey, PlatformKey } from '@/types';

type EmailPayload = {
  from: string;
  to: string | string[];
  bcc?: string | string[];
  replyTo?: string | string[];
  subject: string;
  html: string;
  text?: string;
  headers?: Record<string, string>;
};

type AwsSesCredentials = {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
  expiration?: number;
};

const FROM_ADDRESS =
  process.env.AWS_SES_FROM_EMAIL ?? process.env.EMAIL_FROM_ADDRESS ?? 'noreply@mechi.club';
const FROM = `Mechi <${FROM_ADDRESS}>`;
const SUPPORT_ADDRESS = 'support@mechi.club';
let cachedInstanceCredentials: AwsSesCredentials | null = null;
let cachedSharedCredentials: AwsSesCredentials | null | undefined;

function getAwsSesRegion() {
  return (
    process.env.AWS_SES_REGION?.trim() ||
    process.env.AWS_REGION?.trim() ||
    process.env.AWS_DEFAULT_REGION?.trim() ||
    getSharedAwsRegion() ||
    'us-east-2'
  );
}

function getAwsSesAccessKeyId() {
  return process.env.AWS_SES_ACCESS_KEY_ID?.trim() || process.env.AWS_ACCESS_KEY_ID?.trim() || '';
}

function getAwsSesSecretAccessKey() {
  return process.env.AWS_SES_SECRET_ACCESS_KEY?.trim() || process.env.AWS_SECRET_ACCESS_KEY?.trim() || '';
}

function getAwsSesSessionToken() {
  return process.env.AWS_SESSION_TOKEN?.trim() || '';
}

function shouldUseInstanceRoleCredentials() {
  return process.env.AWS_SES_USE_INSTANCE_ROLE === 'true';
}

function getAwsProfileName() {
  return process.env.AWS_PROFILE?.trim() || 'default';
}

function parseAwsIni(content: string): Record<string, Record<string, string>> {
  const sections: Record<string, Record<string, string>> = {};
  let currentSection: string | null = null;

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || line.startsWith(';')) {
      continue;
    }

    const sectionMatch = line.match(/^\[([^\]]+)\]$/);
    if (sectionMatch) {
      currentSection = sectionMatch[1].trim();
      sections[currentSection] ??= {};
      continue;
    }

    const separatorIndex = line.indexOf('=');
    if (!currentSection || separatorIndex < 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    sections[currentSection][key] = value;
  }

  return sections;
}

function getSharedAwsCredentials(): AwsSesCredentials | null {
  if (cachedSharedCredentials !== undefined) {
    return cachedSharedCredentials;
  }

  const credentialsPath =
    process.env.AWS_SHARED_CREDENTIALS_FILE?.trim() || join(homedir(), '.aws', 'credentials');
  if (!existsSync(credentialsPath)) {
    cachedSharedCredentials = null;
    return cachedSharedCredentials;
  }

  const profile = getAwsProfileName();
  const sections = parseAwsIni(readFileSync(credentialsPath, 'utf8'));
  const credentials = sections[profile];
  const accessKeyId = credentials?.aws_access_key_id?.trim();
  const secretAccessKey = credentials?.aws_secret_access_key?.trim();

  cachedSharedCredentials =
    accessKeyId && secretAccessKey
      ? {
          accessKeyId,
          secretAccessKey,
          sessionToken: credentials.aws_session_token?.trim() || undefined,
        }
      : null;

  return cachedSharedCredentials;
}

function getSharedAwsRegion() {
  const configPath = process.env.AWS_CONFIG_FILE?.trim() || join(homedir(), '.aws', 'config');
  if (!existsSync(configPath)) {
    return null;
  }

  const profile = getAwsProfileName();
  const sections = parseAwsIni(readFileSync(configPath, 'utf8'));
  return sections[`profile ${profile}`]?.region?.trim() || sections[profile]?.region?.trim() || null;
}

export function isTransactionalEmailReady(): boolean {
  if (isMockProviderMode()) {
    return true;
  }

  return Boolean(
    FROM_ADDRESS &&
      ((getAwsSesAccessKeyId() && getAwsSesSecretAccessKey()) ||
        getSharedAwsCredentials() ||
        shouldUseInstanceRoleCredentials())
  );
}

async function sendEmail(
  payload: EmailPayload,
  options: { requireConfigured?: boolean } = {}
): Promise<void> {
  if (isMockProviderMode()) {
    await captureProviderTranscript({
      provider: 'email',
      operation: 'send',
      request: payload,
      response: {
        mocked: true,
        subject: payload.subject,
        to: payload.to,
      },
    });
    return;
  }

  if (!isTransactionalEmailReady()) {
    console.warn('[Email] Send skipped - AWS SES credentials are not configured');
    if (shouldCaptureProviderTranscripts()) {
      await captureProviderTranscript({
        provider: 'email',
        operation: 'send',
        request: payload,
        error: 'AWS SES credentials are not configured',
      });
    }
    if (options.requireConfigured) {
      throw new Error('AWS SES credentials are not configured');
    }
    return;
  }

  const response = await sendEmailWithAwsSes(payload);
  console.info('[Email] AWS SES accepted email', { id: response.messageId });

  if (shouldCaptureProviderTranscripts()) {
    await captureProviderTranscript({
      provider: 'email',
      operation: 'send',
      request: payload,
      response,
    });
  }
}

async function sendBccEmail(params: {
  bcc: string[];
  subject: string;
  title: string;
  content: string;
  unsubscribeUrl?: string | null;
}): Promise<void> {
  const recipients = params.bcc.map((email) => email.trim()).filter(Boolean);
  if (recipients.length === 0) {
    return;
  }

  try {
    const singleRecipient = recipients.length === 1 ? recipients[0] : null;
    const unsubscribeUrl = params.unsubscribeUrl ? escapeUrl(params.unsubscribeUrl) : null;
    const unsubscribeContent = unsubscribeUrl
      ? `
        <p class="note">You received this because this game is selected on your Mechi profile.</p>
        <p><a href="${unsubscribeUrl}" class="secondary-link">Unsubscribe from game update emails</a></p>
      `
      : '';
    await sendEmail({
      from: FROM,
      to: singleRecipient ?? FROM_ADDRESS,
      ...(singleRecipient ? {} : { bcc: recipients }),
      subject: params.subject,
      html: baseLayout(params.title, `${params.content}${unsubscribeContent}`),
      ...(params.unsubscribeUrl
        ? {
            headers: {
              'List-Unsubscribe': `<${params.unsubscribeUrl}>`,
              'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
            },
          }
        : {}),
    });
  } catch (err) {
    console.error(`[Email] ${params.title} broadcast send error:`, err);
  }
}

function toAddressArray(value: string | string[] | null | undefined): string[] {
  return (Array.isArray(value) ? value : value ? [value] : [])
    .map((address) => address.trim())
    .filter(Boolean);
}

function htmlToText(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
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

function sha256Hex(value: string) {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function hmac(key: Buffer | string, value: string) {
  return createHmac('sha256', key).update(value, 'utf8').digest();
}

function hmacHex(key: Buffer | string, value: string) {
  return createHmac('sha256', key).update(value, 'utf8').digest('hex');
}

function getAwsSignatureKey(secretAccessKey: string, dateStamp: string, region: string) {
  const dateKey = hmac(`AWS4${secretAccessKey}`, dateStamp);
  const regionKey = hmac(dateKey, region);
  const serviceKey = hmac(regionKey, 'ses');
  return hmac(serviceKey, 'aws4_request');
}

function getAmzDate(date: Date) {
  return date.toISOString().replace(/[:-]|\.\d{3}/g, '');
}

function getDateStamp(amzDate: string) {
  return amzDate.slice(0, 8);
}

function getAwsSesHeaders(headers: Record<string, string> | undefined) {
  return Object.entries(headers ?? {})
    .map(([name, value]) => ({ Name: name, Value: value }))
    .filter((header) => header.Name && header.Value)
    .slice(0, 15);
}

async function fetchWithTimeout(url: string, init: RequestInit = {}, timeoutMs = 1200) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

async function resolveAwsSesCredentials(): Promise<AwsSesCredentials> {
  const envAccessKeyId = getAwsSesAccessKeyId();
  const envSecretAccessKey = getAwsSesSecretAccessKey();
  const envSessionToken = getAwsSesSessionToken();

  if (envAccessKeyId && envSecretAccessKey) {
    return {
      accessKeyId: envAccessKeyId,
      secretAccessKey: envSecretAccessKey,
      sessionToken: envSessionToken || undefined,
    };
  }

  const sharedCredentials = getSharedAwsCredentials();
  if (sharedCredentials) {
    return sharedCredentials;
  }

  if (!shouldUseInstanceRoleCredentials()) {
    throw new Error('AWS SES credentials are not configured');
  }

  if (
    cachedInstanceCredentials?.expiration &&
    cachedInstanceCredentials.expiration - Date.now() > 5 * 60 * 1000
  ) {
    return cachedInstanceCredentials;
  }

  const tokenResponse = await fetchWithTimeout('http://169.254.169.254/latest/api/token', {
    method: 'PUT',
    headers: {
      'X-aws-ec2-metadata-token-ttl-seconds': '21600',
    },
  });

  if (!tokenResponse.ok) {
    throw new Error(`Could not load EC2 metadata token: ${tokenResponse.status}`);
  }

  const metadataToken = await tokenResponse.text();
  const roleResponse = await fetchWithTimeout(
    'http://169.254.169.254/latest/meta-data/iam/security-credentials/',
    {
      headers: {
        'X-aws-ec2-metadata-token': metadataToken,
      },
    }
  );

  if (!roleResponse.ok) {
    throw new Error(`Could not load EC2 IAM role name: ${roleResponse.status}`);
  }

  const roleName = (await roleResponse.text()).split('\n')[0]?.trim();
  if (!roleName) {
    throw new Error('No EC2 IAM role is attached to this instance');
  }

  const credentialsResponse = await fetchWithTimeout(
    `http://169.254.169.254/latest/meta-data/iam/security-credentials/${encodeURIComponent(roleName)}`,
    {
      headers: {
        'X-aws-ec2-metadata-token': metadataToken,
      },
    }
  );

  if (!credentialsResponse.ok) {
    throw new Error(`Could not load EC2 IAM role credentials: ${credentialsResponse.status}`);
  }

  const data = (await credentialsResponse.json()) as {
    AccessKeyId?: string;
    SecretAccessKey?: string;
    Token?: string;
    Expiration?: string;
  };

  if (!data.AccessKeyId || !data.SecretAccessKey || !data.Token) {
    throw new Error('EC2 IAM role credentials were incomplete');
  }

  cachedInstanceCredentials = {
    accessKeyId: data.AccessKeyId,
    secretAccessKey: data.SecretAccessKey,
    sessionToken: data.Token,
    expiration: data.Expiration ? new Date(data.Expiration).getTime() : Date.now() + 30 * 60 * 1000,
  };

  return cachedInstanceCredentials;
}

async function sendEmailWithAwsSes(payload: EmailPayload): Promise<{ messageId: string | null }> {
  const region = getAwsSesRegion();
  const credentials = await resolveAwsSesCredentials();
  const endpoint = new URL(
    process.env.AWS_SES_ENDPOINT_URL?.trim() ||
      `https://email.${region}.amazonaws.com/v2/email/outbound-emails`
  );
  const amzDate = getAmzDate(new Date());
  const dateStamp = getDateStamp(amzDate);
  const toAddresses = toAddressArray(payload.to);
  const bccAddresses = toAddressArray(payload.bcc);
  const replyToAddresses = toAddressArray(payload.replyTo);
  const customHeaders = getAwsSesHeaders(payload.headers);
  const body = JSON.stringify({
    ...(process.env.AWS_SES_CONFIGURATION_SET?.trim()
      ? { ConfigurationSetName: process.env.AWS_SES_CONFIGURATION_SET.trim() }
      : {}),
    ...(process.env.AWS_SES_FEEDBACK_EMAIL?.trim()
      ? { FeedbackForwardingEmailAddress: process.env.AWS_SES_FEEDBACK_EMAIL.trim() }
      : {}),
    FromEmailAddress: payload.from,
    Destination: {
      ToAddresses: toAddresses,
      ...(bccAddresses.length > 0 ? { BccAddresses: bccAddresses } : {}),
    },
    ...(replyToAddresses.length > 0 ? { ReplyToAddresses: replyToAddresses } : {}),
    Content: {
      Simple: {
        Subject: {
          Charset: 'UTF-8',
          Data: payload.subject,
        },
        Body: {
          Html: {
            Charset: 'UTF-8',
            Data: payload.html,
          },
          Text: {
            Charset: 'UTF-8',
            Data: payload.text ?? htmlToText(payload.html),
          },
        },
        ...(customHeaders.length > 0 ? { Headers: customHeaders } : {}),
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
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join('\n');
  const signature = hmacHex(
    getAwsSignatureKey(credentials.secretAccessKey, dateStamp, region),
    stringToSign
  );
  const authorizationHeader =
    `AWS4-HMAC-SHA256 Credential=${credentials.accessKeyId}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: authorizationHeader,
      'Content-Type': 'application/json',
      'X-Amz-Date': amzDate,
      ...(credentials.sessionToken ? { 'X-Amz-Security-Token': credentials.sessionToken } : {}),
    },
    body,
  });
  const responseText = await response.text();

  if (!response.ok) {
    console.error('[Email] AWS SES send error:', response.status, responseText);
    throw new Error(`AWS SES email send failed: ${response.status} ${responseText}`);
  }

  const data = responseText ? (JSON.parse(responseText) as { MessageId?: string }) : {};
  return { messageId: data.MessageId ?? null };
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeUrl(value: unknown): string {
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

function plainTextToHtml(value: string): string {
  return value
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br />')}</p>`)
    .join('');
}

function formatEatDateTimeLabel(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) {
    return 'TBA';
  }

  return new Intl.DateTimeFormat('en-KE', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Africa/Nairobi',
  }).format(date);
}

function statusLabel(value: string): string {
  return value
    .split(/[_-]+/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function baseLayout(title: string, content: string): string {
  const escapedTitle = escapeHtml(title);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light only" />
  <meta name="supported-color-schemes" content="light only" />
  <title>${escapedTitle}</title>
  <style>
    body { margin: 0; padding: 0; background: #e9f0f7; font-family: Arial, Helvetica, sans-serif; color: #111827; }
    table { border-collapse: collapse; }
    a { color: inherit; }
    .preheader { display: none !important; max-height: 0; max-width: 0; opacity: 0; overflow: hidden; visibility: hidden; }
    .wrapper { width: 100%; background: #e9f0f7; padding: 32px 12px; }
    .shell { width: 100%; max-width: 680px; margin: 0 auto; }
    .card { background: #ffffff; border: 1px solid #d6e0ea; border-radius: 22px; overflow: hidden; box-shadow: 0 22px 50px rgba(15, 23, 42, 0.12); }
    .topline { height: 6px; background: linear-gradient(90deg, #ff6b4a 0%, #34d399 48%, #38bdf8 100%); }
    .header { background: #0b1121; padding: 30px 30px 28px; }
    .brand-row { width: 100%; }
    .brand { color: #ffffff; font-size: 28px; font-weight: 900; margin: 0; line-height: 1; }
    .brand-mark { color: #ff6b4a; }
    .eyebrow { color: #a7f3d0; font-size: 11px; font-weight: 800; margin: 0; letter-spacing: 0.12em; text-transform: uppercase; text-align: right; }
    .tagline { color: #cbd5e1; margin: 16px 0 0; font-size: 14px; line-height: 1.6; max-width: 500px; }
    .body { padding: 34px 30px 30px; }
    .body h2 { color: #0f172a; margin: 0 0 12px; font-size: 26px; font-weight: 900; line-height: 1.18; }
    .body p { color: #475569; line-height: 1.72; margin: 0 0 16px; font-size: 15px; }
    .body strong { color: #0f172a; }
    .info-box { background: #f8fafc; border: 1px solid #dbe5ef; border-radius: 16px; padding: 4px 18px; margin: 24px 0; }
    .info-row { display: table; width: 100%; padding: 13px 0; border-bottom: 1px solid #e2e8f0; }
    .info-row:last-child { border-bottom: none; }
    .info-label { display: table-cell; color: #64748b; font-size: 13px; line-height: 1.45; padding-right: 16px; vertical-align: top; }
    .info-value { display: table-cell; color: #0f172a; font-size: 13px; font-weight: 800; line-height: 1.45; text-align: right; vertical-align: top; }
    .note { background: #fff7ed; border: 1px solid #fed7aa; border-radius: 14px; color: #7c2d12; font-size: 13px; line-height: 1.65; margin: 20px 0; padding: 14px 16px; }
    .mini-grid { width: 100%; margin: 20px 0 4px; }
    .mini-cell { background: #f1f5f9; border: 1px solid #dbe5ef; border-radius: 14px; padding: 14px; }
    .mini-label { color: #64748b; display: block; font-size: 11px; font-weight: 800; letter-spacing: 0.08em; line-height: 1.2; text-transform: uppercase; }
    .mini-value { color: #0f172a; display: block; font-size: 16px; font-weight: 900; line-height: 1.35; margin-top: 5px; }
    .btn { display: inline-block; background: #ff5a3d; color: #ffffff !important; text-decoration: none; padding: 14px 24px; border-radius: 12px; font-weight: 900; font-size: 14px; margin-top: 8px; }
    .secondary-link { color: #0f766e !important; font-size: 13px; font-weight: 800; text-decoration: none; }
    .footer { padding: 24px 30px 30px; border-top: 1px solid #e2e8f0; background: #fbfdff; }
    .footer p { color: #64748b; font-size: 12px; margin: 0 0 6px; line-height: 1.6; }
    .badge { display: inline-block; padding: 5px 11px; border-radius: 999px; font-size: 11px; font-weight: 900; letter-spacing: 0.04em; text-transform: uppercase; }
    .badge-win { background: #dcfce7; color: #166534; }
    .badge-loss { background: #fee2e2; color: #991b1b; }
    .badge-red { background: #fee2e2; color: #991b1b; }
    .badge-blue { background: #dbeafe; color: #1d4ed8; }
    .badge-green { background: #dcfce7; color: #166534; }
    @media only screen and (max-width: 520px) {
      .wrapper { padding: 18px 8px; }
      .header, .body, .footer { padding-left: 20px; padding-right: 20px; }
      .body h2 { font-size: 23px; }
      .eyebrow { text-align: left; padding-top: 12px; }
      .info-label, .info-value { display: block; text-align: left; padding-right: 0; }
      .info-value { padding-top: 4px; }
    }
  </style>
</head>
<body>
  <div class="preheader">${escapedTitle}</div>
  <table role="presentation" class="wrapper" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center">
        <table role="presentation" class="shell" cellpadding="0" cellspacing="0">
          <tr>
            <td class="card">
              <div class="topline"></div>
              <div class="header">
                <table role="presentation" class="brand-row" cellpadding="0" cellspacing="0">
                  <tr>
                    <td>
                      <p class="brand">MECHI<span class="brand-mark">.</span></p>
                    </td>
                    <td align="right">
                      <p class="eyebrow">Kenya gaming ops</p>
                    </td>
                  </tr>
                </table>
                <p class="tagline">Matchmaking, tournaments, rewards, and player support built for competitive Kenyan gamers.</p>
              </div>
              <div class="body">
                ${content}
              </div>
              <div class="footer">
                <p><strong>mechi.club</strong></p>
                <p>You are receiving this because your email is linked to a Mechi account or tournament registration.</p>
                <p>Need help? Reply here or contact ${SUPPORT_ADDRESS}.</p>
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

export async function sendWelcomeEmail(params: {
  to: string;
  username: string;
}): Promise<void> {
  const starterRank = getRankDivision(DEFAULT_RATING);
  const username = escapeHtml(params.username);
  const dashboardUrl = escapeUrl(`${APP_URL}/dashboard`);
  const content = `
    <h2>Registration confirmed</h2>
    <p>Hey ${username}, your Mechi profile is live and your starter Pro trial is ready. Pick your focus games, lock in your IDs, and start climbing through clean competitive matches.</p>
    <div class="info-box">
      <div class="info-row">
        <span class="info-label">Starting Rank</span>
        <span class="info-value">${escapeHtml(starterRank.label)}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Level</span>
        <span class="info-value">Lv. 1</span>
      </div>
      <div class="info-row">
        <span class="info-label">Trial</span>
        <span class="info-value">1-month Pro trial</span>
      </div>
      <div class="info-row">
        <span class="info-label">Platform</span>
        <span class="info-value">mechi.club</span>
      </div>
    </div>
    <p>Head to your dashboard, finish setup, and get into your first queue when you are ready.</p>
    <a href="${dashboardUrl}" class="btn">Open Dashboard</a>
  `;

  try {
    await sendEmail({
      from: FROM,
      to: params.to,
      subject: `Registration confirmed: welcome to Mechi, ${params.username}`,
      html: baseLayout(`Registration confirmed: welcome to Mechi, ${params.username}`, content),
    });
  } catch (err) {
    console.error('[Email] Welcome send error:', err);
  }
}

export async function sendMagicLinkEmail(params: {
  to: string;
  username?: string | null;
  magicLink: string;
  expiresInMinutes: number;
}): Promise<void> {
  const recipientName = escapeHtml(params.username?.trim() || 'there');
  const requestedEmail = escapeHtml(params.to);
  const magicLink = escapeUrl(params.magicLink);
  const content = `
    <h2>Sign in to Mechi</h2>
    <p>Hey ${recipientName}, use this secure link to open your account without typing your password.</p>
    <div class="info-box">
      <div class="info-row">
        <span class="info-label">Link expires in</span>
        <span class="info-value">${params.expiresInMinutes} minutes</span>
      </div>
      <div class="info-row">
        <span class="info-label">Requested for</span>
        <span class="info-value">${requestedEmail}</span>
      </div>
    </div>
    <p>If you did not request this, you can ignore the email. Your password stays unchanged.</p>
    <a href="${magicLink}" class="btn">Sign in to Mechi</a>
  `;

  try {
    await sendEmail({
      from: FROM,
      to: params.to,
      subject: 'Your Mechi sign-in link',
      html: baseLayout('Sign in to Mechi', content),
    }, { requireConfigured: true });
  } catch (err) {
    console.error('[Email] Magic link send error:', err);
    throw err;
  }
}

export async function sendPasswordResetEmail(params: {
  to: string;
  username?: string | null;
  resetLink: string;
  expiresInMinutes: number;
}): Promise<void> {
  const recipientName = escapeHtml(params.username?.trim() || 'there');
  const requestedEmail = escapeHtml(params.to);
  const resetLink = escapeUrl(params.resetLink);
  const content = `
    <h2>Reset your password</h2>
    <p>Hey ${recipientName}, use this secure link to set a new password for your Mechi account.</p>
    <div class="info-box">
      <div class="info-row">
        <span class="info-label">Link expires in</span>
        <span class="info-value">${params.expiresInMinutes} minutes</span>
      </div>
      <div class="info-row">
        <span class="info-label">Requested for</span>
        <span class="info-value">${requestedEmail}</span>
      </div>
    </div>
    <p>If you did not request this, you can ignore the email and keep your current password.</p>
    <a href="${resetLink}" class="btn">Reset password</a>
  `;

  try {
    await sendEmail({
      from: FROM,
      to: params.to,
      subject: 'Reset your Mechi password',
      html: baseLayout('Reset your Mechi password', content),
    }, { requireConfigured: true });
  } catch (err) {
    console.error('[Email] Password reset send error:', err);
    throw err;
  }
}

export async function sendUserDataDeletionSupportEmail(params: {
  requestId: string;
  username: string;
  email: string | null;
  phone: string | null;
  normalizedPhoneHint?: string | null;
  note?: string | null;
  submittedAtIso: string;
  ipAddress: string;
  userAgent: string;
}): Promise<void> {
  const noteBlock = params.note
    ? `
      <div class="info-row">
        <span class="info-label">Extra note</span>
        <span class="info-value">${params.note}</span>
      </div>
    `
    : '';
  const normalizedPhoneBlock = params.normalizedPhoneHint
    ? `
      <div class="info-row">
        <span class="info-label">Normalized phone hint</span>
        <span class="info-value">${params.normalizedPhoneHint}</span>
      </div>
    `
    : '';
  const content = `
    <h2>User data deletion request</h2>
    <p>A new Mechi account deletion request was submitted from the public deletion page.</p>
    <div class="info-box">
      <div class="info-row">
        <span class="info-label">Request ID</span>
        <span class="info-value">${params.requestId}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Username</span>
        <span class="info-value">${params.username}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Email</span>
        <span class="info-value">${params.email ?? 'Not provided'}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Phone</span>
        <span class="info-value">${params.phone ?? 'Not provided'}</span>
      </div>
      ${normalizedPhoneBlock}
      ${noteBlock}
      <div class="info-row">
        <span class="info-label">Submitted at</span>
        <span class="info-value">${params.submittedAtIso}</span>
      </div>
      <div class="info-row">
        <span class="info-label">IP address</span>
        <span class="info-value">${params.ipAddress}</span>
      </div>
    </div>
    <p>User agent: ${params.userAgent}</p>
    <p>Review the account, confirm ownership if needed, and continue the deletion workflow from support.</p>
  `;

  try {
    await sendEmail({
      from: FROM,
      to: SUPPORT_ADDRESS,
      replyTo: params.email ?? undefined,
      subject: `User Data Deletion Request ${params.requestId}`,
      html: baseLayout(`User Data Deletion Request ${params.requestId}`, content),
    });
  } catch (err) {
    console.error('[Email] User data deletion support send error:', err);
    throw err;
  }
}

export async function sendUserDataDeletionConfirmationEmail(params: {
  requestId: string;
  to: string;
  username: string;
}): Promise<void> {
  const content = `
    <h2>Deletion request received</h2>
    <p>Hey ${params.username}, we received your request to review your Mechi account for deletion.</p>
    <div class="info-box">
      <div class="info-row">
        <span class="info-label">Request ID</span>
        <span class="info-value">${params.requestId}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Support page</span>
        <span class="info-value">${APP_URL}/user-data-deletion</span>
      </div>
    </div>
    <p>We may reply to verify ownership before the deletion is completed. Some billing, fraud, moderation, or dispute records may still be retained where required.</p>
    <a href="${APP_URL}/user-data-deletion" class="btn">View deletion page</a>
  `;

  try {
    await sendEmail({
      from: FROM,
      to: params.to,
      subject: `We received your Mechi deletion request (${params.requestId})`,
      html: baseLayout(`We received your Mechi deletion request (${params.requestId})`, content),
    });
  } catch (err) {
    console.error('[Email] User data deletion confirmation send error:', err);
    throw err;
  }
}

export async function sendMatchFoundEmail(params: {
  to: string;
  username: string;
  opponentUsername: string;
  game: string;
  gameKey?: GameKey;
  platform: string;
  platformKey?: PlatformKey | null;
  opponentPlatformId: string;
  matchId: string;
}): Promise<void> {
  const usesRoomCodeFlow = params.gameKey ? usesEfootballRoomCodeFlow(params.gameKey) : false;
  const hideOpponentPlatformId =
    params.gameKey && params.platformKey
      ? shouldHideOpponentPlatformIds(params.gameKey, params.platformKey)
      : false;
  const opponentIdBlock = hideOpponentPlatformId
    ? ''
    : `
      <div class="info-row">
        <span class="info-label">Opponent ID</span>
        <span class="info-value">${params.opponentPlatformId}</span>
      </div>
    `;
  const coordinationCopy = usesRoomCodeFlow
    ? '<p>eFootball matches start in a private room. Open the match page to see who should create the room and share the invite code.</p>'
    : '<p>Use the match page to coordinate, report the result, and keep the ladder moving.</p>';
  const content = `
    <h2>Match found</h2>
    <p>Your next Mechi match is ready. Open the match room, connect with your opponent, and finish cleanly so both profiles stay accurate.</p>
    <div class="info-box">
      <div class="info-row">
        <span class="info-label">Game</span>
        <span class="info-value">${params.game}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Opponent</span>
        <span class="info-value">${params.opponentUsername}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Platform</span>
        <span class="info-value">${params.platform}</span>
      </div>
      ${opponentIdBlock}
    </div>
    ${coordinationCopy}
    <a href="${APP_URL}/match/${params.matchId}" class="btn">View Match</a>
  `;

  try {
    await sendEmail({
      from: FROM,
      to: params.to,
      subject: `Match found! You vs ${params.opponentUsername}`,
      html: baseLayout('Match Found', content),
    });
  } catch (err) {
    console.error('[Email] Match found send error:', err);
  }
}

export async function sendResultConfirmedEmail(params: {
  to: string;
  username: string;
  opponentUsername: string;
  game: string;
  won: boolean;
  rankLabel: string;
  level: number;
}): Promise<void> {
  const content = `
    <h2>${params.won ? 'Victory confirmed' : 'Match complete'}</h2>
    <p>Your match against <strong>${params.opponentUsername}</strong> is locked in. Your Mechi climb has been updated.</p>
    <div class="info-box">
      <div class="info-row">
        <span class="info-label">Game</span>
        <span class="info-value">${params.game}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Result</span>
        <span class="info-value">
          <span class="badge ${params.won ? 'badge-win' : 'badge-loss'}">${params.won ? 'Win' : 'Loss'}</span>
        </span>
      </div>
      <div class="info-row">
        <span class="info-label">Current Rank</span>
        <span class="info-value">${params.rankLabel}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Level</span>
        <span class="info-value">Lv. ${params.level}</span>
      </div>
    </div>
    <a href="${APP_URL}/dashboard" class="btn">Play Again</a>
  `;

  try {
    await sendEmail({
      from: FROM,
      to: params.to,
      subject: `Match result: ${params.won ? 'You won!' : 'Match complete'} / ${params.rankLabel}`,
      html: baseLayout('Match Result', content),
    });
  } catch (err) {
    console.error('[Email] Result confirmed send error:', err);
  }
}

export async function sendMatchDisputeEmail(params: {
  to: string;
  username: string;
  opponentUsername: string;
  game: string;
  matchId: string;
}): Promise<void> {
  const content = `
    <h2>Match disputed</h2>
    <p>Your match against <strong>${params.opponentUsername}</strong> in <strong>${params.game}</strong> has been disputed.</p>
    <p>Upload a screenshot of the result on the match page so the result can be resolved cleanly.</p>
    <div class="info-box">
      <div class="info-row">
        <span class="info-label">Game</span>
        <span class="info-value">${params.game}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Opponent</span>
        <span class="info-value">${params.opponentUsername}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Status</span>
        <span class="info-value"><span class="badge badge-red">Disputed</span></span>
      </div>
    </div>
    <a href="${APP_URL}/match/${params.matchId}" class="btn">Upload Screenshot</a>
  `;

  try {
    await sendEmail({
      from: FROM,
      to: params.to,
      subject: 'Match disputed - upload screenshot to resolve',
      html: baseLayout('Match Disputed', content),
    });
  } catch (err) {
    console.error('[Email] Dispute send error:', err);
  }
}

export async function sendChallengeReceivedEmail(params: {
  to: string;
  username: string;
  challengerUsername: string;
  game: string;
  platform: string;
  challengeUrl: string;
  message?: string | null;
}): Promise<void> {
  const username = escapeHtml(params.username);
  const challengerUsername = escapeHtml(params.challengerUsername);
  const game = escapeHtml(params.game);
  const platform = escapeHtml(params.platform);
  const challengeUrl = escapeUrl(params.challengeUrl);
  const messageBlock = params.message
    ? `
      <div class="info-row">
        <span class="info-label">Message</span>
        <span class="info-value">${escapeHtml(params.message)}</span>
      </div>
    `
    : '';

  const content = `
    <h2>Direct challenge received</h2>
    <p>Hey ${username}, ${challengerUsername} wants to run a direct match with you on Mechi.</p>
    <div class="info-box">
      <div class="info-row">
        <span class="info-label">Game</span>
        <span class="info-value">${game}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Platform</span>
        <span class="info-value">${platform}</span>
      </div>
      ${messageBlock}
    </div>
    <p>Open your notifications to accept, decline, or keep the challenge moving.</p>
    <a href="${challengeUrl}" class="btn">Review Challenge</a>
  `;

  try {
    await sendEmail({
      from: FROM,
      to: params.to,
      subject: `${params.challengerUsername} challenged you on Mechi`,
      html: baseLayout('Challenge Received', content),
    });
  } catch (err) {
    console.error('[Email] Challenge received send error:', err);
  }
}

export async function sendQueueBroadcastEmail(params: {
  bcc: string[];
  username: string;
  game: string;
  platform: string;
  queueWindowMinutes: number;
  queueUrl: string;
  unsubscribeUrl?: string | null;
}): Promise<void> {
  const username = escapeHtml(params.username);
  const game = escapeHtml(params.game);
  const platform = escapeHtml(params.platform);
  const queueUrl = escapeUrl(params.queueUrl);
  const content = `
    <h2>Fresh queue run available</h2>
    <p>${username} just joined the ${game} queue on ${platform}.</p>
    <div class="info-box">
      <div class="info-row">
        <span class="info-label">Game</span>
        <span class="info-value">${game}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Platform</span>
        <span class="info-value">${platform}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Queue window</span>
        <span class="info-value">Up to ${escapeHtml(params.queueWindowMinutes)} minutes</span>
      </div>
    </div>
    <p>If you are ready to play now, join the queue before the current window closes.</p>
    <a href="${queueUrl}" class="btn">Open Queue</a>
  `;

  await sendBccEmail({
    bcc: params.bcc,
    subject: `${params.game}: a player is waiting right now`,
    title: 'Queue Opportunity',
    content,
    unsubscribeUrl: params.unsubscribeUrl,
  });
}

export async function sendLobbyBroadcastEmail(params: {
  bcc: string[];
  hostName: string;
  game: string;
  lobbyTitle: string;
  mode: string;
  mapName?: string | null;
  scheduledFor?: string | null;
  lobbyUrl: string;
  unsubscribeUrl?: string | null;
}): Promise<void> {
  const scheduledCopy = params.scheduledFor
    ? new Date(params.scheduledFor).toLocaleString('en-KE', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : 'ASAP';
  const mapBlock = params.mapName
    ? `
      <div class="info-row">
        <span class="info-label">Map</span>
        <span class="info-value">${escapeHtml(params.mapName)}</span>
      </div>
    `
    : '';
  const hostName = escapeHtml(params.hostName);
  const game = escapeHtml(params.game);
  const lobbyTitle = escapeHtml(params.lobbyTitle);
  const mode = escapeHtml(params.mode);
  const lobbyUrl = escapeUrl(params.lobbyUrl);

  const content = `
    <h2>New lobby is open</h2>
    <p>${hostName} opened a new ${game} lobby on Mechi.</p>
    <div class="info-box">
      <div class="info-row">
        <span class="info-label">Lobby</span>
        <span class="info-value">${lobbyTitle}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Mode</span>
        <span class="info-value">${mode}</span>
      </div>
      ${mapBlock}
      <div class="info-row">
        <span class="info-label">Starts</span>
        <span class="info-value">${escapeHtml(scheduledCopy)}</span>
      </div>
    </div>
    <p>Join the room early so the host knows the slot is taken.</p>
    <a href="${lobbyUrl}" class="btn">View Lobby</a>
  `;

  await sendBccEmail({
    bcc: params.bcc,
    subject: `${params.game}: ${params.lobbyTitle} is now open`,
    title: 'Lobby Open',
    content,
    unsubscribeUrl: params.unsubscribeUrl,
  });
}

export async function sendTournamentBroadcastEmail(params: {
  bcc: string[];
  organizerName: string;
  tournamentTitle: string;
  game: string;
  platform?: string | null;
  entryFee: number;
  size: number;
  region: string;
  scheduledFor?: string | null;
  tournamentUrl: string;
  unsubscribeUrl?: string | null;
}): Promise<void> {
  const platformBlock = params.platform
    ? `
      <div class="info-row">
        <span class="info-label">Platform</span>
        <span class="info-value">${escapeHtml(params.platform)}</span>
      </div>
    `
    : '';
  const scheduleOptions: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Africa/Nairobi',
  };
  const scheduleBlock = params.scheduledFor
    ? `
      <div class="info-row">
        <span class="info-label">Starts</span>
        <span class="info-value">${escapeHtml(formatTournamentDateTime(
          params.scheduledFor,
          'TBA',
          scheduleOptions
        ))}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Check-in</span>
        <span class="info-value">${escapeHtml(formatTournamentDateTime(
          getTournamentCheckInDate(params.scheduledFor),
          '1 hour before kickoff',
          scheduleOptions
        ))}</span>
      </div>
    `
    : '';
  const organizerName = escapeHtml(params.organizerName);
  const tournamentTitle = escapeHtml(params.tournamentTitle);
  const game = escapeHtml(params.game);
  const region = escapeHtml(params.region);
  const tournamentUrl = escapeUrl(params.tournamentUrl);

  const content = `
    <h2>New tournament is open</h2>
    <p>${organizerName} just opened ${tournamentTitle} on Mechi.</p>
    <div class="info-box">
      <div class="info-row">
        <span class="info-label">Game</span>
        <span class="info-value">${game}</span>
      </div>
      ${platformBlock}
      <div class="info-row">
        <span class="info-label">Bracket size</span>
        <span class="info-value">${escapeHtml(params.size)} players</span>
      </div>
      <div class="info-row">
        <span class="info-label">Entry fee</span>
        <span class="info-value">KES ${escapeHtml(params.entryFee.toLocaleString())}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Location</span>
        <span class="info-value">${region}</span>
      </div>
      ${scheduleBlock}
    </div>
    <p>Open the bracket page to join before the slots fill up.</p>
    <a href="${tournamentUrl}" class="btn">View Tournament</a>
  `;

  await sendBccEmail({
    bcc: params.bcc,
    subject: `${params.tournamentTitle} is open for ${params.game}`,
    title: 'Tournament Open',
    content,
    unsubscribeUrl: params.unsubscribeUrl,
  });
}

export async function sendClientMarketingEmail(params: {
  to: string;
  subject: string;
  title: string;
  bodyText: string;
  ctaLabel?: string | null;
  ctaUrl?: string | null;
  unsubscribeUrl: string;
}): Promise<void> {
  const unsubscribeUrl = escapeUrl(params.unsubscribeUrl);
  const cta =
    params.ctaLabel && params.ctaUrl
      ? `<a href="${escapeUrl(params.ctaUrl)}" class="btn">${escapeHtml(params.ctaLabel)}</a>`
      : '';
  const content = `
    <h2>${escapeHtml(params.title)}</h2>
    ${plainTextToHtml(params.bodyText)}
    ${cta}
    <p class="note">You received this because your email is linked to Mechi.</p>
    <p><a href="${unsubscribeUrl}" class="secondary-link">Unsubscribe from client emails</a></p>
  `;

  await sendEmail({
    from: FROM,
    to: params.to,
    subject: params.subject,
    html: baseLayout(params.title, content),
    headers: {
      'List-Unsubscribe': `<${params.unsubscribeUrl}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
  }, { requireConfigured: true });
}

export async function sendTournamentRegistrationConfirmedEmail(params: {
  to: string;
  playerName: string;
  tournamentTitle: string;
  game: string;
  platform?: string | null;
  scheduledFor?: string | null;
  entryFee: number;
  tournamentUrl: string;
}): Promise<void> {
  const playerName = escapeHtml(params.playerName);
  const tournamentTitle = escapeHtml(params.tournamentTitle);
  const game = escapeHtml(params.game);
  const platformBlock = params.platform
    ? `
      <div class="info-row">
        <span class="info-label">Platform</span>
        <span class="info-value">${escapeHtml(params.platform)}</span>
      </div>
    `
    : '';
  const scheduleBlock = params.scheduledFor
    ? `
      <div class="info-row">
        <span class="info-label">Starts</span>
        <span class="info-value">${escapeHtml(formatEatDateTimeLabel(params.scheduledFor))}</span>
      </div>
    `
    : '';
  const feeLabel = params.entryFee > 0 ? `KES ${params.entryFee.toLocaleString()}` : 'Free entry';
  const content = `
    <h2>Tournament registration confirmed</h2>
    <p>Hey ${playerName}, your slot in <strong>${tournamentTitle}</strong> is locked. Keep an eye on your match room and be ready before check-in.</p>
    <div class="info-box">
      <div class="info-row">
        <span class="info-label">Tournament</span>
        <span class="info-value">${tournamentTitle}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Game</span>
        <span class="info-value">${game}</span>
      </div>
      ${platformBlock}
      ${scheduleBlock}
      <div class="info-row">
        <span class="info-label">Entry</span>
        <span class="info-value">${escapeHtml(feeLabel)}</span>
      </div>
    </div>
    <p class="note">Arrive early, confirm your connection, and watch the tournament page for bracket and match-room updates.</p>
    <a href="${escapeUrl(params.tournamentUrl)}" class="btn">Open Tournament</a>
  `;

  try {
    await sendEmail({
      from: FROM,
      to: params.to,
      subject: `You're registered for ${params.tournamentTitle}`,
      html: baseLayout(`You're registered for ${params.tournamentTitle}`, content),
    });
  } catch (err) {
    console.error('[Email] Tournament registration confirmation send error:', err);
  }
}

export async function sendOnlineTournamentRegistrationEmail(params: {
  to: string;
  username: string;
  eventTitle: string;
  gameLabel: string;
  dateLabel: string;
  timeLabel: string;
  inGameUsername: string;
  format: string;
  matchCount: string;
  scoring: string;
  firstPrize: string;
  secondPrize: string;
  thirdPrize: string;
  eligibilityStatus: string;
  registrationUrl: string;
  whatsappGroupUrl: string;
}): Promise<void> {
  const username = escapeHtml(params.username);
  const eventTitle = escapeHtml(params.eventTitle);
  const gameLabel = escapeHtml(params.gameLabel);
  const eligibility = statusLabel(params.eligibilityStatus);
  const content = `
    <h2>PlayMechi registration received</h2>
    <p>Hey ${username}, your <strong>${gameLabel}</strong> registration for <strong>${eventTitle}</strong> is in. Keep this email for the match-day details.</p>
    <div class="info-box">
      <div class="info-row">
        <span class="info-label">Game</span>
        <span class="info-value">${gameLabel}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Game tag</span>
        <span class="info-value">${escapeHtml(params.inGameUsername)}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Starts</span>
        <span class="info-value">${escapeHtml(params.dateLabel)}, ${escapeHtml(params.timeLabel)}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Eligibility</span>
        <span class="info-value"><span class="badge ${params.eligibilityStatus === 'verified' ? 'badge-green' : 'badge-blue'}">${escapeHtml(eligibility)}</span></span>
      </div>
      <div class="info-row">
        <span class="info-label">Format</span>
        <span class="info-value">${escapeHtml(params.format)}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Matches</span>
        <span class="info-value">${escapeHtml(params.matchCount)}</span>
      </div>
    </div>
    <div class="note">${escapeHtml(params.scoring)}</div>
    <table role="presentation" class="mini-grid" cellpadding="0" cellspacing="0">
      <tr>
        <td class="mini-cell" width="33%">
          <span class="mini-label">1st prize</span>
          <span class="mini-value">${escapeHtml(params.firstPrize)}</span>
        </td>
        <td width="10"></td>
        <td class="mini-cell" width="33%">
          <span class="mini-label">2nd prize</span>
          <span class="mini-value">${escapeHtml(params.secondPrize)}</span>
        </td>
        <td width="10"></td>
        <td class="mini-cell" width="33%">
          <span class="mini-label">3rd prize</span>
          <span class="mini-value">${escapeHtml(params.thirdPrize)}</span>
        </td>
      </tr>
    </table>
    <p>We will use your Mechi profile and registered game tag to coordinate the event. Join your game WhatsApp group for room details, fixtures, and match-day updates.</p>
    <a href="${escapeUrl(params.whatsappGroupUrl)}" class="btn">Join WhatsApp Group</a>
    <p><a href="${escapeUrl(params.registrationUrl)}" class="secondary-link">View registration</a></p>
  `;

  try {
    await sendEmail({
      from: FROM,
      to: params.to,
      subject: `${params.gameLabel} registration confirmed for ${params.eventTitle}`,
      html: baseLayout(`${params.gameLabel} registration confirmed`, content),
    });
  } catch (err) {
    console.error('[Email] Online tournament registration send error:', err);
  }
}

export async function sendOnlineTournamentGameReminderEmail(params: {
  to: string;
  username: string;
  eventTitle: string;
  gameLabel: string;
  matchStartsAt: string;
  inGameUsername: string;
  format: string;
  matchCount: string;
  scoring: string;
  registrationUrl: string;
  streamUrl?: string | null;
}): Promise<void> {
  const username = escapeHtml(params.username);
  const gameLabel = escapeHtml(params.gameLabel);
  const startsAt = formatEatDateTimeLabel(params.matchStartsAt);
  const streamLink = params.streamUrl
    ? `<p><a href="${escapeUrl(params.streamUrl)}" class="secondary-link">Open stream channel</a></p>`
    : '';
  const content = `
    <h2>Game time is close</h2>
    <p>Hey ${username}, your <strong>${gameLabel}</strong> run for <strong>${escapeHtml(params.eventTitle)}</strong> starts soon. Get your device charged, data stable, and game account ready.</p>
    <div class="info-box">
      <div class="info-row">
        <span class="info-label">Starts</span>
        <span class="info-value">${escapeHtml(startsAt)}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Game tag</span>
        <span class="info-value">${escapeHtml(params.inGameUsername)}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Format</span>
        <span class="info-value">${escapeHtml(params.format)}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Matches</span>
        <span class="info-value">${escapeHtml(params.matchCount)}</span>
      </div>
    </div>
    <p class="note">${escapeHtml(params.scoring)}</p>
    <p>Open your registration page for final instructions and keep WhatsApp/Mechi notifications nearby in case the ops team needs to reach you.</p>
    <a href="${escapeUrl(params.registrationUrl)}" class="btn">Open Registration</a>
    ${streamLink}
  `;

  try {
    await sendEmail({
      from: FROM,
      to: params.to,
      subject: `${params.gameLabel} starts soon on Mechi`,
      html: baseLayout(`${params.gameLabel} starts soon`, content),
    }, { requireConfigured: true });
  } catch (err) {
    console.error('[Email] Online tournament reminder send error:', err);
    throw err;
  }
}

export async function sendTournamentFullEmail(params: {
  to: string;
  organizerName: string;
  tournamentTitle: string;
  tournamentUrl: string;
}): Promise<void> {
  const content = `
    <h2>Your bracket is full</h2>
    <p>Hey ${params.organizerName}, every slot in <strong>${params.tournamentTitle}</strong> is locked.</p>
    <p>Start the tournament to create the first match rooms and get players moving.</p>
    <a href="${params.tournamentUrl}" class="btn">Start Tournament</a>
  `;

  try {
    await sendEmail({
      from: FROM,
      to: params.to,
      subject: `${params.tournamentTitle} is full - start it now`,
      html: baseLayout('Tournament Full', content),
    });
  } catch (err) {
    console.error('[Email] Tournament full send error:', err);
  }
}

export async function sendTournamentMatchReadyEmail(params: {
  to: string;
  playerName: string;
  opponentName: string;
  tournamentTitle: string;
  game: string;
  matchUrl: string;
}): Promise<void> {
  const playerName = escapeHtml(params.playerName);
  const tournamentTitle = escapeHtml(params.tournamentTitle);
  const opponentName = escapeHtml(params.opponentName);
  const game = escapeHtml(params.game);
  const content = `
    <h2>Your bracket match is ready</h2>
    <p>Hey ${playerName}, your match in <strong>${tournamentTitle}</strong> is live. Treat this as the match reminder: open the room, coordinate with your opponent, and report the result on Mechi.</p>
    <div class="info-box">
      <div class="info-row">
        <span class="info-label">Game</span>
        <span class="info-value">${game}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Opponent</span>
        <span class="info-value">${opponentName}</span>
      </div>
    </div>
    <p class="note">If the room code or scoreline is disputed, keep screenshots and use the match page so the ops team can review cleanly.</p>
    <a href="${escapeUrl(params.matchUrl)}" class="btn">Open Match</a>
  `;

  try {
    await sendEmail({
      from: FROM,
      to: params.to,
      subject: `Your Mechi tournament match is ready`,
      html: baseLayout('Tournament Match Ready', content),
    });
  } catch (err) {
    console.error('[Email] Tournament match send error:', err);
  }
}

export async function sendTournamentWinnerEmail(params: {
  to: string;
  winnerName: string;
  tournamentTitle: string;
  prizeAmount: number;
  tournamentUrl: string;
}): Promise<void> {
  const prizeCopy =
    params.prizeAmount > 0
      ? `Your prize is KES ${params.prizeAmount.toLocaleString()}. If automatic payout needs review, Mechi will keep it marked on the tournament.`
      : 'No cash prize on this one, but the win is yours.';

  const content = `
    <h2>Champion status locked</h2>
    <p>GG ${params.winnerName}. You won <strong>${params.tournamentTitle}</strong>.</p>
    <p>${prizeCopy}</p>
    <a href="${params.tournamentUrl}" class="btn">View Bracket</a>
  `;

  try {
    await sendEmail({
      from: FROM,
      to: params.to,
      subject: `You won ${params.tournamentTitle}`,
      html: baseLayout('Tournament Winner', content),
    });
  } catch (err) {
    console.error('[Email] Tournament winner send error:', err);
  }
}

export async function sendSubscriptionConfirmEmail(params: {
  to: string;
  username: string;
  plan: 'pro' | 'elite';
  expiresAt: string;
}): Promise<void> {
  const planName = params.plan === 'elite' ? 'Elite' : 'Pro';
  const expiry = new Date(params.expiresAt).toLocaleDateString('en-KE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const content = `
    <h2>${planName} activated</h2>
    <p>Hey ${params.username}, your ${planName} plan is live on Mechi.</p>
    <div class="info-box">
      <div class="info-row">
        <span class="info-label">Plan</span>
        <span class="info-value">${planName}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Renews</span>
        <span class="info-value">${expiry}</span>
      </div>
    </div>
    <p>Your upgraded perks are ready now. Jump back in and keep climbing.</p>
    <a href="${APP_URL}/dashboard" class="btn">Open Dashboard</a>
  `;

  try {
    await sendEmail({
      from: FROM,
      to: params.to,
      subject: `${planName} activated on Mechi`,
      html: baseLayout(`${planName} activated on Mechi`, content),
    });
  } catch (err) {
    console.error('[Email] Subscription confirm send error:', err);
  }
}
