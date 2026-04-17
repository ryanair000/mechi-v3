export type SupportBridgeDisposition = 'reply' | 'clarify' | 'escalate';

export interface SupportBridgeConversationMessage {
  role: 'user' | 'assistant';
  sender: 'user' | 'ai' | 'admin' | 'system';
  text: string;
  messageType: string;
  createdAt: string;
}

export interface SupportBridgeRequest {
  thread_id: string;
  phone: string;
  user_summary: unknown | null;
  conversation: SupportBridgeConversationMessage[];
  mechi_context: string;
  system_prompt: string;
  allowed_topics: string[];
  blocked_topics: string[];
}

export interface SupportBridgeResponse {
  disposition: SupportBridgeDisposition;
  reply_text: string | null;
  confidence: number | null;
  tags: string[];
  escalation_reason: string | null;
}

function getBridgeBaseUrl() {
  return (process.env.MECHI_OPENCLAW_BRIDGE_URL ?? '').trim();
}

function getBridgeToken() {
  return (process.env.MECHI_OPENCLAW_BRIDGE_TOKEN ?? '').trim();
}

function getBridgeUrl() {
  const configured = getBridgeBaseUrl();
  if (!configured) {
    return '';
  }

  const url = new URL(configured);
  if (url.pathname === '/' || url.pathname === '') {
    url.pathname = '/v1/mechi-support-reply';
  }
  return url.toString();
}

function clampConfidence(value: unknown) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return null;
  }

  return Math.min(1, Math.max(0, value));
}

function normalizeDisposition(value: unknown, hasReplyText: boolean): SupportBridgeDisposition {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';

  if (
    normalized === 'reply' ||
    normalized === 'answer' ||
    normalized === 'answered' ||
    normalized === 'response' ||
    normalized === 'responded' ||
    normalized.includes('reply') ||
    normalized.includes('answer')
  ) {
    return 'reply';
  }

  if (
    normalized === 'clarify' ||
    normalized === 'clarification' ||
    normalized === 'question' ||
    normalized === 'needs_clarification' ||
    normalized === 'need_clarification' ||
    normalized === 'needs-clarification' ||
    normalized.includes('clarif') ||
    normalized.includes('question')
  ) {
    return 'clarify';
  }

  if (
    normalized === 'escalate' ||
    normalized === 'escalation' ||
    normalized === 'escalate_to_human' ||
    normalized === 'human' ||
    normalized.includes('escal') ||
    normalized.includes('human')
  ) {
    return 'escalate';
  }

  return hasReplyText ? 'clarify' : 'escalate';
}

function normalizeBridgeResponse(value: unknown): SupportBridgeResponse {
  const payload = (value ?? {}) as Record<string, unknown>;
  const replyText =
    typeof payload.reply_text === 'string' && payload.reply_text.trim().length > 0
      ? payload.reply_text.trim()
      : null;
  const disposition = normalizeDisposition(payload.disposition, Boolean(replyText));
  const tags = Array.isArray(payload.tags)
    ? payload.tags.filter((tag): tag is string => typeof tag === 'string')
    : [];

  return {
    disposition,
    reply_text: replyText,
    confidence: clampConfidence(payload.confidence),
    tags,
    escalation_reason:
      typeof payload.escalation_reason === 'string' && payload.escalation_reason.trim().length > 0
        ? payload.escalation_reason.trim()
        : null,
  };
}

export async function requestSupportReply(
  input: SupportBridgeRequest
): Promise<SupportBridgeResponse> {
  const bridgeUrl = getBridgeUrl();
  const bridgeToken = getBridgeToken();

  if (!bridgeUrl || !bridgeToken) {
    throw new Error('OpenClaw support bridge is not configured');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25_000);

  try {
    const response = await fetch(bridgeUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${bridgeToken}`,
        'Content-Type': 'application/json',
        'X-Mechi-Source': 'mechi-v3',
      },
      body: JSON.stringify(input),
      signal: controller.signal,
    });

    const rawText = await response.text();
    let parsed: unknown = null;

    try {
      parsed = rawText ? JSON.parse(rawText) : null;
    } catch {
      parsed = rawText;
    }

    if (!response.ok) {
      const errorMessage =
        parsed && typeof parsed === 'object' && 'error' in parsed && typeof parsed.error === 'string'
          ? parsed.error
          : `Bridge request failed with status ${response.status}`;
      throw new Error(errorMessage);
    }

    return normalizeBridgeResponse(parsed);
  } finally {
    clearTimeout(timeout);
  }
}
