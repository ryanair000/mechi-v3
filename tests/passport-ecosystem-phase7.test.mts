import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const migration = await readFile(new URL('../supabase/migrations/20260813105529_passport_platform_connections_ecosystem.sql', import.meta.url), 'utf8');
const connections = await readFile(new URL('../src/lib/passport-connections.ts', import.meta.url), 'utf8');
const secretBox = await readFile(new URL('../src/lib/passport-secret-box.ts', import.meta.url), 'utf8');
const ecosystem = await readFile(new URL('../src/lib/passport-ecosystem.ts', import.meta.url), 'utf8');
const partners = await readFile(new URL('../src/lib/passport-partners.ts', import.meta.url), 'utf8');
const passportCore = await readFile(new URL('../src/lib/passport.ts', import.meta.url), 'utf8');
const publicLibrary = await readFile(new URL('../src/app/[handle]/games/page.tsx', import.meta.url), 'utf8');
const proxy = await readFile(new URL('../src/proxy.ts', import.meta.url), 'utf8');

test('Phase 7 tables are RLS protected and service mediated', () => {
  for (const table of ['passport_provider_catalog', 'passport_provider_connections', 'passport_connection_intents', 'passport_provider_sync_runs', 'passport_external_items', 'passport_import_events', 'passport_developer_tokens', 'passport_developer_api_events', 'passport_ecosystem_events', 'passport_webhook_subscriptions', 'passport_webhook_deliveries', 'passport_partner_issuers', 'passport_partner_api_keys', 'passport_partner_issuance_requests']) assert.match(migration, new RegExp(`ALTER TABLE public\\.${table} ENABLE ROW LEVEL SECURITY`, 'i'));
  assert.match(migration, /REVOKE ALL ON TABLE[\s\S]+FROM anon, authenticated/i);
  assert.match(migration, /GRANT ALL ON TABLE[\s\S]+TO service_role/i);
});

test('Steam ownership uses one-time hashed state and exact OpenID verification', () => {
  assert.match(connections, /state_hash: sha256\(state\)/);
  assert.match(connections, /expires_at: new Date\(Date\.now\(\) \+ 10 \* 60_000\)/);
  assert.match(connections, /searchParams\.get\('openid\.return_to'\) !== expectedReturnTo/);
  assert.match(connections, /check_authentication/);
  assert.match(connections, /is_valid:true/);
  assert.match(connections, /is\('consumed_at', null\)/);
  assert.match(migration, /passport_provider_account_unique UNIQUE \(provider_key, provider_account_id\)/);
});

test('future provider and webhook secrets use authenticated encryption with bound context', () => {
  assert.match(secretBox, /aes-256-gcm/);
  assert.match(secretBox, /setAAD/);
  assert.match(secretBox, /getAuthTag/);
  assert.match(secretBox, /setAuthTag/);
  assert.match(migration, /passport_provider_connection_encrypted_tokens/);
  assert.match(migration, /passport_webhook_secret_encrypted/);
});

test('sync and imports are idempotent without overwriting player-authored fields', () => {
  assert.match(migration, /passport_provider_sync_idempotent UNIQUE \(connection_id, idempotency_key\)/);
  assert.match(migration, /passport_external_item_unique UNIQUE \(connection_id, provider_item_type, provider_item_id\)/);
  assert.match(connections, /manual_fields_preserved/);
  assert.match(connections, /hours_policy: 'maximum_recorded'/);
  assert.match(connections, /play_status: hours > 0 \? 'playing' : 'backlog'/);
  assert.doesNotMatch(connections, /play_status: hours > 0 \? 'completed'/);
});

test('revocation stops syncing and erasure preserves enriched personal entries', () => {
  assert.match(connections, /connection\.status === 'revoked'/);
  assert.match(connections, /encrypted_access_token: null, encrypted_refresh_token: null/);
  assert.match(connections, /const enriched = Boolean\(entry\.short_review \|\| entry\.rating \|\| entry\.is_favorite \|\| entry\.is_featured \|\| entry\.screenshot_url\)/);
  assert.match(connections, /source_type: 'manual', source_key: null/);
});

test('developer tokens have granular scopes and transactionally serialized rate limits', () => {
  assert.match(migration, /passport_developer_token_scopes CHECK/);
  assert.match(migration, /consume_passport_developer_api_request/);
  assert.match(migration, /FOR UPDATE/);
  assert.match(migration, /pg_advisory_xact_lock/);
  assert.match(ecosystem, /granted_scopes: scopes/);
  assert.match(ecosystem, /scope\.startsWith|passport\.summary:read/);
});

test('webhook registration rejects local targets and queues signed deliveries through an outbox', () => {
  assert.match(ecosystem, /url\.protocol !== 'https:'/);
  assert.match(ecosystem, /host === 'localhost'/);
  assert.match(ecosystem, /192\\\.168/);
  assert.match(migration, /queue_passport_webhook_deliveries/);
  assert.match(migration, /passport_webhook_deliveries/);
  assert.match(migration, /event_types @> ARRAY\[NEW\.event_type\]/);
  assert.match(migration, /passport_profiles_ecosystem_event/);
});

test('partner issuance is approved, scoped, event-limited, idempotent, and human reviewed', () => {
  assert.match(migration, /status text NOT NULL DEFAULT 'pending_review'/);
  assert.match(migration, /passport_partner_issuance_idempotent UNIQUE/);
  assert.match(partners, /issuer\.status !== 'approved'/);
  assert.match(partners, /auth\.eventKeys\.includes\(eventKey\)/);
  assert.match(partners, /eq\('status', 'pending_review'\)/);
  assert.match(partners, /already active from another source and cannot be replaced/);
});

test('core Passport does not depend on provider availability and synced facts show attribution', () => {
  assert.doesNotMatch(passportCore, /passport-connections|passport_provider_connections|STEAM_WEB_API_KEY/);
  assert.match(publicLibrary, /provider_attribution/);
  assert.match(connections, /Steam sync is temporarily unavailable/);
});

test('partner API is cross-origin bearer authenticated and separately rate limited', () => {
  assert.match(proxy, /\/api\/v1\/partner\//);
  assert.match(proxy, /prefix: '\/api\/v1', limit: 180/);
});
