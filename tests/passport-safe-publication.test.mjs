import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('legacy Passports are snapshotted and quarantined as private drafts', async () => {
  const sql = await read('../supabase/migrations/20260813230653_passport_safe_publication_handles.sql');
  assert.match(sql, /passport_publication_migration_snapshots/i);
  assert.match(sql, /UPDATE public\.passport_profiles[\s\S]+publication_status = 'draft'/i);
  assert.match(sql, /default_visibility = 'private'/i);
  assert.match(sql, /is_discoverable = false/i);
  assert.match(sql, /passport_legacy_publication_quarantined/i);
});

test('database publication requires a safe handle and explicit consent', async () => {
  const sql = await read('../supabase/migrations/20260813230653_passport_safe_publication_handles.sql');
  assert.match(sql, /public_handle ~ '\^\[a-z\]\[a-z0-9_\]\{2,19\}\$'/i);
  assert.match(sql, /publication_consent_at IS NOT NULL/i);
  assert.match(sql, /publication_consent_version IS NOT NULL/i);
  assert.match(sql, /regexp_replace\(display_name, '\[\^0-9\]'/i);
  assert.match(sql, /publication_status = 'published'[\s\S]+default_visibility = 'public'/i);
  assert.match(sql, /CREATE UNIQUE INDEX[\s\S]+lower\(public_handle\)/i);
});

test('public resolution is handle-based and fails closed for drafts', async () => {
  const passport = await read('../src/lib/passport.ts');
  const social = await read('../src/lib/passport-social.ts');
  const legacyRoute = await read('../src/app/s/[username]/page.tsx');
  const proxy = await read('../src/proxy.ts');

  assert.match(passport, /eq\('public_handle', validation\.handle\)/);
  assert.match(passport, /eq\('publication_status', 'published'\)/);
  assert.match(social, /eq\('publication_status', 'published'\)/);
  assert.match(legacyRoute, /resolvePublicPassportHandleForAccountUsername/);
  assert.match(legacyRoute, /if \(!handle\) notFound\(\)/);
  assert.doesNotMatch(proxy, /profileUrl\.pathname = `\/@\$\{profileUsername\}`/);
});

test('owner publication is a separate explicit-confirmation action', async () => {
  const route = await read('../src/app/api/passport/me/publication/route.ts');
  const editor = await read('../src/app/(app)/passport/passport-editor.tsx');
  assert.match(route, /candidate\.confirmed !== true/);
  assert.match(route, /setPassportPublication/);
  assert.match(editor, /Save and publish Passport/);
  assert.match(editor, /Unpublish Passport/);
  assert.match(editor, /public_handle/);
});
