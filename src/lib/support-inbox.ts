import crypto from 'node:crypto';
import { createServiceClient } from '@/lib/supabase';
import { getPhoneLookupVariants, normalizePhoneNumber } from '@/lib/phone';
import { maybeExpireProfilePlan } from '@/lib/subscription';
import {
  SUPPORT_ALLOWED_TOPICS,
  SUPPORT_BLOCKED_TOPICS,
  buildMechiSupportContext,
  buildSupportSystemPrompt,
  classifySupportMessage,
  type SupportUserSummary,
} from '@/lib/support-context';
import { requestSupportReply, type SupportBridgeConversationMessage } from '@/lib/openclaw-bridge';
import { executeWhatsAppPlayerAction } from '@/lib/whatsapp-player-actions';
import {
  formatInstagramDeliveryError,
  sendSupportInstagramMessage,
} from '@/lib/instagram';
import { formatWhatsAppDeliveryError, sendSupportWhatsAppMessage } from '@/lib/whatsapp';
import { writeAuditLog } from '@/lib/audit';
import type {
  GameKey,
  PlatformKey,
  Profile,
  SupportMessage,
  SupportThread,
  SupportThreadChannel,
  SupportThreadPriority,
  SupportThreadStatus,
} from '@/types';

const SUPPORT_REPLY_MIN_CONFIDENCE = 0.55;
const CONVERSATION_WINDOW = 8;

type SupportProfileRow = {
  id: string;
  username: string;
  phone: string;
  whatsapp_number?: string | null;
  plan?: string | null;
  plan_expires_at?: string | null;
  region?: string | null;
  selected_games?: string[] | null;
  platforms?: PlatformKey[] | null;
  role?: string | null;
  is_banned?: boolean | null;
};

type SupportThreadRow = {
  id: string;
  channel: SupportThreadChannel;
  phone?: string | null;
  wa_id: string;
  contact_name?: string | null;
  user_id?: string | null;
  status: SupportThreadStatus;
  priority: SupportThreadPriority;
  assigned_to?: string | null;
  escalation_reason?: string | null;
  last_message_at: string;
  last_ai_reply_at?: string | null;
  created_at: string;
  updated_at: string;
};

type SupportMessageRow = {
  id: string;
  thread_id: string;
  direction: 'inbound' | 'outbound';
  sender_type: 'user' | 'ai' | 'admin' | 'system';
  body?: string | null;
  message_type: string;
  provider_message_id?: string | null;
  meta?: Record<string, unknown> | null;
  ai_confidence?: number | null;
  created_at: string;
};

type WhatsAppWebhookPayload = {
  entry?: Array<{
    changes?: Array<{
      value?: {
        contacts?: Array<{
          wa_id?: string;
          profile?: { name?: string };
        }>;
        messages?: Array<Record<string, unknown>>;
        statuses?: Array<Record<string, unknown>>;
      };
    }>;
  }>;
};

type InstagramWebhookPayload = {
  entry?: Array<{
    changes?: Array<{
      field?: string;
      value?: Record<string, unknown>;
    }>;
  }>;
};

type NormalizedSupportMessage = {
  id: string;
  channel: SupportThreadChannel;
  from: string;
  phone?: string | null;
  messageType: string;
  body: string | null;
  timestampIso: string;
  contactName?: string | null;
  raw: Record<string, unknown>;
};

type NormalizedWhatsAppMessage = NormalizedSupportMessage & {
  channel: 'whatsapp';
  phone: string;
};

type NormalizedWhatsAppStatus = {
  providerMessageId: string;
  status: string;
  timestampIso: string;
  recipientId?: string | null;
  raw: Record<string, unknown>;
};

type SupportCounts = Record<SupportThreadStatus, number>;

export interface SupportThreadListResult {
  threads: SupportThread[];
  counts: SupportCounts;
}

export interface SupportThreadDetailResult {
  thread: SupportThread;
  messages: SupportMessage[];
  contactMatches: Array<
    Pick<Profile, 'id' | 'username' | 'phone' | 'whatsapp_number' | 'plan' | 'region'>
  >;
}

function getWhatsAppAppSecret() {
  return (
    process.env.WHATSAPP_APP_SECRET ??
    process.env.META_APP_SECRET ??
    process.env.INSTAGRAM_APP_SECRET ??
    ''
  ).trim();
}

function getInstagramAppSecret() {
  return (
    process.env.INSTAGRAM_APP_SECRET ??
    process.env.META_APP_SECRET ??
    process.env.WHATSAPP_APP_SECRET ??
    ''
  ).trim();
}

function safeTimingEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function hasValidMetaSignature(
  rawBody: string,
  signatureHeader: string | null,
  appSecret: string
) {
  if (!appSecret || !signatureHeader) {
    return false;
  }

  const [algorithm, signature] = signatureHeader.split('=');
  if (algorithm !== 'sha256' || !signature) {
    return false;
  }

  const digest = crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex');
  return safeTimingEqual(signature, digest);
}

export function hasValidWhatsAppSignature(rawBody: string, signatureHeader: string | null) {
  return hasValidMetaSignature(rawBody, signatureHeader, getWhatsAppAppSecret());
}

export function hasValidInstagramSignature(rawBody: string, signatureHeader: string | null) {
  return hasValidMetaSignature(rawBody, signatureHeader, getInstagramAppSecret());
}

function getSupabase() {
  return createServiceClient();
}

function uniqueIds(values: Array<string | null | undefined>) {
  return [...new Set(values.filter((value): value is string => typeof value === 'string' && value.length > 0))];
}

