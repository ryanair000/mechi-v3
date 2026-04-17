import { APP_URL } from '@/lib/urls';

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const API_VERSION = 'v25.0';
const DEFAULT_TEMPLATE_LANGUAGE = process.env.WHATSAPP_TEMPLATE_LANGUAGE ?? 'en_US';
const TEST_TEMPLATE_NAME = process.env.WHATSAPP_TEST_TEMPLATE_NAME ?? 'hello_world';
const MATCH_FOUND_TEMPLATE = process.env.WHATSAPP_TEMPLATE_MATCH_FOUND;
const RESULT_CONFIRMED_TEMPLATE = process.env.WHATSAPP_TEMPLATE_RESULT_CONFIRMED;
const MATCH_DISPUTE_TEMPLATE = process.env.WHATSAPP_TEMPLATE_MATCH_DISPUTE;
const WHATSAPP_ENABLED = Boolean(WHATSAPP_TOKEN && PHONE_NUMBER_ID);

type WhatsAppTemplateParameter = {
  type: 'text';
  text: string;
};

type WhatsAppTemplateComponent = {
  type: 'body';
  parameters: WhatsAppTemplateParameter[];
};

export interface WhatsAppSendResult {
  ok: boolean;
  status: number;
  to: string;
  normalizedTo: string;
  type: 'text' | 'template';
  templateName?: string;
  messageId?: string | null;
  waId?: string | null;
  skipped?: boolean;
  error?: string;
  details?: string;
  responseBody?: unknown;
}

function normalizeRecipient(to: string): string {
  let phone = to.replace(/\D/g, '');

  if (phone.startsWith('0')) {
    phone = `254${phone.slice(1)}`;
  }

  if (!phone.startsWith('254')) {
    phone = `254${phone}`;
  }

  return phone;
}

function createBodyParameters(values: string[]): WhatsAppTemplateParameter[] {
  return values.map((text) => ({
    type: 'text',
    text,
  }));
}

function createBodyComponent(values: string[]): WhatsAppTemplateComponent[] {
  if (values.length === 0) {
    return [];
  }

  return [
    {
      type: 'body',
      parameters: createBodyParameters(values),
    },
  ];
}

function describeSendFailure(result: WhatsAppSendResult): string {
  if (result.details) {
    return result.details;
  }

  if (result.error) {
    return result.error;
  }

  return 'Unknown WhatsApp delivery failure';
}

async function dispatchWhatsApp(
  to: string,
  type: 'text' | 'template',
  payload: Record<string, unknown>,
  templateName?: string
): Promise<WhatsAppSendResult> {
  const normalizedTo = normalizeRecipient(to);

  if (!WHATSAPP_ENABLED || !WHATSAPP_TOKEN || !PHONE_NUMBER_ID) {
    return {
      ok: false,
      skipped: true,
      status: 0,
      to,
      normalizedTo,
      type,
      templateName,
      error: 'WhatsApp credentials not configured',
    };
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
          to: normalizedTo,
          ...payload,
        }),
      }
    );

    const rawText = await response.text();
    let responseBody: unknown = rawText;

    try {
      responseBody = rawText ? JSON.parse(rawText) : null;
    } catch {
      responseBody = rawText;
    }

    if (!response.ok) {
      const metaError =
        responseBody && typeof responseBody === 'object' && 'error' in responseBody
          ? (responseBody as { error?: { message?: string; error_data?: { details?: string } } }).error
          : undefined;

      return {
        ok: false,
        status: response.status,
        to,
        normalizedTo,
        type,
        templateName,
        error: metaError?.message ?? 'WhatsApp request failed',
        details: metaError?.error_data?.details,
        responseBody,
      };
    }

    const parsedBody = responseBody as {
      contacts?: Array<{ wa_id?: string }>;
      messages?: Array<{ id?: string }>;
    } | null;

    return {
      ok: true,
      status: response.status,
      to,
      normalizedTo,
      type,
      templateName,
      waId: parsedBody?.contacts?.[0]?.wa_id ?? null,
      messageId: parsedBody?.messages?.[0]?.id ?? null,
      responseBody,
    };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      to,
      normalizedTo,
      type,
      templateName,
      error: err instanceof Error ? err.message : 'Network error',
    };
  }
}

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

