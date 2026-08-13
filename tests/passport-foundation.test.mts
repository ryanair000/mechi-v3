import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
import test from 'node:test';

const typesSource = await readFile(
  new URL('../src/lib/passport-types.ts', import.meta.url),
  'utf8'
);
const typesModule = await import(
  `data:text/javascript;base64,${Buffer.from(
    stripTypeScriptTypes(typesSource, { mode: 'transform' })
  ).toString('base64')}`
);

test('Passport privacy defaults protect in-game IDs while keeping identity useful', () => {
  const visibility = typesModule.DEFAULT_PASSPORT_FIELD_VISIBILITY;

  assert.equal(visibility.game_ids, 'private');
  assert.equal(visibility.games, 'public');
  assert.equal(visibility.competitive, 'public');
  assert.equal(visibility.events, 'public');
  assert.deepEqual(typesModule.PASSPORT_VISIBILITIES, ['public', 'friends', 'private']);
});

test('Passport identity supports distinct gamer archetypes without a universal score', () => {
  assert.ok(typesModule.PASSPORT_ARCHETYPES.includes('competitive'));
  assert.ok(typesModule.PASSPORT_ARCHETYPES.includes('story_explorer'));
  assert.ok(typesModule.PASSPORT_ARCHETYPES.includes('completionist'));
  assert.ok(typesModule.PASSPORT_ARCHETYPES.includes('community_builder'));
});

test('Phase 1 migration defaults to server-only access with RLS defense in depth', async () => {
  const sql = await readFile(
    new URL(
      '../supabase/migrations/20260801175303_passport_foundation.sql',
      import.meta.url
    ),
    'utf8'
  );

  for (const table of [
    'passport_profiles',
    'passport_profile_summaries',
    'passport_verification_records',
    'passport_audit_logs',
  ]) {
    assert.match(sql, new RegExp(`ALTER TABLE public\\.${table} ENABLE ROW LEVEL SECURITY`, 'i'));
  }

  assert.match(sql, /REVOKE ALL ON TABLE[\s\S]+FROM anon, authenticated/i);
  assert.match(sql, /GRANT ALL ON TABLE[\s\S]+TO service_role/i);
  assert.match(sql, /"game_ids":"private"/i);
});

test('Phase 1 preserves legacy share URLs and establishes the Mechi V5 Passport routes', async () => {
  const legacyRoute = await readFile(
    new URL('../src/app/s/[username]/page.tsx', import.meta.url),
    'utf8'
  );
  const canonicalRoute = await readFile(
    new URL('../src/app/p/[handle]/page.tsx', import.meta.url),
    'utf8'
  );
  const ownerRoute = await readFile(
    new URL('../src/app/(app)/passport/page.tsx', import.meta.url),
    'utf8'
  );

  assert.match(legacyRoute, /permanentRedirect\(getPassportPath\(username\)\)/);
  assert.match(canonicalRoute, /Mechi V5 Passport/);
  assert.match(canonicalRoute, /resolveHandle/);
  assert.match(ownerRoute, /Mechi V5/);
});