function toIsoFromUnix(value: unknown) {
  if (typeof value === 'string' && /^\d+$/.test(value)) {
    return new Date(Number(value) * 1000).toISOString();
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return new Date(value * 1000).toISOString();
  }

  return new Date().toISOString();
}

function clampPriority(a: SupportThreadPriority, b: SupportThreadPriority): SupportThreadPriority {
  const priorityRank: Record<SupportThreadPriority, number> = {
    low: 0,
    normal: 1,
    high: 2,
    urgent: 3,
  };

  return priorityRank[a] >= priorityRank[b] ? a : b;
}

function mapSupportUser(
  profile: SupportProfileRow | null | undefined
): SupportThread['user'] | null {
  if (!profile) {
    return null;
  }

  return {
    id: profile.id,
    username: profile.username,
    phone: profile.phone,
    whatsapp_number: profile.whatsapp_number ?? null,
    plan: (profile.plan as 'free' | 'pro' | 'elite' | undefined) ?? 'free',
    region: profile.region ?? 'Unspecified',
    selected_games: (profile.selected_games ?? []) as GameKey[],
    platforms: (profile.platforms ?? []) as PlatformKey[],
  };
}

function mapAssignee(
  profile: Pick<Profile, 'id' | 'username' | 'role'> | null | undefined
): SupportThread['assignee'] | null {
  if (!profile) {
    return null;
  }

  return {
    id: profile.id,
    username: profile.username,
    role: profile.role ?? 'user',
  };
}

function mapSupportMessage(row: SupportMessageRow): SupportMessage {
  return {
    id: row.id,
    thread_id: row.thread_id,
    direction: row.direction,
    sender_type: row.sender_type,
    body: row.body ?? null,
    message_type: row.message_type,
    provider_message_id: row.provider_message_id ?? null,
    meta: row.meta ?? {},
    ai_confidence: row.ai_confidence ?? null,
    created_at: row.created_at,
  };
}

function mapSupportThread(
  row: SupportThreadRow,
  options?: {
    user?: SupportProfileRow | null;
    assignee?: Pick<Profile, 'id' | 'username' | 'role'> | null;
    latestMessage?: SupportMessageRow | null;
  }
): SupportThread {
  return {
    id: row.id,
    channel: row.channel,
    phone: row.phone ?? null,
    wa_id: row.wa_id,
    contact_name: row.contact_name ?? null,
    user_id: row.user_id ?? null,
    status: row.status,
    priority: row.priority,
    assigned_to: row.assigned_to ?? null,
    escalation_reason: row.escalation_reason ?? null,
    last_message_at: row.last_message_at,
    last_ai_reply_at: row.last_ai_reply_at ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
    user: mapSupportUser(options?.user),
    assignee: mapAssignee(options?.assignee),
    latest_message: options?.latestMessage ? mapSupportMessage(options.latestMessage) : null,
  };
}

function getInlineMessageBody(message: Record<string, unknown>) {
  const type = String(message.type ?? '').trim().toLowerCase();

  if (type === 'text') {
    const text = message.text as { body?: string } | undefined;
    return { messageType: 'text', body: typeof text?.body === 'string' ? text.body.trim() : null };
  }

  if (type === 'button') {
    const button = message.button as { text?: string } | undefined;
    return { messageType: 'text', body: typeof button?.text === 'string' ? button.text.trim() : null };
  }

  if (type === 'interactive') {
    const interactive = message.interactive as
      | {
          button_reply?: { title?: string };
          list_reply?: { title?: string };
        }
      | undefined;
    const body = interactive?.button_reply?.title ?? interactive?.list_reply?.title ?? null;
    return { messageType: body ? 'text' : 'interactive', body: body?.trim() ?? null };
  }

  const captionCarrier = message[type] as { caption?: string } | undefined;
  return {
    messageType: type || 'unsupported',
    body: typeof captionCarrier?.caption === 'string' ? captionCarrier.caption.trim() : null,
  };
}

function extractNormalizedWhatsAppMessages(payload: WhatsAppWebhookPayload): NormalizedWhatsAppMessage[] {
  const normalized: NormalizedWhatsAppMessage[] = [];

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      if (!value?.messages?.length) {
        continue;
      }

      const contactNames = new Map<string, string>();
      for (const contact of value.contacts ?? []) {
        if (contact.wa_id && contact.profile?.name) {
          contactNames.set(contact.wa_id, contact.profile.name);
        }
      }

      for (const message of value.messages) {
        const id = String(message.id ?? '').trim();
        const from = String(message.from ?? '').trim();
        if (!id || !from) {
          continue;
        }

        const inline = getInlineMessageBody(message);
        normalized.push({
          id,
          channel: 'whatsapp',
          from,
          phone: normalizePhoneNumber(from),
          messageType: inline.messageType,
          body: inline.body,
          timestampIso: toIsoFromUnix(message.timestamp),
          contactName: contactNames.get(from) ?? null,
          raw: message,
        });
      }
    }
  }

  return normalized;
}

function extractNormalizedStatuses(payload: WhatsAppWebhookPayload): NormalizedWhatsAppStatus[] {
  const normalized: NormalizedWhatsAppStatus[] = [];

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      if (!value?.statuses?.length) {
        continue;
      }

      for (const status of value.statuses) {
        const providerMessageId = String(status.id ?? '').trim();
        const normalizedStatus = String(status.status ?? '').trim().toLowerCase();
        if (!providerMessageId || !normalizedStatus) {
          continue;
        }

        normalized.push({
          providerMessageId,
          status: normalizedStatus,
          timestampIso: toIsoFromUnix(status.timestamp),
          recipientId:
            typeof status.recipient_id === 'string' && status.recipient_id.trim().length > 0
              ? status.recipient_id.trim()
              : null,
          raw: status,
        });
      }
    }
  }

  return normalized;
}

