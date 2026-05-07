import { createServiceClient } from '@/lib/supabase';

export type AuditAction =
  | 'ban_user'
  | 'unban_user'
  | 'change_role'
  | 'override_match'
  | 'cancel_match'
  | 'resolve_dispute'
  | 'cancel_tournament'
  | 'override_tournament_winner'
  | 'review_tournament'
  | 'feature_tournament'
  | 'unfeature_tournament'
  | 'update_tournament_details'
  | 'cancel_queue_entry'
  | 'rerun_matchmaking'
  | 'close_lobby'
  | 'remove_lobby_member'
  | 'delete_suggestion'
  | 'assign_support_thread'
  | 'unassign_support_thread'
  | 'reply_support_thread'
  | 'resolve_support_thread'
  | 'reopen_support_thread'
  | 'block_support_thread'
  | 'relink_support_thread'
  | 'reply_match_chat'
  | 'resolve_match_escalation'
  | 'dismiss_match_escalation'
  | 'send_email_campaign'
  | 'system_note';

export interface AuditEntry {
  adminId: string;
  action: AuditAction;
  targetType: 'user' | 'match' | 'tournament' | 'queue' | 'lobby' | 'support' | 'system';
  targetId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string | null;
}

export async function writeAuditLog(entry: AuditEntry): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase.from('admin_audit_logs').insert({
    admin_id: entry.adminId,
    action: entry.action,
    target_type: entry.targetType,
    target_id: entry.targetId ?? null,
    details: entry.details ?? null,
    ip_address: entry.ipAddress ?? null,
  });

  if (error) {
    console.error('[Audit] Failed to write log:', error);
  }
}
