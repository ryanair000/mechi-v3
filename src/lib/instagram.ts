import { createHmac, timingSafeEqual } from 'node:crypto';

const INSTAGRAM_GRAPH_API_VERSION = process.env.INSTAGRAM_GRAPH_API_VERSION ?? 'v25.0';
const INSTAGRAM_VERIFY_TOKEN = process.env.INSTAGRAM_VERIFY_TOKEN ?? '';
const INSTAGRAM_APP_SECRET = process.env.INSTAGRAM_APP_SECRET ?? '';
const INSTAGRAM_PAGE_ACCESS_TOKEN = process.env.INSTAGRAM_PAGE_ACCESS_TOKEN ?? '';
const OPENCLAW_WEBHOOK_URL = process.env.OPENCLAW_WEBHOOK_URL ?? '';
const OPENCLAW_API_KEY = process.env.OPENCLAW_API_KEY ?? '';
const OPENCLAW_TIMEOUT_MS = Number(process.env.OPENCLAW_TIMEOUT_MS ?? 15000);
const INSTAGRAM_FALLBACK_REPLY = process.env.INSTAGRAM_FALLBACK_REPLY?.trim() ?? '';

type UnknownRecord = Record<string, unknown>;

interface MetaWebhookPayload {
  object?: string;
  entry?: MetaWebhookEntry[];
}

interface MetaWebhookEntry {
  id?: string;
  time?: number;
  messaging?: unknown[];
  changes?: unknown[];
}

export interface InstagramAttachment {
  type: string;
  url: string | null;
  payload: UnknownRecord | null;
}

export interface InstagramIncomingMessage {
  accountId: string | null;
  senderId: string;
  recipientId: string | null;
  messageId: string | null;
  text: string | null;
  timestamp: number | null;
  attachments: InstagramAttachment[];
  sourceField: string | null;
  rawEvent: UnknownRecord;
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function getNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function getNestedRecord(value: unknown, key: string): UnknownRecord | null {
  if (!isRecord(value)) {
    return null;
  }

  const nested = value[key];
  return isRecord(nested) ? nested : null;
}

function getNestedString(value: unknown, key: string): string | null {
  if (!isRecord(value)) {
    return null;
  }

  return getString(value[key]);
}

function normalizeAttachments(value: unknown): InstagramAttachment[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!isRecord(item)) {
      return [];
    }

    const payload = getNestedRecord(item, 'payload');
    return [
      {
        type: getString(item.type) ?? 'unknown',
        url: getString(payload?.url ?? null),
        payload,
      },
    ];
  });
}

function timingSafeEqualString(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function validateInstagramWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
  if (!INSTAGRAM_APP_SECRET) {
    return true;
  }

  if (!signatureHeader || !signatureHeader.startsWith('sha256=')) {
    return false;
  }

  const expectedSignature = `sha256=${createHmac('sha256', INSTAGRAM_APP_SECRET)
    .update(rawBody, 'utf8')
    .digest('hex')}`;

  return timingSafeEqualString(expectedSignature, signatureHeader);
}

export function verifyInstagramWebhookChallenge(params: URLSearchParams): string | null {
  const mode = params.get('hub.mode');
  const verifyToken = params.get('hub.verify_token');
  const challenge = params.get('hub.challenge');

  if (mode !== 'subscribe' || !challenge) {
    return null;
  }

  if (!INSTAGRAM_VERIFY_TOKEN || verifyToken !== INSTAGRAM_VERIFY_TOKEN) {
    return null;
  }

  return challenge;
}

function buildEventKey(event: InstagramIncomingMessage): string {
  const attachmentKey = event.attachments.map((attachment) => `${attachment.type}:${attachment.url ?? ''}`).join('|');
  return [
    event.messageId ?? '',
    event.senderId,
    event.recipientId ?? '',
    event.timestamp ?? '',
    event.text ?? '',
    attachmentKey,
  ].join(':');
}