function extractNormalizedInstagramMessages(payload: InstagramWebhookPayload): NormalizedSupportMessage[] {
  const normalized: NormalizedSupportMessage[] = [];

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== 'messages') {
        continue;
      }

      const value = change.value ?? {};
      const sender = value.sender as { id?: string; username?: string } | undefined;
      const message = value.message as
        | {
            mid?: string;
            text?: string;
            is_deleted?: boolean;
            is_self?: boolean;
            attachments?: Array<{ type?: string; payload?: { url?: string } }>;
            reply_to?: Record<string, unknown>;
          }
        | undefined;

      const from = typeof sender?.id === 'string' ? sender.id.trim() : '';
      const id = typeof message?.mid === 'string' ? message.mid.trim() : '';

      if (!from || !id || !message || message.is_deleted || message.is_self) {
        continue;
      }

      const textBody = typeof message.text === 'string' ? message.text.trim() : null;
      const firstAttachment = Array.isArray(message.attachments) ? message.attachments[0] : null;
      const attachmentType =
        typeof firstAttachment?.type === 'string' && firstAttachment.type.trim().length > 0
          ? firstAttachment.type.trim().toLowerCase()
          : null;
      const attachmentUrl =
        typeof firstAttachment?.payload?.url === 'string' && firstAttachment.payload.url.trim().length > 0
          ? firstAttachment.payload.url.trim()
          : null;

      let body = textBody;
      let messageType = textBody ? 'text' : attachmentType ?? 'unsupported';

      if (!body && attachmentUrl) {
        body = attachmentUrl;
      }

      if (!body && message.reply_to) {
        body = '[Story reply]';
        messageType = 'reply';
      }

      normalized.push({
        id,
        channel: 'instagram',
        from,
        phone: null,
        messageType,
        body: body ?? null,
        timestampIso: toIsoFromUnix(value.timestamp),
        contactName:
          typeof sender?.username === 'string' && sender.username.trim().length > 0
            ? sender.username.trim()
            : null,
        raw: value,
      });
    }
  }

  return normalized;
}

async function findLinkedProfileByPhone(phoneOrWaId: string) {
  const supabase = getSupabase();
  const variants = getPhoneLookupVariants(phoneOrWaId);

  const { data: whatsappMatches } = await supabase
    .from('profiles')
    .select(
      'id, username, phone, whatsapp_number, plan, plan_expires_at, region, selected_games, platforms, role, is_banned'
    )
    .in('whatsapp_number', variants)
    .limit(1);

  const firstWhatsapp = ((whatsappMatches ?? []) as SupportProfileRow[])[0];
  if (firstWhatsapp) {
    const resolvedPlan = await maybeExpireProfilePlan(
      {
        id: firstWhatsapp.id,
        plan: firstWhatsapp.plan ?? 'free',
        plan_expires_at: firstWhatsapp.plan_expires_at ?? null,
      },
      supabase
    );

    return {
      ...firstWhatsapp,
      plan: resolvedPlan,
    } satisfies SupportProfileRow;
  }

  const { data: phoneMatches } = await supabase
    .from('profiles')
    .select(
      'id, username, phone, whatsapp_number, plan, plan_expires_at, region, selected_games, platforms, role, is_banned'
    )
    .in('phone', variants)
    .limit(1);

  const firstPhone = ((phoneMatches ?? []) as SupportProfileRow[])[0];
  if (!firstPhone) {
    return null;
  }

  const resolvedPlan = await maybeExpireProfilePlan(
    {
      id: firstPhone.id,
      plan: firstPhone.plan ?? 'free',
      plan_expires_at: firstPhone.plan_expires_at ?? null,
    },
    supabase
  );

  return {
    ...firstPhone,
    plan: resolvedPlan,
  } satisfies SupportProfileRow;
}

function toSupportUserSummary(profile: SupportProfileRow | null): SupportUserSummary | null {
  if (!profile) {
    return null;
  }

  return {
    id: profile.id,
    username: profile.username,
    phone: profile.phone,
    whatsapp_number: profile.whatsapp_number ?? null,
    plan: (profile.plan as SupportUserSummary['plan']) ?? 'free',
    region: profile.region ?? null,
    platforms: (profile.platforms ?? []) as PlatformKey[],
    selected_games: (profile.selected_games ?? []) as GameKey[],
    role: profile.role ?? null,
    is_banned: Boolean(profile.is_banned),
  };
}

async function getExistingThread(channel: SupportThreadChannel, externalId: string) {
  const supabase = getSupabase();
  const { data } = await supabase
    .from('support_threads')
    .select('*')
    .eq('channel', channel)
    .eq('wa_id', externalId)
    .maybeSingle();

  return (data as SupportThreadRow | null) ?? null;
}

async function updateThread(
  threadId: string,
  patch: Partial<SupportThreadRow> & Record<string, unknown>
) {
  const supabase = getSupabase();
  const { data } = await supabase
    .from('support_threads')
    .update({
      ...patch,
      updated_at: new Date().toISOString(),
    })
    .eq('id', threadId)
    .select('*')
    .single();

  return (data as SupportThreadRow | null) ?? null;
}

