/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const { readFile } = require('node:fs/promises');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const read = (relativePath) => readFile(path.join(root, relativePath), 'utf8');
const migrationPath = 'supabase/migrations/20260814021931_add_minor_account_passport_privacy.sql';

test('age policy stores only a minimal private category and no birth date', async () => {
  const [sql, types] = await Promise.all([
    read(migrationPath),
    read('src/lib/passport-types.ts'),
  ]);

  assert.match(sql, /age_policy_status[\s\S]+unknown[\s\S]+minor[\s\S]+adult/i);
  assert.match(sql, /Never serialize into public Gamer Passport payloads/i);
  assert.doesNotMatch(sql, /date_of_birth|birth_date|guardian_email|guardian_phone/i);
  assert.match(types, /export type PrivateAgePolicy/);
  assert.match(types, /export type PassportOwnerData[\s\S]+age_policy: PrivateAgePolicy/);
  const publicData = types.match(/export type PublicPassportData = \{([\s\S]+?)\n}/)?.[1] ?? '';
  assert.doesNotMatch(publicData, /age_policy/i);
});

test('age-policy history is service-role only and protected by RLS', async () => {
  const sql = await read(migrationPath);

  assert.match(sql, /ALTER TABLE public\.profile_age_policy_events ENABLE ROW LEVEL SECURITY/i);
  assert.match(sql, /REVOKE ALL ON TABLE public\.profile_age_policy_events FROM anon, authenticated/i);
  assert.match(sql, /GRANT ALL ON TABLE public\.profile_age_policy_events TO service_role/i);
  assert.match(sql, /REVOKE ALL ON FUNCTION public\.set_profile_age_policy[\s\S]+PUBLIC, anon, authenticated/i);
  assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.set_profile_age_policy[\s\S]+service_role/i);
});

test('self declaration can enter but cannot remove minor protections', async () => {
  const sql = await read(migrationPath);

  assert.match(sql, /p_actor_id IS DISTINCT FROM p_user_id/i);
  assert.match(sql, /p_new_status NOT IN \('minor', 'adult'\)/i);
  assert.match(sql, /v_previous_status = 'minor' AND p_new_status <> 'minor'/i);
  assert.match(sql, /Minor protections require administrator review to remove/i);
  assert.match(sql, /ELSE[\s\S]+p_actor_id IS NULL[\s\S]+p_reason/i);
  assert.match(sql, /profile_age_policy_events[\s\S]+previous_status[\s\S]+new_status/i);
});

test('entering minor mode atomically unpublishes and hides the Passport identity', async () => {
  const sql = await read(migrationPath);

  assert.match(sql, /AFTER UPDATE OF age_policy_status ON public\.profiles/i);
  assert.match(sql, /NEW\.age_policy_status = 'minor'[\s\S]+OLD\.age_policy_status IS DISTINCT FROM NEW\.age_policy_status/i);
  assert.match(sql, /UPDATE public\.passport_profiles[\s\S]+publication_status = 'draft'/i);
  assert.match(sql, /publication_consent_version = NULL/i);
  assert.match(sql, /default_visibility = 'private'/i);
  assert.match(sql, /'location', 'private'/i);
  assert.match(sql, /is_discoverable = false/i);
});

test('entering minor mode quarantines all connected sharing surfaces', async () => {
  const sql = await read(migrationPath);

  for (const table of [
    'passport_game_entries',
    'passport_highlights',
    'passport_showcase_items',
    'passport_custom_shelves',
  ]) {
    assert.match(sql, new RegExp(`UPDATE public\\.${table} SET visibility = 'private'`, 'i'));
  }
  assert.match(sql, /UPDATE public\.passport_activity_objects SET audience = 'private'/i);
  assert.match(sql, /UPDATE public\.passport_replay_snapshots SET is_public = false/i);
  assert.match(sql, /UPDATE public\.passport_cv_settings[\s\S]+inquiry_enabled = false[\s\S]+inquiry_url = NULL/i);
  assert.match(sql, /UPDATE public\.passport_media_kit_settings[\s\S]+enabled = false[\s\S]+inquiry_url = NULL/i);
});

