const INSTAGRAM_ACCESS_TOKEN =
  process.env.INSTAGRAM_ACCESS_TOKEN ?? process.env.INSTAGRAM_TOKEN ?? '';
const INSTAGRAM_ACCOUNT_ID =
  process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID ??
  process.env.INSTAGRAM_ACCOUNT_ID ??
  process.env.INSTAGRAM_IG_ID ??
  '';
const API_VERSION = 'v25.0';
const INSTAGRAM_ENABLED = Boolean(INSTAGRAM_ACCESS_TOKEN && INSTAGRAM_ACCOUNT_ID);

export interface InstagramSendResult {
  ok: boolean;
  status: number;
  to: string;
  messageId?: string | null;
  recipientId?: string | null;
  skipped?: boolean;
  error?: string;
  details?: string;
  responseBody?: unknown;
}

export function formatInstagramDeliveryError(result: InstagramSendResult): string {
  if (result.details) {
    return result.details;
  }

  if (result.error) {
    return result.error;
  }

  return 'Unknown Instagram delivery failure';
}

export async function sendInstagramMessage(params: {
  recipientId: string;
  message: string;
}): Promise<InstagramSendResult> {
  const recipientId = params.recipientId.trim();
  const message = params.message.trim();

  if (!recipientId || !message) {
    return {
      ok: false,
      status: 0,
      to: recipientId,
      error: 'Recipient ID and message are required',
    };
  }

  if (!INSTAGRAM_ENABLED || !INSTAGRAM_ACCESS_TOKEN || !INSTAGRAM_ACCOUNT_ID) {
    return {
      ok: false,
      skipped: true,
      status: 0,
      to: recipientId,
      error: 'Instagram credentials not configured',
    };
  }

  try {
    const response = await fetch(
      `https://graph.instagram.com/${API_VERSION}/${INSTAGRAM_ACCOUNT_ID}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${INSTAGRAM_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipient: {
            id: recipientId,
          },
          message: {
            text: message,
          },
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
          ? (responseBody as { error?: { message?: string; error_data?: { details?: string } } })
              .error
          : undefined;

      return {
        ok: false,
        status: response.status,
        to: recipientId,
        error: metaError?.message ?? 'Instagram request failed',
        details: metaError?.error_data?.details,
        responseBody,
      };
    }

    const parsedBody = responseBody as
      | {
          message_id?: string;
          recipient_id?: string;
        }
      | null;

    return {
      ok: true,
      status: response.status,
      to: recipientId,
      messageId: parsedBody?.message_id ?? null,
      recipientId: parsedBody?.recipient_id ?? recipientId,
      responseBody,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      to: recipientId,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

export async function sendSupportInstagramMessage(params: {
  recipientId: string;
  message: string;
}): Promise<InstagramSendResult> {
  return sendInstagramMessage(params);
}
