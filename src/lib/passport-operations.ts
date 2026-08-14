import 'server-only';

import { createServiceClient } from '@/lib/supabase';
import { getPassportRolloutSnapshot } from '@/lib/passport-rollout';

type TriggerSource = 'cron' | 'admin' | 'test';

export async function runPassportRetentionCleanup(triggerSource: TriggerSource) {
  const supabase = createServiceClient();
  const { data: run, error: runError } = await supabase.from('passport_operation_runs').insert({ operation_type: 'retention_cleanup', trigger_source: triggerSource }).select('id').single();
  if (runError || !run) throw new Error('Could not start Passport retention operation');
  try {
    const { data: expiredExports, error: exportExpiryError } = await supabase
      .from('passport_data_exports')
      .update({ status: 'expired', payload: null, download_token_hash: null })
      .eq('status', 'ready')
      .lt('expires_at', new Date().toISOString())
      .select('id, user_id');
    if (exportExpiryError) throw new Error('Passport export retention cleanup failed');
    if (expiredExports?.length) {
      await supabase.from('passport_data_export_audit').insert(expiredExports.map((item) => ({
        export_id: item.id,
        user_id: item.user_id,
        action: 'expired',
        details: { trigger_source: triggerSource },
      })));
    }
    const { data, error } = await supabase.rpc('cleanup_passport_operational_data');
    if (error) throw new Error('Passport retention cleanup failed');
    const details = { ...(data && typeof data === 'object' ? data : {}), expired_exports: expiredExports?.length ?? 0 };
    await supabase.from('passport_operation_runs').update({ status: 'succeeded', details, finished_at: new Date().toISOString() }).eq('id', run.id);
    return { ok: true, run_id: run.id, deleted: details };
  } catch (error) {
    await supabase.from('passport_operation_runs').update({ status: 'failed', failed_count: 1, details: { error: error instanceof Error ? error.message : 'unknown' }, finished_at: new Date().toISOString() }).eq('id', run.id);
    throw error;
  }
}

function countBy<T extends Record<string, unknown>>(rows: T[], key: keyof T) {
  return rows.reduce<Record<string, number>>((counts, row) => {
    const value = String(row[key] ?? 'unknown'); counts[value] = (counts[value] ?? 0) + 1; return counts;
  }, {});
}

export async function getPassportOperationsHealth() {
  const supabase = createServiceClient();
  const [connections, syncRuns, subscriptions, deliveries, tokens, partnerRequests, operationRuns] = await Promise.all([
    supabase.from('passport_provider_connections').select('id, provider_key, status, last_sync_status, last_synced_at, last_error_code, updated_at').order('updated_at', { ascending: false }).limit(100),
    supabase.from('passport_provider_sync_runs').select('id, connection_id, status, fetched_count, staged_count, changed_count, removed_count, error_code, started_at, completed_at').order('started_at', { ascending: false }).limit(50),
    supabase.from('passport_webhook_subscriptions').select('id, endpoint_url, status, failure_count, last_success_at, last_failure_at, paused_at, paused_reason, updated_at').order('updated_at', { ascending: false }).limit(100),
    supabase.from('passport_webhook_deliveries').select('id, subscription_id, attempt, status, response_status, error_code, duration_ms, next_attempt_at, claimed_at, delivered_at, updated_at').order('updated_at', { ascending: false }).limit(150),
    supabase.from('passport_developer_tokens').select('id, revoked_at, expires_at, last_used_at, created_at').order('created_at', { ascending: false }).limit(200),
    supabase.from('passport_partner_issuance_requests').select('id, status, issuance_type, created_at, reviewed_at').order('created_at', { ascending: false }).limit(100),
    supabase.from('passport_operation_runs').select('id, operation_type, trigger_source, status, claimed_count, succeeded_count, retried_count, failed_count, details, started_at, finished_at').order('started_at', { ascending: false }).limit(30),
  ]);
  const errors = [connections, syncRuns, subscriptions, deliveries, tokens, partnerRequests, operationRuns].map((result) => result.error?.message).filter(Boolean);
  if (errors.length) return { storage_ready: false, errors: errors.map(() => 'Phase 8 operations schema is not ready'), rollout: getPassportRolloutSnapshot() };
  const connectionRows = connections.data ?? [];
  const syncRows = syncRuns.data ?? [];
  const subscriptionRows = subscriptions.data ?? [];
  const deliveryRows = deliveries.data ?? [];
  const tokenRows = tokens.data ?? [];
  const partnerRows = partnerRequests.data ?? [];
  const now = Date.now();
  return {
    storage_ready: true,
    generated_at: new Date().toISOString(),
    rollout: getPassportRolloutSnapshot(),
    metrics: {
      connections: countBy(connectionRows, 'status'),
      recent_syncs: countBy(syncRows, 'status'),
      subscriptions: countBy(subscriptionRows, 'status'),
      deliveries: countBy(deliveryRows, 'status'),
      active_tokens: tokenRows.filter((token) => !token.revoked_at && (!token.expires_at || new Date(token.expires_at).getTime() > now)).length,
      pending_partner_reviews: partnerRows.filter((request) => request.status === 'pending_review').length,
      stale_deliveries: deliveryRows.filter((delivery) => delivery.status === 'delivering' && delivery.claimed_at && new Date(delivery.claimed_at).getTime() < now - 5 * 60_000).length,
      due_deliveries: deliveryRows.filter((delivery) => (delivery.status === 'pending' || delivery.status === 'retry') && (!delivery.next_attempt_at || new Date(delivery.next_attempt_at).getTime() <= now)).length,
    },
    connections: connectionRows,
    sync_runs: syncRows,
    subscriptions: subscriptionRows,
    deliveries: deliveryRows,
    partner_requests: partnerRows,
    operation_runs: operationRuns.data ?? [],
  };
}