export async function sendWhatsApp(to: string, message: string): Promise<WhatsAppSendResult> {
  return dispatchWhatsApp(to, 'text', {
    type: 'text',
    text: { body: message },
  });
}

export async function sendWhatsAppTemplate(params: {
  to: string;
  name?: string;
  languageCode?: string;
  bodyParameters?: string[];
}): Promise<WhatsAppSendResult> {
  const templateName = params.name ?? TEST_TEMPLATE_NAME;

  return dispatchWhatsApp(
    params.to,
    'template',
    {
      type: 'template',
      template: {
        name: templateName,
        language: { code: params.languageCode ?? DEFAULT_TEMPLATE_LANGUAGE },
        components: createBodyComponent(params.bodyParameters ?? []),
      },
    },
    templateName
  );
}

export function buildMatchFoundMessage(params: {
  username: string;
  game: string;
  opponentUsername: string;
  matchId: string;
  appUrl?: string;
}): string {
  const matchUrl = `${params.appUrl ?? APP_URL}/match/${params.matchId}`;

  return (
    `Yo ${params.username}, your Mechi match is ready.\n` +
    `Game: ${params.game}\n` +
    `Opponent: ${params.opponentUsername}\n` +
    `Open match: ${matchUrl}`
  );
}

export function buildResultConfirmedMessage(params: {
  username: string;
  opponentUsername: string;
  game: string;
  won: boolean;
  rankLabel: string;
  level: number;
  appUrl?: string;
}): string {
  const dashboardUrl = `${params.appUrl ?? APP_URL}/dashboard`;

  return (
    `${params.username}, your result is locked in.\n` +
    `Game: ${params.game}\n` +
    `Opponent: ${params.opponentUsername}\n` +
    `Result: ${params.won ? 'Win confirmed' : 'Match closed'}\n` +
    `Rank: ${params.rankLabel}\n` +
    `Level: ${params.level}\n` +
    `${dashboardUrl}`
  );
}

export function buildMatchDisputeMessage(params: {
  username: string;
  opponentUsername: string;
  game: string;
  matchId: string;
  appUrl?: string;
}): string {
  const matchUrl = `${params.appUrl ?? APP_URL}/match/${params.matchId}`;

  return (
    `${params.username}, your Mechi match has been disputed.\n` +
    `Game: ${params.game}\n` +
    `Opponent: ${params.opponentUsername}\n` +
    `Upload a screenshot here: ${matchUrl}`
  );
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
    const result = MATCH_FOUND_TEMPLATE
      ? await sendWhatsAppTemplate({
          to: params.whatsappNumber,
          name: MATCH_FOUND_TEMPLATE,
          bodyParameters: [
            params.username,
            params.game,
            params.opponentUsername,
            `${params.appUrl ?? APP_URL}/match/${params.matchId}`,
          ],
        })
      : await sendWhatsApp(params.whatsappNumber, buildMatchFoundMessage(params));

    if (!result.ok) {
      throw new Error(describeSendFailure(result));
    }
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
    const result = RESULT_CONFIRMED_TEMPLATE
      ? await sendWhatsAppTemplate({
          to: params.whatsappNumber,
          name: RESULT_CONFIRMED_TEMPLATE,
          bodyParameters: [
            params.username,
            params.game,
            params.opponentUsername,
            params.won ? 'Win confirmed' : 'Match closed',
            params.rankLabel,
            String(params.level),
            `${params.appUrl ?? APP_URL}/dashboard`,
          ],
        })
      : await sendWhatsApp(params.whatsappNumber, buildResultConfirmedMessage(params));

    if (!result.ok) {
      throw new Error(describeSendFailure(result));
    }
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
    const result = MATCH_DISPUTE_TEMPLATE
      ? await sendWhatsAppTemplate({
          to: params.whatsappNumber,
          name: MATCH_DISPUTE_TEMPLATE,
          bodyParameters: [
            params.username,
            params.game,
            params.opponentUsername,
            `${params.appUrl ?? APP_URL}/match/${params.matchId}`,
          ],
        })
      : await sendWhatsApp(params.whatsappNumber, buildMatchDisputeMessage(params));

    if (!result.ok) {
      throw new Error(describeSendFailure(result));
    }
  });
}
