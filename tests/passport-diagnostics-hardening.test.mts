import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const diagnostics = await readFile(new URL('../src/lib/passport-diagnostics.ts', import.meta.url), 'utf8');
const migration = await readFile(new URL('../supabase/migrations/20260814143826_add_passport_route_diagnostics.sql', import.meta.url), 'utf8');
const hardening = await readFile(new URL('../supabase/migrations/20260814145109_harden_passport_invitation_visit_function.sql', import.meta.url), 'utf8');

test('public Passport diagnostics store hashes and bounded operational fields only', () => {
  assert.match(migration, /request_id_hash text NOT NULL/);
  assert.match(migration, /subject_hash text/);
  assert.match(migration, /duration_ms integer NOT NULL/);
  assert.match(migration, /ALTER TABLE public\.passport_route_diagnostics ENABLE ROW LEVEL SECURITY/);
  assert.match(migration, /REVOKE ALL ON TABLE public\.passport_route_diagnostics FROM PUBLIC, anon, authenticated/);
  assert.doesNotMatch(migration, /handle text|username text|email text|phone text|payload jsonb/i);
  assert.match(diagnostics, /passport-subject-v1/);
});

test('comparison invitation visit RPC is invoker-rights with an empty search path', () => {
  assert.match(hardening, /SECURITY INVOKER/);
  assert.match(hardening, /SET search_path = ''/);
  assert.doesNotMatch(hardening, /SECURITY DEFINER/);
  assert.match(hardening, /REVOKE ALL[\s\S]+FROM PUBLIC, anon, authenticated/);
  assert.match(hardening, /GRANT EXECUTE[\s\S]+TO service_role/);
});