function buildEventFromMessengerShape(
  candidate: unknown,
  entry: MetaWebhookEntry,
  sourceField: string | null
): InstagramIncomingMessage | null {
  if (!isRecord(candidate)) {
    return null;
  }

  const senderId =
    getNestedString(candidate, 'sender') ??
    getNestedString(candidate, 'from') ??
    getNestedString(getNestedRecord(candidate, 'sender'), 'id') ??
    getNestedString(getNestedRecord(candidate, 'from'), 'id');

  const recipientId =
    getNestedString(getNestedRecord(candidate, 'recipient'), 'id') ??
    getNestedString(getNestedRecord(candidate, 'to'), 'id') ??
    getString(entry.id);

  const message = getNestedRecord(candidate, 'message');
  const postback = getNestedRecord(candidate, 'postback');

  const isEcho = Boolean(message?.is_echo);
  if (isEcho || !senderId) {
    return null;
  }

  const text =
    getString(message?.text) ??
    getString(postback?.title) ??
    getString(postback?.payload) ??
    getString(candidate.text);
  const attachments = normalizeAttachments(message?.attachments ?? candidate.attachments);

  if (!text && attachments.length === 0) {
    return null;
  }

  return {
    accountId: getString(entry.id),
    senderId,
    recipientId,
    messageId: getString(message?.mid) ?? getString(candidate.mid),
    text,
    timestamp: getNumber(candidate.timestamp) ?? getNumber(candidate.time) ?? getNumber(entry.time),
    attachments,
    sourceField,
    rawEvent: candidate,
  };
}

function normalizeChangeEvent(change: unknown, entry: MetaWebhookEntry): InstagramIncomingMessage[] {
  if (!isRecord(change)) {
    return [];
  }

  const field = getString(change.field);
  if (field && !['messages', 'messaging_postbacks'].includes(field)) {
    return [];
  }

  const value = isRecord(change.value) ? change.value : null;
  if (!value) {
    return [];
  }

  const events: InstagramIncomingMessage[] = [];

  const directEvent = buildEventFromMessengerShape(value, entry, field);
  if (directEvent) {
    events.push(directEvent);
  }

  if (Array.isArray(value.messaging)) {
    for (const item of value.messaging) {
      const event = buildEventFromMessengerShape(item, entry, field);
      if (event) {
        events.push(event);
      }
    }
  }

  if (Array.isArray(value.messages)) {
    for (const item of value.messages) {
      const itemRecord = isRecord(item) ? item : null;
      if (!itemRecord) {
        continue;
      }

      const event = buildEventFromMessengerShape(
        {
          sender: value.from ?? value.sender,
          recipient: value.to ?? value.recipient,
          timestamp: value.timestamp ?? value.time ?? entry.time,
          message: itemRecord.message ?? itemRecord,
        },
        entry,
        field
      );

      if (event) {
        events.push(event);
      }
    }
  }

  return events;
}

export function extractInstagramIncomingMessages(payload: unknown): InstagramIncomingMessage[] {
  const parsed = isRecord(payload) ? (payload as MetaWebhookPayload) : null;
  if (!parsed?.entry || !Array.isArray(parsed.entry)) {
    return [];
  }

  const events: InstagramIncomingMessage[] = [];
  const seen = new Set<string>();

  for (const entry of parsed.entry) {
    if (!isRecord(entry)) {
      continue;
    }

    const typedEntry = entry as MetaWebhookEntry;

    if (Array.isArray(typedEntry.messaging)) {
      for (const candidate of typedEntry.messaging) {
        const event = buildEventFromMessengerShape(candidate, typedEntry, 'messages');
        if (!event) {
          continue;
        }

        const key = buildEventKey(event);
        if (!seen.has(key)) {
          seen.add(key);
          events.push(event);
        }
      }
    }

    if (Array.isArray(typedEntry.changes)) {
      for (const change of typedEntry.changes) {
        for (const event of normalizeChangeEvent(change, typedEntry)) {
          const key = buildEventKey(event);
          if (!seen.has(key)) {
            seen.add(key);
            events.push(event);
          }
        }
      }
    }
  }

  return events;
}