async function upsertInboundThread(params: {
  channel: SupportThreadChannel;
  externalId: string;
  phone?: string | null;
  contactName?: string | null;
  user: SupportProfileRow | null;
  lastMessageAt: string;
  priority: SupportThreadPriority;
}) {
  const supabase = getSupabase();
  const nowIso = new Date().toISOString();
  const existing = await getExistingThread(params.channel, params.externalId);

  if (existing) {
    const nextStatus: SupportThreadStatus =
      existing.status === 'resolved'
        ? 'open'
        : existing.status === 'blocked'
          ? 'blocked'
          : existing.status;

    const { data } = await supabase
      .from('support_threads')
      .update({
        phone: params.phone ?? existing.phone ?? null,
        contact_name: params.contactName ?? existing.contact_name ?? null,
        user_id: params.user?.id ?? existing.user_id ?? null,
        priority: clampPriority(existing.priority, params.priority),
        status: nextStatus,
        last_message_at: params.lastMessageAt,
        updated_at: nowIso,
      })
      .eq('id', existing.id)
      .select('*')
      .single();

    return (data as SupportThreadRow | null) ?? existing;
  }

  const { data } = await supabase
    .from('support_threads')
    .insert({
      channel: params.channel,
      phone: params.phone ?? null,
      wa_id: params.externalId,
      contact_name: params.contactName ?? null,
      user_id: params.user?.id ?? null,
      status: 'open',
      priority: params.priority,
      last_message_at: params.lastMessageAt,
      updated_at: nowIso,
    })
    .select('*')
    .single();

  return data as SupportThreadRow;
}

async function insertSupportMessageRow(row: {
  thread_id: string;
  direction: SupportMessage['direction'];
  sender_type: SupportMessage['sender_type'];
  body?: string | null;
  message_type: string;
  provider_message_id?: string | null;
  meta?: Record<string, unknown>;
  ai_confidence?: number | null;
  created_at?: string;
}) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('support_messages')
    .insert({
      ...row,
      meta: row.meta ?? {},
      ai_confidence: row.ai_confidence ?? null,
      created_at: row.created_at ?? new Date().toISOString(),
    })
    .select('*')
    .single();

  if (error) {
    if (error.code === '23505') {
      return null;
    }
    throw error;
  }

  return (data as SupportMessageRow | null) ?? null;
}

async function getMessageByProviderId(providerMessageId: string) {
  const supabase = getSupabase();
  const { data } = await supabase
    .from('support_messages')
    .select('*')
    .eq('provider_message_id', providerMessageId)
    .maybeSingle();

  return (data as SupportMessageRow | null) ?? null;
}

async function getConversationWindow(threadId: string): Promise<SupportBridgeConversationMessage[]> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from('support_messages')
    .select('sender_type, body, message_type, created_at')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: false })
    .limit(CONVERSATION_WINDOW);

  return ((data ?? []) as Array<{
    sender_type: SupportMessage['sender_type'];
    body?: string | null;
    message_type: string;
    created_at: string;
  }>)
    .reverse()
    .map((message) => ({
      role: message.sender_type === 'user' ? 'user' : 'assistant',
      sender: message.sender_type,
      text: message.body?.trim() || `[${message.message_type} message]`,
      messageType: message.message_type,
      createdAt: message.created_at,
    }));
}

async function sendOutboundSupportMessage(params: {
  thread: SupportThreadRow;
  senderType: SupportMessage['sender_type'];
  message: string;
  messageType?: string;
  aiConfidence?: number | null;
  meta?: Record<string, unknown>;
  successStatus: SupportThreadStatus;
  failureStatus?: SupportThreadStatus;
  escalationReason?: string | null;
}) {
  const delivery =
    params.thread.channel === 'instagram'
      ? await sendSupportInstagramMessage({
          recipientId: params.thread.wa_id,
          message: params.message,
        })
      : await sendSupportWhatsAppMessage({
          whatsappNumber: params.thread.wa_id || params.thread.phone || '',
          message: params.message,
        });

  const nowIso = new Date().toISOString();
  const deliveryError =
    params.thread.channel === 'instagram'
      ? formatInstagramDeliveryError(
          delivery as Parameters<typeof formatInstagramDeliveryError>[0]
        )
      : formatWhatsAppDeliveryError(
          delivery as Parameters<typeof formatWhatsAppDeliveryError>[0]
        );
  const deliveryMeta = {
    ...(params.meta ?? {}),
    delivery: {
      channel: params.thread.channel,
      status: delivery.ok ? 'sent' : 'failed',
      transport_status: delivery.status,
      message_id: delivery.messageId ?? null,
      participant_id:
        'recipientId' in delivery ? delivery.recipientId ?? null : ('waId' in delivery ? delivery.waId ?? null : null),
      error: delivery.ok ? null : deliveryError,
    },
    ...(params.thread.channel === 'whatsapp'
      ? {
          whatsapp: {
            status: delivery.ok ? 'sent' : 'failed',
            transport_status: delivery.status,
            message_id: delivery.messageId ?? null,
            wa_id: 'waId' in delivery ? delivery.waId ?? null : null,
            error: delivery.ok ? null : deliveryError,
          },
        }
      : {
          instagram: {
            status: delivery.ok ? 'sent' : 'failed',
            transport_status: delivery.status,
            message_id: delivery.messageId ?? null,
            recipient_id: 'recipientId' in delivery ? delivery.recipientId ?? null : null,
            error: delivery.ok ? null : deliveryError,
          },
        }),
  };

  const supportMessage = await insertSupportMessageRow({
    thread_id: params.thread.id,
    direction: 'outbound',
    sender_type: params.senderType,
    body: params.message,
    message_type: params.messageType ?? 'text',
    provider_message_id: delivery.messageId ?? null,
    meta: deliveryMeta,
    ai_confidence: params.aiConfidence ?? null,
    created_at: nowIso,
  });

  const nextStatus = delivery.ok ? params.successStatus : params.failureStatus ?? 'waiting_on_human';
  const thread = await updateThread(params.thread.id, {
    status: nextStatus,
    last_message_at: nowIso,
    last_ai_reply_at: params.senderType === 'ai' && delivery.ok ? nowIso : params.thread.last_ai_reply_at ?? null,
    escalation_reason:
      nextStatus === 'waiting_on_human' || nextStatus === 'blocked'
        ? params.escalationReason ?? params.thread.escalation_reason ?? null
        : null,
  });

  return {
    delivery,
    thread,
    message: supportMessage ? mapSupportMessage(supportMessage) : null,
  };
}

