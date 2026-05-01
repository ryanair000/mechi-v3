import 'server-only';

import { GAMES } from '@/lib/config';
import { isMockProviderMode, shouldCaptureProviderTranscripts } from '@/lib/provider-mode';
import { captureProviderTranscript } from '@/lib/provider-transcript';
import type { GameKey } from '@/types';
import { ADMIN_URL, APP_URL } from '@/lib/urls';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN?.trim();
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID?.trim();
const TELEGRAM_REGISTRATION_THREAD_ID = process.env.TELEGRAM_REGISTRATION_THREAD_ID?.trim();
const TELEGRAM_TEST_REPORT_THREAD_ID = process.env.TELEGRAM_TEST_REPORT_THREAD_ID?.trim();
const TELEGRAM_TEST_REPORTER_LABEL = process.env.TELEGRAM_TEST_REPORTER_LABEL?.trim();
const TELEGRAM_TEST_FIXER_LABEL = process.env.TELEGRAM_TEST_FIXER_LABEL?.trim();
const TELEGRAM_TESTS_URL =
  process.env.NEXT_PUBLIC_TESTS_URL?.trim()?.replace(/\/+$/, '') ||
  'https://tests.mechi.club';

type TelegramThreadKey = 'registration' | 'test_reports';

type SendTelegramMessageOptions = {
  operation?: string;
  threadKey?: TelegramThreadKey;
};

function escapeTelegramHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function truncateTelegramText(value: string, maxLength: number): string {
  const trimmed = value.trim();
  if (trimmed.length <= maxLength) {
    return trimmed;
  }

  return `${trimmed.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
}

function formatField(label: string, value: string | null | undefined): string {
  const normalizedValue = value?.trim() || 'n/a';
  return `<b>${escapeTelegramHtml(label)}:</b> ${escapeTelegramHtml(normalizedValue)}`;
}

function formatBlockField(
  label: string,
  value: string | null | undefined,
  maxLength = 900
): string {
  const normalizedValue = value?.trim() ? truncateTelegramText(value, maxLength) : 'n/a';
  return `<b>${escapeTelegramHtml(label)}:</b>\n${escapeTelegramHtml(normalizedValue)}`;
}

function formatGameList(selectedGames: string[] = []): string {
  if (selectedGames.length === 0) {
    return 'n/a';
  }

  return selectedGames
    .map((game) => GAMES[game as GameKey]?.label ?? game)
    .join(', ');
}

function formatTelegramLink(label: string, href: string): string {
  return `<a href="${escapeTelegramHtml(href)}">${escapeTelegramHtml(label)}</a>`;
}

function formatStatusLabel(value: string): string {
  return value
    .split(/[_-]+/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatTelegramActor(
  fallbackLabel: string,
  options: {
    overrideLabel?: string | null;
    username?: string | null;
  } = {}
): string {
  const overrideLabel = options.overrideLabel?.trim();
  if (overrideLabel) {
    return overrideLabel;
  }

  const username = options.username?.trim();
  if (username) {
    return username.startsWith('@') ? username : `@${username}`;
  }

  return fallbackLabel;
}

function getTelegramThreadId(threadKey: TelegramThreadKey | undefined): number | undefined {
  const rawThreadId =
    threadKey === 'registration'
      ? TELEGRAM_REGISTRATION_THREAD_ID
      : threadKey === 'test_reports'
        ? TELEGRAM_TEST_REPORT_THREAD_ID
        : undefined;

  if (!rawThreadId) {
    return undefined;
  }

  const parsedThreadId = Number(rawThreadId);
  return Number.isFinite(parsedThreadId) ? parsedThreadId : undefined;
}

async function sendTelegramMessage(
  text: string,
  options: SendTelegramMessageOptions = {}
): Promise<void> {
  const operation = options.operation ?? 'send-message';
  const messageThreadId = getTelegramThreadId(options.threadKey);
  const transcriptRequest = {
    text,
    message_thread_id: messageThreadId ?? null,
  };

  if (isMockProviderMode()) {
    await captureProviderTranscript({
      provider: 'telegram',
      operation,
      request: transcriptRequest,
      response: {
        ok: true,
        mocked: true,
      },
    });
    return;
  }

  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    if (shouldCaptureProviderTranscripts()) {
      await captureProviderTranscript({
        provider: 'telegram',
        operation,
        request: transcriptRequest,
        error: 'Telegram bot credentials are not configured',
      });
    }
    return;
  }

  const payload: Record<string, unknown> = {
    chat_id: TELEGRAM_CHAT_ID,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
  };

  if (messageThreadId) {
    payload.message_thread_id = messageThreadId;
  }

  const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const details = await response.text().catch(() => 'No response body');
    throw new Error(`Telegram send failed (${response.status}): ${details}`);
  }

  if (shouldCaptureProviderTranscripts()) {
    await captureProviderTranscript({
      provider: 'telegram',
      operation,
      request: transcriptRequest,
      response: {
        ok: true,
        status: response.status,
        message_thread_id: messageThreadId ?? null,
      },
    });
  }
}

export async function sendNewRegistrationTelegramNotification(params: {
  username: string;
  email: string;
  phone: string;
  location: string;
  selectedGames: string[];
  plan: string;
  inviteCode?: string | null;
}): Promise<void> {
  const selectedGames = formatGameList(params.selectedGames);
  const profileUrl = `${APP_URL}/s/${encodeURIComponent(params.username)}`;
  const adminUrl = `${ADMIN_URL}/users`;
  const message = [
    '<b>New Mechi registration</b>',
    '',
    formatField('Username', params.username),
    formatField('Email', params.email),
    formatField('Phone', params.phone),
    formatField('Location', params.location),
    formatField('Plan', params.plan),
    formatField('Games', selectedGames),
    params.inviteCode ? formatField('Invite code used', params.inviteCode) : null,
    '',
    formatTelegramLink('Open public profile', profileUrl),
    formatTelegramLink('Open admin users', adminUrl),
  ]
    .filter((line): line is string => Boolean(line))
    .join('\n');

  await sendTelegramMessage(message, {
    operation: 'new-registration',
    threadKey: 'registration',
  });
}

export async function sendOnlineTournamentRegistrationTelegramNotification(params: {
  eventTitle: string;
  username: string;
  gameLabel: string;
  inGameUsername: string;
  email?: string | null;
  phone?: string | null;
  whatsappNumber?: string | null;
  instagramUsername?: string | null;
  youtubeName?: string | null;
  followedInstagram: boolean;
  subscribedYoutube: boolean;
  eligibilityStatus: string;
  registered: number;
  slots: number;
  spotsLeft: number;
  registrationId?: string | null;
}): Promise<void> {
  const adminUrl = `${ADMIN_URL}/admin/online-tournament`;
  const message = [
    '<b>New PlayMechi tournament registration</b>',
    '',
    formatField('Event', params.eventTitle),
    formatField('Player', params.username),
    formatField('Game', params.gameLabel),
    formatField('Game tag', params.inGameUsername),
    formatField('Email', params.email),
    formatField('Phone', params.phone),
    formatField('WhatsApp', params.whatsappNumber),
    formatField(
      'Socials',
      [
        params.instagramUsername?.trim() ? `IG @${params.instagramUsername.trim()}` : null,
        params.youtubeName?.trim() ? `YT ${params.youtubeName.trim()}` : null,
      ]
        .filter(Boolean)
        .join(' | ')
    ),
    formatField(
      'Follow/sub',
      `${params.followedInstagram ? 'IG yes' : 'IG no'} / ${
        params.subscribedYoutube ? 'YT yes' : 'YT no'
      }`
    ),
    formatField('Eligibility', formatStatusLabel(params.eligibilityStatus)),
    formatField('Slots', `${params.registered}/${params.slots} registered, ${params.spotsLeft} left`),
    params.registrationId ? formatField('Registration', params.registrationId.slice(0, 8)) : null,
    '',
    formatTelegramLink('Open tournament admin', adminUrl),
  ]
    .filter((line): line is string => Boolean(line))
    .join('\n');

  await sendTelegramMessage(message, {
    operation: 'online-tournament-registration',
    threadKey: 'registration',
  });
}

export async function sendTestIssueReportTelegramNotification(params: {
  reportId: string;
  pagePath: string;
  pageUrl?: string | null;
  description: string;
  screenshotUrl: string;
  reporterUsername?: string | null;
  reporterRole?: string | null;
  resultsUrl?: string | null;
}): Promise<void> {
  const resultsUrl = params.resultsUrl?.trim() || `${TELEGRAM_TESTS_URL}/results?status=new`;
  const reporterLabel = formatTelegramActor('Anonymous', {
    overrideLabel: TELEGRAM_TEST_REPORTER_LABEL,
    username: params.reporterUsername,
  });
  const message = [
    '<b>New Mechi test issue report</b>',
    '',
    formatField('Report', params.reportId.slice(0, 8)),
    formatField('Page', params.pagePath),
    formatField('Reporter', reporterLabel),
    params.reporterRole ? formatField('Role', params.reporterRole) : null,
    formatBlockField('Description', params.description),
    '',
    formatTelegramLink('Open review queue', resultsUrl),
    params.pageUrl?.trim() ? formatTelegramLink('Open reported URL', params.pageUrl.trim()) : null,
    formatTelegramLink('Open screenshot', params.screenshotUrl),
  ]
    .filter((line): line is string => Boolean(line))
    .join('\n');

  await sendTelegramMessage(message, {
    operation: 'new-test-issue-report',
    threadKey: 'test_reports',
  });
}

export async function sendTestIssueResolvedTelegramNotification(params: {
  reportId: string;
  pagePath: string;
  pageUrl?: string | null;
  screenshotUrl?: string | null;
  reporterUsername?: string | null;
  resolvedBy: string;
  resultsUrl?: string | null;
}): Promise<void> {
  const resultsUrl =
    params.resultsUrl?.trim() || `${TELEGRAM_TESTS_URL}/results?status=resolved`;
  const reporterLabel = formatTelegramActor('Anonymous', {
    overrideLabel: TELEGRAM_TEST_REPORTER_LABEL,
    username: params.reporterUsername,
  });
  const resolvedByLabel = formatTelegramActor('Mechi admin', {
    overrideLabel: TELEGRAM_TEST_FIXER_LABEL,
    username: params.resolvedBy,
  });
  const message = [
    '<b>Mechi test issue marked fixed</b>',
    '',
    formatField('Report', params.reportId.slice(0, 8)),
    formatField('Page', params.pagePath),
    formatField('Reporter', reporterLabel),
    formatField('Resolved by', resolvedByLabel),
    '',
    formatTelegramLink('Open resolved queue', resultsUrl),
    params.pageUrl?.trim() ? formatTelegramLink('Open reported URL', params.pageUrl.trim()) : null,
    params.screenshotUrl?.trim()
      ? formatTelegramLink('Open screenshot', params.screenshotUrl.trim())
      : null,
  ]
    .filter((line): line is string => Boolean(line))
    .join('\n');

  await sendTelegramMessage(message, {
    operation: 'resolve-test-issue-report',
    threadKey: 'test_reports',
  });
}
