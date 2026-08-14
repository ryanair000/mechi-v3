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
    const { count: expiredDiagnostics, error: diagnosticExpiryError } = await supabase
      .from('passport_route_diagnostics')
      .delete({ count: 'exact' })
      .lt('expires_at', new Date().toISOString());
    if (diagnosticExpiryError) throw new Error('Passport diagnostics retention cleanup failed');
    const { data, error } = await supabase.rpc('cleanup_passport_operational_data');
    if (error) throw new Error('Passport retention cleanup failed');
    const details = { ...(data && typeof data === 'object' ? data : {}), expired_exports: expiredExports?.length ?? 0, expired_route_diagnostics: expiredDiagnostics ?? 0 };
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

function percentile(values: number[], fraction: number) {
  if (!values.length) return null;
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1)];
}

export async function getPassportOperationsHealth() {
  const supabase = createServiceClient();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const [connections, syncRuns, subscriptions, deliveries, tokens, partnerRequests, operationRuns, profiles, diagnostics, productEvents, oldestDimensions, oldestSummary, readyExports] = await Promise.all([
    supabase.from('passport_provider_connections').select('id, provider_key, status, last_sync_status, last_synced_at, last_error_code, updated_at').order('updated_at', { ascending: false }).limit(100),
    supabase.from('passport_provider_sync_runs').select('id, connection_id, status, fetched_count, staged_count, changed_count, removed_count, error_code, started_at, completed_at').order('started_at', { ascending: false }).limit(50),
    supabase.from('passport_webhook_subscriptions').select('id, endpoint_url, status, failure_count, last_success_at, last_failure_at, paused_at, paused_reason, updated_at').order('updated_at', { ascending: false }).limit(100),
    supabase.from('passport_webhook_deliveries').select('id, subscription_id, attempt, status, response_status, error_code, duration_ms, next_attempt_at, claimed_at, delivered_at, updated_at').order('updated_at', { ascending: false }).limit(150),
    supabase.from('passport_developer_tokens').select('id, revoked_at, expires_at, last_used_at, created_at').order('created_at', { ascending: false }).limit(200),
    supabase.from('passport_partner_issuance_requests').select('id, status, issuance_type, created_at, reviewed_at').order('created_at', { ascending: false }).limit(100),
    supabase.from('passport_operation_runs').select('id, operation_type, trigger_source, status, claimed_count, succeeded_count, retried_count, failed_count, details, started_at, finished_at').order('started_at', { ascending: false }).limit(30),
    supabase.from('passport_profiles').select('publication_status, default_visibility, is_discoverable, public_handle, updated_at').limit(50_000),
    supabase.from('passport_route_diagnostics').select('route_name, response_status, duration_ms, result_class, operation, cache_state, occurred_at').gte('occurred_at', since).order('occurred_at', { ascending: false }).limit(10_000),
    supabase.from('passport_product_events').select('event_name, occurred_at').gte('occurred_at', since).order('occurred_at', { ascending: false }).limit(10_000),
    supabase.from('passport_dimension_snapshots').select('projected_at').order('projected_at', { ascending: true }).limit(1).maybeSingle(),
    supabase.from('passport_profile_summaries').select('computed_at').order('computed_at', { ascending: true }).limit(1).maybeSingle(),
    supabase.from('passport_data_exports').select('id', { count: 'exact', head: true }).eq('status', 'ready').gt('expires_at', new Date().toISOString()),
  ]);
  const errors = [connections, syncRuns, subscriptions, deliveries, tokens, partnerRequests, operationRuns, profiles, diagnostics, productEvents, oldestDimensions, oldestSummary, readyExports].map((result) => result.error?.message).filter(Boolean);
  if (errors.length) return { storage_ready: false, errors: errors.map(() => 'Passport operations schema is not ready'), rollout: getPassportRolloutSnapshot() };
  const connectionRows = connections.data ?? [];
  const syncRows = syncRuns.data ?? [];
  const subscriptionRows = subscriptions.data ?? [];
  const deliveryRows = deliveries.data ?? [];
  const tokenRows = tokens.data ?? [];
  const partnerRows = partnerRequests.data ?? [];
  const profileRows = profiles.data ?? [];
  const diagnosticRows = diagnostics.data ?? [];
  const productEventRows = productEvents.data ?? [];
  const durations = diagnosticRows.map((row) => Number(row.duration_ms)).filter(Number.isFinite);
  const byRoute = diagnosticRows.reduce<Record<string, { requests: number; errors: number; duration_ms: number[] }>>((result, row) => {
    const route = String(row.route_name);
    result[route] ??= { requests: 0, errors: 0, duration_ms: [] };
    result[route].requests += 1;
    if (Number(row.response_status) >= 500) result[route].errors += 1;
    result[route].duration_ms.push(Number(row.duration_ms));
    return result;
  }, {});
  const safeHandle = /^[a-z0-9][a-z0-9_-]{2,29}$/;
  const now = Date.now();
  return {
    storage_ready: true,
    generated_at: new Date().toISOString(),
    rollout: getPassportRolloutSnapshot(),
    metrics: {
      core: {
        population: countBy(profileRows, 'publication_status'),
        visibility: countBy(profileRows, 'default_visibility'),
        discoverable: profileRows.filter((profile) => profile.publication_status === 'published' && profile.is_discoverable).length,
        unsafe_handles: profileRows.filter((profile) => profile.public_handle && !safeHandle.test(String(profile.public_handle))).length,
        requests_24h: diagnosticRows.length,
        responses_4xx_24h: diagnosticRows.filter((row) => Number(row.response_status) >= 400 && Number(row.response_status) < 500).length,
        responses_5xx_24h: diagnosticRows.filter((row) => Number(row.response_status) >= 500).length,
        latency_ms: { p50: percentile(durations, 0.5), p95: percentile(durations, 0.95), p99: percentile(durations, 0.99) },
        routes: Object.fromEntries(Object.entries(byRoute).map(([route, value]) => [route, { requests: value.requests, errors: value.errors, p95_ms: percentile(value.duration_ms, 0.95) }])),
        card_fallbacks_24h: diagnosticRows.filter((row) => row.route_name === 'passport_card' && row.result_class === 'render_fallback').length,
        product_events_24h: countBy(productEventRows, 'event_name'),
        oldest_dimension_projection_seconds: oldestDimensions.data?.projected_at ? Math.max(0, Math.round((now - new Date(oldestDimensions.data.projected_at).getTime()) / 1000)) : null,
        oldest_summary_projection_seconds: oldestSummary.data?.computed_at ? Math.max(0, Math.round((now - new Date(oldestSummary.data.computed_at).getTime()) / 1000)) : null,
        ready_private_exports: readyExports.count ?? 0,
      },
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