function normalizeOpenClawMessages(payload: unknown): string[] {
  if (typeof payload === 'string') {
    const trimmed = payload.trim();
    return trimmed ? [trimmed] : [];
  }

  if (!isRecord(payload)) {
    return [];
  }

  const messages: string[] = [];

  const directKeys = ['reply', 'text'];
  for (const key of directKeys) {
    const value = getString(payload[key]);
    if (value) {
      messages.push(value);
    }
  }

  const messageField = payload.message;
  if (typeof messageField === 'string' && messageField.trim()) {
    messages.push(messageField.trim());
  } else if (isRecord(messageField)) {
    const text = getString(messageField.text);
    if (text) {
      messages.push(text);
    }
  }

  const collectionKeys = ['replies', 'messages'];
  for (const key of collectionKeys) {
    const value = payload[key];
    if (!Array.isArray(value)) {
      continue;
    }

    for (const item of value) {
      if (typeof item === 'string' && item.trim()) {
        messages.push(item.trim());
        continue;
      }

      if (isRecord(item)) {
        const text = getString(item.text) ?? getString(item.reply);
        if (text) {
          messages.push(text);
        }
      }
    }
  }

  return messages.filter(Boolean);
}

export async function fetchOpenClawReply(event: InstagramIncomingMessage): Promise<string[]> {
  if (!OPENCLAW_WEBHOOK_URL) {
    return INSTAGRAM_FALLBACK_REPLY ? [INSTAGRAM_FALLBACK_REPLY] : [];
  }

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (OPENCLAW_API_KEY) {
    headers.Authorization = `Bearer ${OPENCLAW_API_KEY}`;
  }

  try {
    const response = await fetch(OPENCLAW_WEBHOOK_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        channel: 'instagram',
        sender: {
          id: event.senderId,
        },
        recipient: {
          id: event.recipientId,
        },
        message: {
          id: event.messageId,
          text: event.text,
          attachments: event.attachments,
          timestamp: event.timestamp,
          source_field: event.sourceField,
        },
        raw_event: event.rawEvent,
      }),
      signal: AbortSignal.timeout(Math.max(1000, OPENCLAW_TIMEOUT_MS)),
    });

    if (!response.ok) {
      console.error('[Instagram] OpenClaw request failed:', response.status, await response.text());
      return INSTAGRAM_FALLBACK_REPLY ? [INSTAGRAM_FALLBACK_REPLY] : [];
    }

    const contentType = response.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      return normalizeOpenClawMessages(await response.json());
    }

    return normalizeOpenClawMessages(await response.text());
  } catch (error) {
    console.error('[Instagram] OpenClaw network error:', error);
    return INSTAGRAM_FALLBACK_REPLY ? [INSTAGRAM_FALLBACK_REPLY] : [];
  }
}

export async function sendInstagramTextMessage(recipientId: string, text: string): Promise<void> {
  const trimmedText = text.trim();
  if (!trimmedText) {
    return;
  }

  if (!INSTAGRAM_PAGE_ACCESS_TOKEN) {
    console.warn('[Instagram] Reply skipped - INSTAGRAM_PAGE_ACCESS_TOKEN is not configured');
    return;
  }

  const url = new URL(`https://graph.facebook.com/${INSTAGRAM_GRAPH_API_VERSION}/me/messages`);
  url.searchParams.set('access_token', INSTAGRAM_PAGE_ACCESS_TOKEN);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      recipient: { id: recipientId },
      messaging_type: 'RESPONSE',
      message: { text: trimmedText },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Instagram Send API error (${response.status}): ${errorText}`);
  }
}
