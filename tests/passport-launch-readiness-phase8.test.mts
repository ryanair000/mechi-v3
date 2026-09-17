import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const migration = await readFile(new URL('../supabase/migrations/20260813113747_passport_launch_readiness_operations.sql', import.meta.url), 'utf8');
const rollout = await readFile(new URL('../src/lib/passport-rollout.ts', import.meta.url), 'utf8');
const worker = await readFile(new URL('../src/lib/passport-webhook-delivery.ts', import.meta.url), 'utf8');
const operations = await readFile(new URL('../src/lib/passport-operations.ts', import.meta.url), 'utf8');
const webhookCron = await readFile(new URL('../src/app/api/cron/passport-webhooks/route.ts', import.meta.url), 'utf8');
const retentionCron = await readFile(new URL('../src/app/api/cron/passport-retention/route.ts', import.meta.url), 'utf8');
const adminRoute = await readFile(new URL('../src/app/api/admin/passport/operations/route.ts', import.meta.url), 'utf8');
const adminUi = await readFile(new URL('../src/app/admin/passport/operations/passport-operations-console.tsx', import.meta.url), 'utf8');
const vercel = await readFile(new URL('../vercel.json', import.meta.url), 'utf8');
const connectionsStart = await readFile(new URL('../src/app/api/passport/connections/steam/start/route.ts', import.meta.url), 'utf8');
const connectionsCallback = await readFile(new URL('../src/app/api/passport/connections/steam/callback/route.ts', import.meta.url), 'utf8');
const developerApi = await readFile(new URL('../src/app/api/v1/passport/route.ts', import.meta.url), 'utf8');
const partnerApi = await readFile(new URL('../src/app/api/v1/partner/issuance-requests/route.ts', import.meta.url), 'utf8');

test('Phase 8 operation runs are RLS protected and service mediated', () => {
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.passport_operation_runs/);
  assert.match(migration, /ALTER TABLE public\.passport_operation_runs ENABLE ROW LEVEL SECURITY/);
  assert.match(migration, /REVOKE ALL ON TABLE public\.passport_operation_runs FROM anon, authenticated/);
  assert.match(migration, /GRANT ALL ON TABLE public\.passport_operation_runs TO service_role/);
});

test('webhook claims are bounded, atomic, non-blocking, and recover stale workers', () => {
  assert.match(migration, /claim_passport_webhook_deliveries/);
  assert.match(migration, /FOR UPDATE OF delivery SKIP LOCKED/);
  assert.match(migration, /greatest\(1, least\(coalesce\(p_batch_size, 12\), 50\)\)/);
  assert.match(migration, /delivery\.claimed_at < timezone\('utc', now\(\)\) - interval '5 minutes'/);
  assert.match(migration, /SET status = 'delivering', claimed_at = timezone/);
});

test('webhook finalization keeps attempt history and auto-pauses abusive endpoints', () => {
  assert.match(migration, /v_delivery\.attempt \+ 1, 'retry'/);
  assert.match(migration, /ON CONFLICT \(subscription_id, ecosystem_event_id, attempt\) DO NOTHING/);
  assert.match(migration, /v_failure_count >= 8 THEN 'paused'/);
  assert.match(migration, /Automatically paused after eight consecutive delivery failures/);
  assert.match(migration, /IF NOT FOUND OR v_delivery\.status <> 'delivering' THEN RETURN 'stale'/);
});

test('retention preserves active queue work and keeps long-lived evidence tables', () => {
  assert.match(migration, /delivery\.status IN \('pending', 'retry', 'delivering'\)/);
  assert.match(migration, /passport_developer_api_events[\s\S]+interval '90 days'/);
  assert.match(migration, /passport_ecosystem_events[\s\S]+interval '180 days'/);
  assert.doesNotMatch(migration, /DELETE FROM public\.passport_partner_issuance_requests/);
  assert.doesNotMatch(migration, /DELETE FROM public\.passport_import_events/);
});

test('production rollout fails closed and supports deterministic cohorts plus explicit beta users', () => {
  for (const name of ['PASSPORT_CONNECTIONS_ENABLED', 'PASSPORT_DEVELOPER_API_ENABLED', 'PASSPORT_PARTNER_API_ENABLED', 'PASSPORT_WEBHOOK_DELIVERY_ENABLED']) assert.match(rollout, new RegExp(name));
  assert.match(rollout, /process\.env\.NODE_ENV === 'production' \? 0 : 100/);
  assert.match(rollout, /PASSPORT_BETA_USER_IDS/);
  assert.match(rollout, /createHash\('sha256'\)/);
  assert.match(rollout, /digest\.readUInt32BE\(0\) % 100/);
  assert.match(connectionsStart, /getPassportFeatureAccess\('connections'/);
  assert.match(connectionsCallback, /getPassportFeatureAccess\('connections'/);
  assert.match(developerApi, /code: 'rollout_disabled'/);
  assert.match(partnerApi, /getPassportFeatureAccess\('partner_api'\)/);
});

test('delivery pins validated DNS and constrains outbound HTTP', () => {
  assert.match(worker, /lookup\(hostname, \{ all: true, verbatim: true \}\)/);
  assert.match(worker, /3000, 'dns_timeout'/);
  assert.match(worker, /addresses\.some\(\(\{ address \}\) => !isPublicWebhookAddress\(address\)\)/);
  assert.match(worker, /lookup: \(_hostname, _options, callback\) => callback\(null, target\.address, target\.family\)/);
  assert.match(worker, /endpoint\.protocol !== 'https:'/);
  assert.match(worker, /received > 8192/);
  assert.match(worker, /request_timeout/);
  assert.match(worker, /10_000 - \(Date\.now\(\) - startedAt\)/);
  assert.doesNotMatch(worker, /redirect:/);
});

test('webhook payloads are authenticated and receiver-idempotent', () => {
  assert.match(worker, /createHmac\('sha256', secret\)\.update\(`\$\{timestamp\}\.\$\{body\}`\)/);
  assert.match(worker, /'idempotency-key': delivery\.ecosystem_event_id/);
  assert.match(worker, /'x-mechi-event-id': delivery\.ecosystem_event_id/);
  assert.match(worker, /openPassportSecret\(delivery\.encrypted_signing_secret/);
});

test('cron jobs require CRON_SECRET and run on explicit schedules', () => {
  for (const route of [webhookCron, retentionCron]) {
    assert.match(route, /process\.env\.CRON_SECRET/);
    assert.match(route, /authorization.*Bearer/);
    assert.match(route, /status: 401/);
  }
  const config = JSON.parse(vercel);
  assert.ok(config.crons.some((job: { path: string; schedule: string }) => job.path === '/api/cron/passport-webhooks' && job.schedule === '15 2 * * *'));
  assert.ok(config.crons.some((job: { path: string; schedule: string }) => job.path === '/api/cron/passport-retention' && job.schedule === '30 2 * * *'));
});

test('operations are observable and manual external delivery requires admin plus confirmation', () => {
  assert.match(operations, /Promise\.all\(/);
  assert.match(operations, /fetched_count, staged_count, changed_count, removed_count/);
  assert.doesNotMatch(operations, /items_fetched|items_staged/);
  assert.match(operations, /stale_deliveries/);
  assert.match(operations, /pending_partner_reviews/);
  assert.match(adminRoute, /hasAdminAccess/);
  assert.match(adminRoute, /writeAuditLog/);
  assert.match(adminUi, /window\.confirm\(\s*["']Run one webhook delivery batch now/);
  assert.match(adminUi, /health\.rollout\.webhook_delivery\.enabled/);
});