function needsHumanEscalationForBridgeResult(result: {
  disposition: 'reply' | 'clarify' | 'escalate';
  reply_text: string | null;
  confidence: number | null;
}) {
  if (result.disposition === 'escalate') {
    return true;
  }

  if (!result.reply_text) {
    return true;
  }

  return (result.confidence ?? 0) < SUPPORT_REPLY_MIN_CONFIDENCE;
}

async function recordOutboundStatus(status: NormalizedWhatsAppStatus) {
  const existing = await getMessageByProviderId(status.providerMessageId);
  if (!existing) {
    return false;
  }

  const nextMeta = {
    ...(existing.meta ?? {}),
    delivery: {
      ...(((existing.meta ?? {}) as { delivery?: Record<string, unknown> }).delivery ?? {}),
      status: status.status,
      status_timestamp: status.timestampIso,
      participant_id: status.recipientId ?? null,
      last_status_payload: status.raw,
    },
    whatsapp: {
      ...(((existing.meta ?? {}) as { whatsapp?: Record<string, unknown> }).whatsapp ?? {}),
      status: status.status,
      status_timestamp: status.timestampIso,
      recipient_id: status.recipientId ?? null,
      last_status_payload: status.raw,
    },
  };

  const supabase = getSupabase();
  await supabase
    .from('support_messages')
    .update({ meta: nextMeta })
    .eq('id', existing.id);

  await updateThread(existing.thread_id, {
    updated_at: new Date().toISOString(),
  });

  return true;
}

async function handleInboundSupportMessage(message: NormalizedSupportMessage) {
  const existingMessage = await getMessageByProviderId(message.id);
  if (existingMessage) {
    return { duplicate: true };
  }

  const existingThread = await getExistingThread(message.channel, message.from);
  const linkedProfile =
    message.channel === 'whatsapp' ? await findLinkedProfileByPhone(message.from) : null;
  const userSummary = toSupportUserSummary(linkedProfile);
  const classification = classifySupportMessage({
    body: message.body,
    messageType: message.messageType,
    user: userSummary,
    threadStatus: existingThread?.status ?? null,
  });

  const thread = await upsertInboundThread({
    channel: message.channel,
    externalId: message.from,
    phone: message.phone ?? null,
    contactName: message.contactName ?? null,
    user: linkedProfile,
    lastMessageAt: message.timestampIso,
    priority: classification.priority,
  });

  await insertSupportMessageRow({
    thread_id: thread.id,
    direction: 'inbound',
    sender_type: 'user',
    body: message.body ?? null,
    message_type: message.messageType,
    provider_message_id: message.id,
    meta: {
      contact_name: message.contactName ?? null,
      raw: message.raw,
    },
    created_at: message.timestampIso,
  });

  if (thread.status === 'blocked') {
    return { duplicate: false, escalated: true, reason: 'blocked_thread' };
  }

  if (classification.route === 'human') {
    const humanStatus =
      classification.reason === 'banned_account' ? 'blocked' : 'waiting_on_human';

    await updateThread(thread.id, {
      status: humanStatus,
      priority: clampPriority(thread.priority, classification.priority),
      escalation_reason: classification.reason,
      last_message_at: message.timestampIso,
    });

    if (classification.acknowledgement) {
      await sendOutboundSupportMessage({
        thread,
        senderType: 'system',
        message: classification.acknowledgement,
        meta: {
          source: 'classification',
          reason: classification.reason,
          tags: classification.tags,
        },
        successStatus: humanStatus,
        escalationReason: classification.reason,
      });
    }

    return { duplicate: false, escalated: true, reason: classification.reason };
  }

  await updateThread(thread.id, {
    status: 'waiting_on_ai',
    priority: clampPriority(thread.priority, classification.priority),
    escalation_reason: null,
    last_message_at: message.timestampIso,
  });

  const actionResult = await executeWhatsAppPlayerAction({
    body: message.body,
    user: userSummary,
  });

  if (actionResult.handled) {
    await sendOutboundSupportMessage({
      thread,
      senderType: actionResult.senderType,
      message: actionResult.message,
      meta: actionResult.meta,
      successStatus: 'open',
      failureStatus: 'waiting_on_human',
      escalationReason: 'reply_delivery_failed',
    });

    return { duplicate: false, escalated: false, reason: null };
  }

  const conversation = await getConversationWindow(thread.id);

  try {
    const bridgeResult = await requestSupportReply({
      thread_id: thread.id,
      phone: thread.phone ?? `${thread.channel}:${thread.wa_id}`,
      user_summary: userSummary,
      conversation,
      mechi_context: buildMechiSupportContext(userSummary),
      system_prompt: buildSupportSystemPrompt(),
      allowed_topics: SUPPORT_ALLOWED_TOPICS,
      blocked_topics: SUPPORT_BLOCKED_TOPICS,
    });

    if (needsHumanEscalationForBridgeResult(bridgeResult)) {
      const escalationReason =
        bridgeResult.escalation_reason ??
        (bridgeResult.disposition === 'escalate' ? 'bridge_requested_human' : 'low_confidence');

      await sendOutboundSupportMessage({
        thread,
        senderType: 'system',
        message:
          'I’m not fully sure on that one, so I’ve handed it to the Mechi support team to pick up here.',
        meta: {
          source: 'bridge_fallback',
          bridge_disposition: bridgeResult.disposition,
          bridge_tags: bridgeResult.tags,
          bridge_confidence: bridgeResult.confidence,
        },
        successStatus: 'waiting_on_human',
        escalationReason,
      });

      return { duplicate: false, escalated: true, reason: escalationReason };
    }

    await sendOutboundSupportMessage({
      thread,
      senderType: 'ai',
      message: bridgeResult.reply_text ?? '',
      aiConfidence: bridgeResult.confidence,
      meta: {
        source: 'openclaw_bridge',
        bridge_disposition: bridgeResult.disposition,
        bridge_tags: bridgeResult.tags,
      },
      successStatus: 'open',
      failureStatus: 'waiting_on_human',
      escalationReason: 'reply_delivery_failed',
    });

    return { duplicate: false, escalated: false, reason: null };
  } catch (error) {
    console.error('[Support Inbox] Bridge error:', error);

    await sendOutboundSupportMessage({
      thread,
      senderType: 'system',
      message:
        'I hit a support handoff snag on my side, so I’ve moved this to the Mechi support team for a human follow-up.',
      meta: {
        source: 'bridge_error',
        error: error instanceof Error ? error.message : 'Unknown bridge error',
      },
      successStatus: 'waiting_on_human',
      escalationReason: 'bridge_error',
    });

    return { duplicate: false, escalated: true, reason: 'bridge_error' };
  }
}

