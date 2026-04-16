const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const API_VERSION = 'v25.0';
const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ??
  process.env.NEXT_PUBLIC_BASE_URL ??
  'https://mechi.club';
const WHATSAPP_ENABLED = Boolean(WHATSAPP_TOKEN && PHONE_NUMBER_ID);

async function safeNotify(label: string, fn: () => Promise<void>): Promise<void> {
  if (!WHATSAPP_ENABLED) {
    console.log(`[WhatsApp] ${label} skipped - credentials not configured`);
    return;
  }

  try {
    await fn();
  } catch (err) {
    console.error(`[WhatsApp] ${label} error:`, err);
  }
}

async function sendWhatsApp(to: string, message: string): Promise<void> {
  if (!WHATSAPP_ENABLED || !WHATSAPP_TOKEN || !PHONE_NUMBER_ID) {
    console.log('[WhatsApp] send skipped - credentials not configured');
    return;
  }

  // Normalize phone number and ensure it includes Kenya's country code.
  let phone = to.replace(/\D/g, '');
  if (phone.startsWith('0')) {
    phone = '254' + phone.slice(1);
  }
  if (!phone.startsWith('254')) {
    phone = '254' + phone;
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/${API_VERSION}/${PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: phone,
          type: 'text',
          text: { body: message },
        }),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      console.error('[WhatsApp] Send error:', err);
      return;
    }
  } catch (err) {
    console.error('[WhatsApp] Network error:', err);
  }
}

export async function notifyMatchFound(params: {
  whatsappNumber: string;
  username: string;
  game: string;
  opponentUsername: string;
  matchId: string;
  appUrl?: string;
}): Promise<void> {
  await safeNotify('match_found', async () => {
    const matchUrl = `${params.appUrl ?? APP_URL}/match/${params.matchId}`;
    const message =
      `Yo ${params.username}, your Mechi match is ready.\n` +
      `Game: ${params.game}\n` +
      `Opponent: ${params.opponentUsername}\n` +
      `Open match: ${matchUrl}`;

    await sendWhatsApp(params.whatsappNumber, message);
  });
}

export async function notifyResultConfirmed(params: {
  whatsappNumber: string;
  username: string;
  opponentUsername: string;
  game: string;
  won: boolean;
  rankLabel: string;
  level: number;
  appUrl?: string;
}): Promise<void> {
  await safeNotify('result_confirmed', async () => {
    const dashboardUrl = `${params.appUrl ?? APP_URL}/dashboard`;
    const message =
      `${params.username}, your result is locked in.\n` +
      `Game: ${params.game}\n` +
      `Opponent: ${params.opponentUsername}\n` +
      `Result: ${params.won ? 'Win confirmed' : 'Match closed'}\n` +
      `Rank: ${params.rankLabel}\n` +
      `Level: ${params.level}\n` +
      `${dashboardUrl}`;

    await sendWhatsApp(params.whatsappNumber, message);
  });
}

export async function notifyMatchDispute(params: {
  whatsappNumber: string;
  username: string;
  opponentUsername: string;
  game: string;
  matchId: string;
  appUrl?: string;
}): Promise<void> {
  await safeNotify('match_dispute', async () => {
    const matchUrl = `${params.appUrl ?? APP_URL}/match/${params.matchId}`;
    const message =
      `${params.username}, your Mechi match has been disputed.\n` +
      `Game: ${params.game}\n` +
      `Opponent: ${params.opponentUsername}\n` +
      `Upload a screenshot here: ${matchUrl}`;

    await sendWhatsApp(params.whatsappNumber, message);
  });
}

export { sendWhatsApp };
