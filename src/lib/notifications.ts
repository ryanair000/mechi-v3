import type { SupabaseClient } from '@supabase/supabase-js';
import { isMissingTableError } from '@/lib/db-compat';
import { createServiceClient } from '@/lib/supabase';
import type { Notification, NotificationType } from '@/types';

type NotificationInsert = {
  user_id: string;
  type: NotificationType;
  title: string;
  body?: string | null;
  href?: string | null;
  metadata?: Record<string, unknown> | null;
};

type NotificationRow = {
  user_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  href: string | null;
  metadata: Record<string, unknown>;
};

type PushTokenRow = {
  user_id: string;
  expo_push_token: string;
};

type ExpoPushTicket = {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: {
    error?: string;
  };
};

type ExpoPushResponse = {
  data?: ExpoPushTicket[] | ExpoPushTicket;
  errors?: Array<{ message?: string; code?: string }>;
};

const EXPO_PUSH_SEND_URL = 'https://exp.host/--/api/v2/push/send';
const EXPO_PUSH_BATCH_SIZE = 100;
const EXPO_PUSH_CHANNEL_ID = 'default';

function getSupabaseClient(client?: SupabaseClient) {
  return client ?? createServiceClient();
}

function toNotificationRow(input: NotificationInsert): NotificationRow {
  return {
    user_id: input.user_id,
    type: input.type,
    title: input.title,
    body: input.body ?? null,
    href: input.href ?? null,
    metadata: input.metadata ?? {},
  };
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

async function getActivePushTokens(
  userIds: string[],
  client: SupabaseClient
): Promise<PushTokenRow[]> {
  if (userIds.length === 0) {
    return [];
  }

  const { data, error } = await client
    .from('notification_push_tokens')
    .select('user_id, expo_push_token')
    .in('user_id', [...new Set(userIds)])
    .is('disabled_at', null);

  if (error) {
    if (!isMissingTableError(error, 'notification_push_tokens')) {
      console.error('[Notifications Push] Token lookup failed:', error);
    }
    return [];
  }

  return (data ?? []) as PushTokenRow[];
}

async function disablePushTokens(tokens: string[], client: SupabaseClient): Promise<void> {
  if (tokens.length === 0) {
    return;
  }

  const { error } = await client
    .from('notification_push_tokens')
    .update({
      disabled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .in('expo_push_token', [...new Set(tokens)]);

  if (error && !isMissingTableError(error, 'notification_push_tokens')) {
    console.error('[Notifications Push] Failed to disable stale tokens:', error);
  }
}

async function sendExpoPushBatch(
  messages: Array<{
    to: string;
    sound: 'default';
    title: string;
    body?: string;
    data: Record<string, unknown>;
    channelId: string;
    priority: 'high';
  }>,
  client: SupabaseClient
): Promise<void> {
  const response = await fetch(EXPO_PUSH_SEND_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Accept-Encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(messages),
  });
  const payload = (await response.json().catch(() => ({}))) as ExpoPushResponse;

  if (!response.ok) {
    console.error('[Notifications Push] Expo request failed:', response.status, payload.errors ?? payload);
    return;
  }

  const tickets = Array.isArray(payload.data) ? payload.data : payload.data ? [payload.data] : [];
  const staleTokens = tickets
    .map((ticket, index) => ({
      ticket,
      token: messages[index]?.to,
    }))
    .filter(({ ticket, token }) => token && ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered')
    .map(({ token }) => token as string);

  await disablePushTokens(staleTokens, client);
}

async function sendPushNotifications(
  notifications: NotificationRow[],
  client: SupabaseClient
): Promise<void> {
  try {
    const pushTokens = await getActivePushTokens(
      notifications.map((notification) => notification.user_id),
      client
    );
    const tokensByUser = new Map<string, string[]>();

    for (const token of pushTokens) {
      const userTokens = tokensByUser.get(token.user_id) ?? [];
      userTokens.push(token.expo_push_token);
      tokensByUser.set(token.user_id, userTokens);
    }

    const messages = notifications.flatMap((notification) =>
      (tokensByUser.get(notification.user_id) ?? []).map((token) => ({
        to: token,
        sound: 'default' as const,
        title: notification.title,
        body: notification.body ?? undefined,
        data: {
          type: notification.type,
          ...(notification.href
            ? {
                href: notification.href,
                url: notification.href,
              }
            : {}),
        },
        channelId: EXPO_PUSH_CHANNEL_ID,
        priority: 'high' as const,
      }))
    );

    for (const batch of chunkArray(messages, EXPO_PUSH_BATCH_SIZE)) {
      await sendExpoPushBatch(batch, client);
    }
  } catch (error) {
    console.error('[Notifications Push] Unexpected push fanout failure:', error);
  }
}

export async function createNotification(
  input: NotificationInsert,
  client?: SupabaseClient
): Promise<void> {
  const supabase = getSupabaseClient(client);
  const notification = toNotificationRow(input);

  const { error } = await supabase.from('notifications').insert(notification);
  if (error) {
    console.error('[Notifications] Insert failed:', error);
    return;
  }

  await sendPushNotifications([notification], supabase);
}

export async function createNotifications(
  inputs: NotificationInsert[],
  client?: SupabaseClient
): Promise<void> {
  if (inputs.length === 0) {
    return;
  }

  const supabase = getSupabaseClient(client);
  const notifications = inputs.map(toNotificationRow);
  const { error } = await supabase.from('notifications').insert(notifications);
  if (error) {
    console.error('[Notifications] Bulk insert failed:', error);
    return;
  }

  await sendPushNotifications(notifications, supabase);
}

export async function getNotificationsForUser(
  userId: string,
  limit = 40,
  client?: SupabaseClient
): Promise<{ notifications: Notification[]; unreadCount: number }> {
  const supabase = getSupabaseClient(client);
  const safeLimit = Math.min(Math.max(limit, 1), 100);

  const [{ data }, { count }] = await Promise.all([
    supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(safeLimit),
    supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .is('read_at', null),
  ]);

  return {
    notifications: ((data ?? []) as Notification[]),
    unreadCount: count ?? 0,
  };
}

export async function markAllNotificationsRead(
  userId: string,
  client?: SupabaseClient
): Promise<void> {
  const supabase = getSupabaseClient(client);
  await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('read_at', null);
}