export async function processWhatsAppWebhook(payload: WhatsAppWebhookPayload) {
  const statuses = extractNormalizedStatuses(payload);
  const messages = extractNormalizedWhatsAppMessages(payload);
  let processedStatuses = 0;
  let processedMessages = 0;

  for (const status of statuses) {
    const updated = await recordOutboundStatus(status);
    if (updated) {
      processedStatuses += 1;
    }
  }

  for (const message of messages) {
    const result = await handleInboundSupportMessage(message);
    if (!result.duplicate) {
      processedMessages += 1;
    }
  }

  return {
    processedMessages,
    processedStatuses,
  };
}

export async function processInstagramWebhook(payload: InstagramWebhookPayload) {
  const messages = extractNormalizedInstagramMessages(payload);
  let processedMessages = 0;

  for (const message of messages) {
    const result = await handleInboundSupportMessage(message);
    if (!result.duplicate) {
      processedMessages += 1;
    }
  }

  return {
    processedMessages,
    processedStatuses: 0,
  };
}

async function getSupportProfilesByIds(ids: string[]) {
  if (ids.length === 0) {
    return new Map<string, SupportProfileRow>();
  }

  const supabase = getSupabase();
  const { data } = await supabase
    .from('profiles')
    .select(
      'id, username, phone, whatsapp_number, plan, region, selected_games, platforms, role, is_banned'
    )
    .in('id', ids);

  return new Map(
    ((data ?? []) as SupportProfileRow[]).map((profile) => [profile.id, profile])
  );
}

async function getAssigneesByIds(ids: string[]) {
  if (ids.length === 0) {
    return new Map<string, Pick<Profile, 'id' | 'username' | 'role'>>();
  }

  const supabase = getSupabase();
  const { data } = await supabase.from('profiles').select('id, username, role').in('id', ids);
  return new Map(
    (((data ?? []) as Array<Pick<Profile, 'id' | 'username' | 'role'>>) ?? []).map((profile) => [
      profile.id,
      profile,
    ])
  );
}

async function getLatestMessagesByThreadIds(threadIds: string[]) {
  if (threadIds.length === 0) {
    return new Map<string, SupportMessageRow>();
  }

  const supabase = getSupabase();
  const { data } = await supabase
    .from('support_messages')
    .select('id, thread_id, direction, sender_type, body, message_type, provider_message_id, meta, ai_confidence, created_at')
    .in('thread_id', threadIds)
    .order('created_at', { ascending: false });

  const latestMap = new Map<string, SupportMessageRow>();
  for (const row of (data ?? []) as SupportMessageRow[]) {
    if (!latestMap.has(row.thread_id)) {
      latestMap.set(row.thread_id, row);
    }
  }

  return latestMap;
}

function buildEmptyCounts(): SupportCounts {
  return {
    open: 0,
    waiting_on_ai: 0,
    waiting_on_human: 0,
    resolved: 0,
    blocked: 0,
  };
}

