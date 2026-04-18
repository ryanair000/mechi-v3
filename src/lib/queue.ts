import type { SupabaseClient } from '@supabase/supabase-js';

export const QUEUE_MAX_WAIT_MINUTES = 3;

export function getQueueExpiryCutoffMs(now = Date.now()): number {
  return now - QUEUE_MAX_WAIT_MINUTES * 60_000;
}

export function getQueueExpiryCutoffIso(now = Date.now()): string {
  return new Date(getQueueExpiryCutoffMs(now)).toISOString();
}

export function getQueueWaitMinutes(
  joinedAt: string | null | undefined,
  now = Date.now()
): number {
  if (!joinedAt) return 0;

  const joinedAtMs = new Date(joinedAt).getTime();
  if (Number.isNaN(joinedAtMs)) return 0;

  return Math.max(0, Math.floor((now - joinedAtMs) / 60_000));
}

export function isQueueEntryExpired(
  joinedAt: string | null | undefined,
  now = Date.now()
): boolean {
  return getQueueWaitMinutes(joinedAt, now) >= QUEUE_MAX_WAIT_MINUTES;
}

export async function expireWaitingQueueEntries(
  supabase: SupabaseClient,
  userId?: string
): Promise<number> {
  let query = supabase
    .from('queue')
    .update({ status: 'cancelled' })
    .eq('status', 'waiting')
    .lt('joined_at', getQueueExpiryCutoffIso())
    .select('id');

  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { data, error } = await query;
  if (error) {
    console.error('[Queue] Failed to expire waiting entries:', error);
    return 0;
  }

  return (data ?? []).length;
}
