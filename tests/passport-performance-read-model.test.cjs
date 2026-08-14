/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('public Passport core consumes one maintained aggregate read model', () => {
  const source = read('src/lib/passport.ts');
  const getter = source.match(/export async function getPassportData[\s\S]+?\nexport async function getPassportOwnerDataByUserId/)?.[0] ?? '';

  assert.match(source, /async function loadPassportSummaryProjection/);
  assert.match(source, /from\('passport_profile_summaries'\)/);
  assert.match(getter, /loadPassportSummaryProjection\(profile\.id\)/);
  assert.doesNotMatch(source, /async function loadEventCounts/);
  assert.doesNotMatch(source, /async function countRows/);
  assert.doesNotMatch(source, /async function loadSocialCounts/);
  assert.doesNotMatch(getter, /head:\s*true/);
});

test('metadata and page share the request-memoized public DTO', () => {
  const page = read('src/app/p/[handle]/page.tsx');
  assert.match(page, /const getCachedPublicPassport = cache\(\(username: string\) => getPassportData\(username\)\)/);
  assert.match(page, /buildPassportMetadata\(username \? await getCachedPublicPassport\(username\) : null\)/);
  assert.match(page, /let passport = await getCachedPublicPassport\(username\)/);
});

test('public feature reads execute in one parallel stage', () => {
  const page = read('src/app/p/[handle]/page.tsx');
  const featureStage = page.match(/async function loadPassportPageFeatures[\s\S]+?return \{ highlights, progression, shelves \};/)?.[0] ?? '';
  assert.match(featureStage, /Promise\.all/);
  assert.match(featureStage, /getPassportHighlights/);
  assert.match(featureStage, /getVisiblePassportProgression/);
  assert.match(featureStage, /getPassportShelves/);
});

test('anonymous caches are version keyed behind live access gates', () => {
  const source = read('src/lib/passport.ts');
  const page = read('src/app/p/[handle]/page.tsx');
  const api = read('src/app/api/passport/[username]/route.ts');
  const gamesApi = read('src/app/api/passport/[username]/games/route.ts');

  assert.match(source, /resolvePublicPassportCacheGate/);
  assert.match(source, /select\('user_id, public_version, updated_at'\)/);
  assert.match(source, /eq\('publication_status', 'published'\)/);
  assert.match(source, /await isMinorAccount\(userId\)/);
  assert.match(source, /unstable_cache/);
  assert.match(source, /\['passport-public-dto-v1', gate\.userId, gate\.handle, gate\.version\]/);
  assert.match(source, /!options\.ownerView && !options\.friendView/);
  assert.doesNotMatch(page, /dynamic = 'force-dynamic'/);
  assert.match(page, /passport-public-page-features-v1/);
  assert.match(page, /viewerAccess\.viewer_id[\s\S]+?loadPassportPageFeatures/);
  assert.match(api, /public, max-age=0, must-revalidate/);
  assert.match(gamesApi, /public, max-age=0, must-revalidate/);
});

test('database public version covers privacy and public content sources', () => {
  const migration = read('supabase/migrations/20260814115223_add_passport_public_cache_version.sql');
  assert.match(migration, /ADD COLUMN IF NOT EXISTS public_version bigint NOT NULL DEFAULT 1/);
  assert.match(migration, /BEFORE UPDATE ON public\.passport_profiles/);
  assert.match(migration, /NEW\.field_visibility/);
  for (const source of [
    'passport_profile_summaries',
    'passport_game_entries',
    'passport_verification_records',
    'passport_highlights',
    'passport_dimension_snapshots',
    'passport_customizations',
    'passport_showcase_items',
    'passport_custom_shelves',
  ]) {
    assert.match(migration, new RegExp(`public\\.${source}`));
  }
  assert.match(migration, /passport_friendships_bump_public_version/);
  assert.match(migration, /passport_follows_bump_public_version/);
  assert.match(migration, /REVOKE ALL ON FUNCTION private\.bump_passport_public_version\(uuid\)/);
});

test('progression rebuilds have deterministic cursors and a controlled repair route', () => {
  const progression = read('src/lib/passport-progression.ts');
  const route = read('src/app/api/passport/progression/route.ts');
  const migration = read('supabase/migrations/20260814115223_add_passport_public_cache_version.sql');
  assert.match(progression, /buildProjectionSourceCursor/);
  assert.match(progression, /source_cursor/);
  assert.match(progression, /JSON\.stringify\(existing\?\.source_cursor/);
  assert.match(progression, /options\.force/);
  assert.match(route, /export async function POST/);
  assert.match(route, /\{ force: true \}/);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS source_cursor jsonb/);
});

test('anonymous progression reads consume snapshots without projection writes', () => {
  const source = read('src/lib/passport-progression.ts');
  const visible = source.match(/export async function getVisiblePassportProgression[\s\S]+?\nexport async function updatePassportCustomization/)?.[0] ?? '';
  const stored = source.match(/async function getStoredPassportProgression[\s\S]+?\nexport async function getVisiblePassportProgression/)?.[0] ?? '';

  assert.match(visible, /getStoredPassportProgression/);
  assert.doesNotMatch(visible, /getPassportProgression\(/);
  assert.match(stored, /from\('passport_dimension_snapshots'\)/);
  assert.doesNotMatch(stored, /\.upsert\(/);
  assert.doesNotMatch(stored, /projectPassportAchievements/);
});

test('database triggers maintain aggregate counts from authoritative changes', () => {
  const migration = read('supabase/migrations/20260814114118_maintain_passport_public_summary.sql');
  for (const table of [
    'tournament_players',
    'online_tournament_registrations',
    'achievements',
    'profile_badges',
    'team_members',
  ]) {
    assert.match(migration, new RegExp(`ON public\\.${table}`));
  }
  assert.match(migration, /AFTER UPDATE OF status ON public\.tournaments/);
  assert.match(migration, /AFTER UPDATE OF visibility ON public\.teams/);
  assert.match(migration, /SECURITY DEFINER[\s\S]+?SET search_path = ''/);
  assert.match(migration, /REVOKE ALL ON FUNCTION private\.refresh_passport_profile_summary_counts\(uuid\)/);
  assert.match(migration, /WITH generic_events AS/);
  assert.doesNotMatch(migration, /FOR profile_id IN SELECT id FROM public\.profiles/);
});

test('performance policy records query and latency release budgets', () => {
  const policy = read('docs/PLAYMECHI_PASSPORT_READ_MODEL.md');
  assert.match(policy, /At most 10 database requests/);
  assert.match(policy, /Anonymous public GET writes \| 0/);
  assert.match(policy, /p95 TTFB at or below 900 ms/);
  assert.match(policy, /P1-10/);
});
