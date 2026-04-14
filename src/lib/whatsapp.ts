const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN!;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID!;
const API_VERSION = 'v25.0';

async function sendWhatsApp(to: string, message: string): Promise<boolean> {
  // Normalize phone number — ensure it starts with country code (254 for Kenya)
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
  const sign = params.ratingChange >= 0 ? '+' : '';
  const message =
    `✅ Match result confirmed.\n` +
    `Result: ${params.won ? 'Victory! 🏆' : 'Defeat 😔'}\n` +
    `Rating change: ${sign}${params.ratingChange}`;
  return sendWhatsApp(params.phone, message);
}

export { sendWhatsApp };