test('database triggers fail closed for future minor-account writes', async () => {
  const sql = await read(migrationPath);

  for (const trigger of [
    'passport_profiles_enforce_minor_privacy',
    'passport_game_entries_enforce_minor_privacy',
    'passport_highlights_enforce_minor_privacy',
    'passport_showcase_items_enforce_minor_privacy',
    'passport_custom_shelves_enforce_minor_privacy',
    'passport_activity_objects_enforce_minor_privacy',
    'passport_replay_snapshots_enforce_minor_privacy',
    'passport_cv_settings_enforce_minor_privacy',
    'passport_media_kit_settings_enforce_minor_privacy',
  ]) {
    assert.match(sql, new RegExp(`CREATE TRIGGER ${trigger}[\\s\\S]+BEFORE INSERT OR UPDATE`, 'i'));
  }
});

test('public resolution and publication fail closed for minor accounts', async () => {
  const [passport, progression, resume] = await Promise.all([
    read('src/lib/passport.ts'),
    read('src/lib/passport-progression.ts'),
    read('src/lib/passport-resume.ts'),
  ]);

  assert.match(passport, /resolvePublicPassportHandleForAccountUsername[\s\S]+isMinorAccount\(profile\.id\)/);
  assert.match(passport, /setPassportPublication[\s\S]+isMinorAccount/);
  assert.match(passport, /upsertPassportProfile[\s\S]+agePolicy\.status === ["']minor["']/);
  assert.match(progression, /updatePassportMediaKitSettings[\s\S]+isMinorAccount/);
  assert.match(progression, /setPassportReplayPublic[\s\S]+isMinorAccount/);
  assert.match(progression, /getPublicPassportReplay[\s\S]+isMinorAccount/);
  assert.match(progression, /getPublicPassportMediaKitSettings[\s\S]+isMinorAccount/);
  assert.match(resume, /settings\.inquiry_enabled && \(await isMinorAccount/);
});

test('owner and admin mutation routes require confirmation and review evidence', async () => {
  const [ownerRoute, adminRoute, audit] = await Promise.all([
    read('src/app/api/passport/me/age-policy/route.ts'),
    read('src/app/api/admin/users/[id]/route.ts'),
    read('src/lib/audit.ts'),
  ]);

  assert.match(ownerRoute, /requireActiveAccessProfile/);
  assert.match(ownerRoute, /body\.confirmed !== true/);
  assert.match(ownerRoute, /body\.status !== 'minor' && body\.status !== 'adult'/);
  assert.match(ownerRoute, /private, no-store/);
  assert.match(adminRoute, /body\.action === 'set_age_policy'/);
  assert.match(adminRoute, /body\.action === 'set_age_policy'[\s\S]+!hasAdminAccess\(admin\)/);
  assert.match(adminRoute, /reason\.length < 5/);
  assert.match(adminRoute, /change_user_age_policy/);
  assert.match(audit, /change_user_age_policy/);
});

test('generic profile responses strip private age-policy columns', async () => {
  const route = await read('src/app/api/users/profile/route.ts');

  assert.match(route, /function withoutPrivateProfileFields/);
  assert.match(route, /delete safeProfile\.age_policy_status/);
  assert.match(route, /delete safeProfile\.age_policy_source/);
  assert.match(route, /delete safeProfile\.age_policy_updated_at/);
  assert.match(route, /withProfileDefaults\(safeProfile/);
});

test('minor owner UX disables publication and explains the one-way safety transition', async () => {
  const editor = await read('src/app/(app)/passport/passport-editor.tsx');

  assert.match(editor, /I am under 18/);
  assert.match(editor, /I am 18 or older/);
  assert.match(editor, /not your date of birth/i);
  assert.match(editor, /administrator review/i);
  assert.match(editor, /isMinorProtected[\s\S]+Save and publish Passport/);
  assert.match(editor, /disabled=\{isMinorProtected/);
});

test('leaving minor mode does not silently restore any public state', async () => {
  const sql = await read(migrationPath);
  const quarantine = sql.match(/CREATE OR REPLACE FUNCTION private\.quarantine_minor_passport_content\(\)([\s\S]+?)DROP TRIGGER/i)?.[1] ?? '';

  assert.match(quarantine, /NEW\.age_policy_status = 'minor'/i);
  assert.doesNotMatch(quarantine, /NEW\.age_policy_status = 'adult'[\s\S]+publication_status = 'published'/i);
  assert.doesNotMatch(quarantine, /SET visibility = 'public'|SET audience = 'public'|SET is_public = true/i);
});