export async function getSupportThreadList(params?: {
  status?: SupportThreadStatus | 'all' | null;
  query?: string | null;
  limit?: number;
  offset?: number;
}) {
  const supabase = getSupabase();
  const status = params?.status ?? 'all';
  const limit = Math.min(Math.max(params?.limit ?? 40, 1), 100);
  const offset = Math.max(params?.offset ?? 0, 0);
  const rawQuery = (params?.query ?? '').trim();
  const sanitizedDbQuery = rawQuery.replace(/[%_']/g, '');
  const queryLooksNumeric = /^[+\d\s-]+$/.test(rawQuery) && rawQuery.length > 0;

  let threadQuery = supabase
    .from('support_threads')
    .select('*')
    .order('last_message_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status !== 'all') {
    threadQuery = threadQuery.eq('status', status);
  }

  if (queryLooksNumeric && sanitizedDbQuery) {
    threadQuery = threadQuery.or(
      `phone.ilike.%${sanitizedDbQuery}%,wa_id.ilike.%${sanitizedDbQuery}%`
    );
  }

  const [threadResult, ...countResults] = await Promise.all([
    threadQuery,
    ...(['open', 'waiting_on_ai', 'waiting_on_human', 'resolved', 'blocked'] as SupportThreadStatus[]).map(
      (value) =>
        supabase
          .from('support_threads')
          .select('id', { count: 'exact', head: true })
          .eq('status', value)
    ),
  ]);

  const threads = (threadResult.data ?? []) as SupportThreadRow[];
  const profileIds = uniqueIds(threads.map((thread) => thread.user_id));
  const assigneeIds = uniqueIds(threads.map((thread) => thread.assigned_to));
  const threadIds = threads.map((thread) => thread.id);

  const [profilesById, assigneesById, latestMessagesByThreadId] = await Promise.all([
    getSupportProfilesByIds(profileIds),
    getAssigneesByIds(assigneeIds),
    getLatestMessagesByThreadIds(threadIds),
  ]);

  let mappedThreads = threads.map((thread) =>
    mapSupportThread(thread, {
      user: thread.user_id ? profilesById.get(thread.user_id) ?? null : null,
      assignee: thread.assigned_to ? assigneesById.get(thread.assigned_to) ?? null : null,
      latestMessage: latestMessagesByThreadId.get(thread.id) ?? null,
    })
  );

  if (rawQuery && !queryLooksNumeric) {
    const lowercaseQuery = rawQuery.toLowerCase();
    mappedThreads = mappedThreads.filter((thread) => {
      return [
        thread.phone ?? '',
        thread.wa_id,
        thread.contact_name ?? '',
        thread.user?.username ?? '',
        thread.user?.phone ?? '',
        thread.user?.whatsapp_number ?? '',
        thread.latest_message?.body ?? '',
      ].some((value) => value.toLowerCase().includes(lowercaseQuery));
    });
  }

  const counts = buildEmptyCounts();
  (['open', 'waiting_on_ai', 'waiting_on_human', 'resolved', 'blocked'] as SupportThreadStatus[]).forEach(
    (value, index) => {
      counts[value] = countResults[index].count ?? 0;
    }
  );

  return {
    threads: mappedThreads,
    counts,
  } satisfies SupportThreadListResult;
}

async function resolveContactMatches(thread: SupportThreadRow) {
  const supabase = getSupabase();
  if (thread.channel === 'instagram') {
    const lookup = thread.contact_name?.trim();
    if (!lookup) {
      return [];
    }

    const { data } = await supabase
      .from('profiles')
      .select('id, username, phone, whatsapp_number, plan, region')
      .ilike('username', lookup)
      .limit(5);

    return (data ?? []) as Array<
      Pick<Profile, 'id' | 'username' | 'phone' | 'whatsapp_number' | 'plan' | 'region'>
    >;
  }

  const variants = getPhoneLookupVariants(thread.wa_id || thread.phone || '');
  const [whatsappMatches, phoneMatches] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, username, phone, whatsapp_number, plan, region')
      .in('whatsapp_number', variants)
      .limit(5),
    supabase
      .from('profiles')
      .select('id, username, phone, whatsapp_number, plan, region')
      .in('phone', variants)
      .limit(5),
  ]);

  const merged = new Map<string, Pick<Profile, 'id' | 'username' | 'phone' | 'whatsapp_number' | 'plan' | 'region'>>();
  for (const profile of [
    ...((whatsappMatches.data ?? []) as Array<
      Pick<Profile, 'id' | 'username' | 'phone' | 'whatsapp_number' | 'plan' | 'region'>
    >),
    ...((phoneMatches.data ?? []) as Array<
      Pick<Profile, 'id' | 'username' | 'phone' | 'whatsapp_number' | 'plan' | 'region'>
    >),
  ]) {
    merged.set(profile.id, profile);
  }

  return [...merged.values()];
}

export async function getSupportThreadDetail(threadId: string) {
  const supabase = getSupabase();
  const { data: threadRaw } = await supabase
    .from('support_threads')
    .select('*')
    .eq('id', threadId)
    .maybeSingle();

  const thread = (threadRaw as SupportThreadRow | null) ?? null;
  if (!thread) {
    return null;
  }

  const { data: messagesRaw } = await supabase
    .from('support_messages')
    .select('id, thread_id, direction, sender_type, body, message_type, provider_message_id, meta, ai_confidence, created_at')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true });

  const [profilesById, assigneesById, latestMessagesByThreadId, contactMatches] = await Promise.all([
    getSupportProfilesByIds(uniqueIds([thread.user_id])),
    getAssigneesByIds(uniqueIds([thread.assigned_to])),
    getLatestMessagesByThreadIds([threadId]),
    resolveContactMatches(thread),
  ]);

  return {
    thread: mapSupportThread(thread, {
      user: thread.user_id ? profilesById.get(thread.user_id) ?? null : null,
      assignee: thread.assigned_to ? assigneesById.get(thread.assigned_to) ?? null : null,
      latestMessage: latestMessagesByThreadId.get(thread.id) ?? null,
    }),
    messages: ((messagesRaw ?? []) as SupportMessageRow[]).map(mapSupportMessage),
    contactMatches,
  } satisfies SupportThreadDetailResult;
}

