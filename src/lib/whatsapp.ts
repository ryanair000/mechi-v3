const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const API_VERSION = 'v25.0';
const WHATSAPP_ENABLED = !!(WHATSAPP_TOKEN && PHONE_NUMBER_ID);

async function sendWhatsApp(to: string, message: string): Promise<boolean> {
  if (!WHATSAPP_ENABLED) {
    console.log('[WhatsApp] Skipped — WHATSAPP_TOKEN or WHATSAPP_PHONE_NUMBER_ID not set');
    return false;
  }

  // Normalize: ensure country code 254 (Kenya)
  let phone = to.replace(/\D/g, '');
  if (phone.startsWith('0')) phone = '254' + phone.slice(1);
  if (!phone.startsWith('254')) phone = '254' + phone;

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
      console.error('[WhatsApp] Send error:', await response.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error('[WhatsApp] Network error:', err);
    return false;
  }
}

export async function notifyMatchFound(params: {
  phone: string;
  game: string;
  opponentUsername: string;
  opponentPlatformId: string;
  matchId: string;
}): Promise<boolean> {
  if (!WHATSAPP_ENABLED) return false;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://mechi.club';
  const message =
    `🎮 Mechi Inaanza!\n` +
    `Game: ${params.game}\n` +
    `Opponent: ${params.opponentUsername}\n` +
    `Add them: ${params.opponentPlatformId}\n` +
    `${appUrl}/match/${params.matchId}`;
  return sendWhatsApp(params.phone, message);
}

export async function notifyResultConfirmed(params: {
  phone: string;
  ratingChange: number;
  won: boolean;
}): Promise<boolean> {
  if (!WHATSAPP_ENABLED) return false;
  const sign = params.ratingChange >= 0 ? '+' : '';
  const message =
    `✅ Match confirmed.\n` +
    `Result: ${params.won ? 'Victory! 🏆' : 'Defeat 😔'}\n` +
    `Rating: ${sign}${params.ratingChange}`;
  return sendWhatsApp(params.phone, message);
}

export async function notifyMatchDisputed(params: {
  phone: string;
  game: string;
  opponentUsername: string;
  matchId: string;
}): Promise<boolean> {
  if (!WHATSAPP_ENABLED) return false;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://mechi.club';
  const message =
    `⚠️ Match Disputed\n` +
    `Game: ${params.game}\n` +
    `vs ${params.opponentUsername}\n` +
    `Upload screenshot to resolve:\n` +
    `${appUrl}/match/${params.matchId}`;
  return sendWhatsApp(params.phone, message);
}

export { sendWhatsApp };
