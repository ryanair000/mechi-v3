import { GAMES } from '@/lib/config';
import { isMockProviderMode, shouldCaptureProviderTranscripts } from '@/lib/provider-mode';
import { captureProviderTranscript } from '@/lib/provider-transcript';
import type { GameKey } from '@/types';
import { ADMIN_URL, APP_URL } from '@/lib/urls';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN?.trim();
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID?.trim();
const TELEGRAM_REGISTRATION_THREAD_ID = process.env.TELEGRAM_REGISTRATION_THREAD_ID?.trim();

function escapeTelegramHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function formatField(label: string, value: string | null | undefined): string {
  const normalizedValue = value?.trim() || 'n/a';
  return `<b>${escapeTelegramHtml(label)}:</b> ${escapeTelegramHtml(normalizedValue)}`;
}

function formatGameList(selectedGames: string[] = []): string {
  if (selectedGames.length === 0) {
    return 'n/a';
  }

  return selectedGames
    .map((game) => GAMES[game as GameKey]?.label ?? game)
    .join(', ');
}

async function sendTelegramMessage(text: string): Promise<void> {
  if (isMockProviderMode()) {
    await captureProviderTranscript({
      provider: 'telegram',
      operation: 'send-message',
      request: { text },
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
        operation: 'send-message',
        request: { text },
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

  if (TELEGRAM_REGISTRATION_THREAD_ID) {
    const threadId = Number(TELEGRAM_REGISTRATION_THREAD_ID);
    if (Number.isFinite(threadId)) {
      payload.message_thread_id = threadId;
    }
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
      operation: 'send-message',
      request: { text },
      response: {
        ok: true,
        status: response.status,
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
    `<a href="${escapeTelegramHtml(profileUrl)}">Open public profile</a>`,
    `<a href="${escapeTelegramHtml(adminUrl)}">Open admin users</a>`,
  ]
    .filter((line): line is string => Boolean(line))
    .join('\n');

  await sendTelegramMessage(message);
}