async function resolveRelinkProfile(lookup: string) {
  const supabase = getSupabase();
  const trimmed = lookup.trim();
  if (!trimmed) {
    return null;
  }

  const { data: idMatch } = await supabase
    .from('profiles')
    .select('id, username, phone, whatsapp_number, plan, plan_expires_at, region, selected_games, platforms, role, is_banned')
    .eq('id', trimmed)
    .maybeSingle();

  if (idMatch) {
    return idMatch as SupportProfileRow;
  }

  const { data: usernameMatch } = await supabase
    .from('profiles')
    .select('id, username, phone, whatsapp_number, plan, plan_expires_at, region, selected_games, platforms, role, is_banned')
    .eq('username', trimmed)
    .maybeSingle();

  if (usernameMatch) {
    return usernameMatch as SupportProfileRow;
  }

  return findLinkedProfileByPhone(trimmed);
}

export async function handleSupportThreadAction(params: {
  threadId: string;
  actorId: string;
  action: 'assign' | 'unassign' | 'resolve' | 'reopen' | 'block' | 'relink';
  assignedTo?: string | null;
  lookup?: string | null;
  ipAddress?: string | null;
}) {
  const threadDetail = await getSupportThreadDetail(params.threadId);
  if (!threadDetail) {
    throw new Error('Thread not found');
  }

  let updatePatch: Record<string, unknown> = {};
  let auditAction:
    | 'assign_support_thread'
    | 'unassign_support_thread'
    | 'resolve_support_thread'
    | 'reopen_support_thread'
    | 'block_support_thread'
    | 'relink_support_thread';
  const details: Record<string, unknown> = { thread_id: params.threadId };

  switch (params.action) {
    case 'assign':
      updatePatch = {
        assigned_to: params.assignedTo ?? params.actorId,
        status:
          threadDetail.thread.status === 'resolved' || threadDetail.thread.status === 'blocked'
            ? 'open'
            : threadDetail.thread.status,
      };
      auditAction = 'assign_support_thread';
      details.assigned_to = params.assignedTo ?? params.actorId;
      break;
    case 'unassign':
      updatePatch = { assigned_to: null };
      auditAction = 'unassign_support_thread';
      break;
    case 'resolve':
      updatePatch = { status: 'resolved' };
      auditAction = 'resolve_support_thread';
      break;
    case 'reopen':
      updatePatch = { status: 'open', escalation_reason: null };
      auditAction = 'reopen_support_thread';
      break;
    case 'block':
      updatePatch = { status: 'blocked' };
      auditAction = 'block_support_thread';
      break;
    case 'relink': {
      const linkedProfile = params.lookup ? await resolveRelinkProfile(params.lookup) : null;
      updatePatch = { user_id: linkedProfile?.id ?? null };
      auditAction = 'relink_support_thread';
      details.lookup = params.lookup ?? null;
      details.user_id = linkedProfile?.id ?? null;
      details.username = linkedProfile?.username ?? null;
      break;
    }
  }

  await updateThread(params.threadId, updatePatch);

  await writeAuditLog({
    adminId: params.actorId,
    action: auditAction,
    targetType: 'support',
    targetId: params.threadId,
    details,
    ipAddress: params.ipAddress ?? null,
  });

  return getSupportThreadDetail(params.threadId);
}

export async function sendManualSupportReply(params: {
  threadId: string;
  actorId: string;
  message: string;
  ipAddress?: string | null;
}) {
  const trimmedMessage = params.message.trim();
  if (!trimmedMessage) {
    throw new Error('Reply message is required');
  }

  const threadDetail = await getSupportThreadDetail(params.threadId);
  if (!threadDetail) {
    throw new Error('Thread not found');
  }

  const result = await sendOutboundSupportMessage({
    thread: {
      id: threadDetail.thread.id,
      channel: threadDetail.thread.channel,
      phone: threadDetail.thread.phone ?? null,
      wa_id: threadDetail.thread.wa_id,
      contact_name: threadDetail.thread.contact_name ?? null,
      user_id: threadDetail.thread.user_id ?? null,
      status: threadDetail.thread.status,
      priority: threadDetail.thread.priority,
      assigned_to: threadDetail.thread.assigned_to ?? null,
      escalation_reason: threadDetail.thread.escalation_reason ?? null,
      last_message_at: threadDetail.thread.last_message_at,
      last_ai_reply_at: threadDetail.thread.last_ai_reply_at ?? null,
      created_at: threadDetail.thread.created_at,
      updated_at: threadDetail.thread.updated_at,
    },
    senderType: 'admin',
    message: trimmedMessage,
    meta: {
      source: 'admin_manual',
      actor_id: params.actorId,
    },
    successStatus: 'open',
    failureStatus: 'waiting_on_human',
    escalationReason: 'reply_delivery_failed',
  });

  await writeAuditLog({
    adminId: params.actorId,
    action: 'reply_support_thread',
    targetType: 'support',
    targetId: params.threadId,
    details: {
      delivery_ok: result.delivery.ok,
      delivery_status: result.delivery.status,
    },
    ipAddress: params.ipAddress ?? null,
  });

  if (!result.delivery.ok) {
    throw new Error(
      threadDetail.thread.channel === 'instagram'
        ? formatInstagramDeliveryError(
            result.delivery as Parameters<typeof formatInstagramDeliveryError>[0]
          )
        : formatWhatsAppDeliveryError(
            result.delivery as Parameters<typeof formatWhatsAppDeliveryError>[0]
          )
    );
  }

  return getSupportThreadDetail(params.threadId);
}
