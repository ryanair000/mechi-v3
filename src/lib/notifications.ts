import type { SupabaseClient } from '@supabase/supabase-js';
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

function getSupabaseClient(client?: SupabaseClient) {
  return client ?? createServiceClient();
}

export async function createNotification(
  input: NotificationInsert,
  client?: SupabaseClient
): Promise<void> {
  const supabase = getSupabaseClient(client);

  await supabase.from('notifications').insert({
    user_id: input.user_id,
    type: input.type,
    title: input.title,
    body: input.body ?? null,
    href: input.href ?? null,
    metadata: input.metadata ?? {},
  });
}

export async function createNotifications(
  inputs: NotificationInsert[],
  client?: SupabaseClient
): Promise<void> {
  if (inputs.length === 0) {
    return;
  }

  const supabase = getSupabaseClient(client);
  await supabase.from('notifications').insert(
    inputs.map((input) => ({
      user_id: input.user_id,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      href: input.href ?? null,
      metadata: input.metadata ?? {},
    }))
  );
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
