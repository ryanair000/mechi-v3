/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const { readFile } = require('node:fs/promises');
const path = require('node:path');
const test = require('node:test');
const { createJiti } = require('jiti');

const root = path.resolve(__dirname, '..');
const sourceRoot = path.join(root, 'src').replaceAll('\\', '/');
const read = (relativePath) => readFile(path.join(root, relativePath), 'utf8');
const jiti = createJiti(__filename, {
  alias: { '@/': `${sourceRoot}/` },
  interopDefault: true,
});
const policyPromise = jiti.import('../src/lib/passport-access-policy.ts');

function state(publicationStatus, defaultVisibility, isDiscoverable) {
  return {
    publication_status: publicationStatus,
    default_visibility: defaultVisibility,
    is_discoverable: isDiscoverable,
  };
}

test('the four access modes are derived from publication, visibility, and discovery', async () => {
  const { resolvePassportAccessMode } = await policyPromise;

  assert.equal(resolvePassportAccessMode(state('draft', 'private', false)), 'private');
  assert.equal(resolvePassportAccessMode(state('draft', 'public', true)), 'private');
  assert.equal(resolvePassportAccessMode(state('published', 'private', true)), 'private');
  assert.equal(resolvePassportAccessMode(state('published', 'friends', false)), 'friends');
  assert.equal(resolvePassportAccessMode(state('published', 'friends', true)), 'friends');
  assert.equal(resolvePassportAccessMode(state('published', 'public', false)), 'link_only');
  assert.equal(resolvePassportAccessMode(state('published', 'public', true)), 'discoverable');
});

test('anonymous direct access and discovery are intentionally separate capabilities', async () => {
  const { isPassportAnonymousAccessible, isPassportDiscoveryEligible } = await policyPromise;
  const linkOnly = state('published', 'public', false);
  const discoverable = state('published', 'public', true);
  const friends = state('published', 'friends', false);

  assert.equal(isPassportAnonymousAccessible(linkOnly), true);
  assert.equal(isPassportDiscoveryEligible(linkOnly), false);
  assert.equal(isPassportAnonymousAccessible(discoverable), true);
  assert.equal(isPassportDiscoveryEligible(discoverable), true);
  assert.equal(isPassportAnonymousAccessible(friends), false);
  assert.equal(isPassportDiscoveryEligible(friends), false);
});

test('community audience ceilings preserve friends while suppressing link-only discovery', async () => {
  const { passportActivityAudienceCeiling } = await policyPromise;

  assert.equal(passportActivityAudienceCeiling(state('draft', 'private', false)), 'private');
  assert.equal(passportActivityAudienceCeiling(state('published', 'friends', false)), 'friends');
  assert.equal(passportActivityAudienceCeiling(state('published', 'public', false)), 'private');
  assert.equal(passportActivityAudienceCeiling(state('published', 'public', true)), 'public');
});

test('direct handle resolution allows published link-only Passports without widening discovery', async () => {
  const passport = await read('src/lib/passport.ts');
  const resolver = passport.match(/export async function getPassportData([\s\S]+?)\nexport async function getPassportOwnerDataByUserId/)?.[1] ?? '';

  assert.match(resolver, /eq\('publication_status', 'published'\)/);
  assert.doesNotMatch(resolver, /eq\('is_discoverable', true\)/);
  assert.match(resolver, /resolvePassportAccessMode\(identity\)/);
  assert.match(resolver, /accessMode === 'friends' && !options\.friendView/);
});

test('ambient surfaces require the centralized discoverable mode', async () => {
  const [social, comparison, community, metadata] = await Promise.all([
    read('src/lib/passport-social.ts'),
    read('src/lib/passport-comparison.ts'),
    read('src/lib/passport-community.ts'),
    read('src/lib/passport-metadata.ts'),
  ]);

  assert.match(social, /eq\('publication_status', 'published'\)\.eq\('is_discoverable', true\)/);
  assert.match(social, /eq\('default_visibility', 'public'\)/);
  assert.match(comparison, /isPassportDiscoveryEligible\(left\.identity\)/);
  assert.match(comparison, /isPassportDiscoveryEligible\(right\.identity\)/);
  assert.match(community, /passportActivityAudienceCeiling/);
  assert.match(metadata, /isPassportDiscoveryEligible\(identity\)/);
});

test('database constraints prevent invalid discovery combinations', async () => {
  const sql = await read('supabase/migrations/20260813230653_passport_safe_publication_handles.sql');

  assert.match(sql, /passport_profiles_discoverability_requires_publication/i);
  assert.match(sql, /is_discoverable = false OR \([\s\S]+publication_status = 'published'/i);
  assert.match(sql, /default_visibility = 'public'/i);
  assert.match(sql, /public_handle IS NOT NULL/i);
});

test('visibility mutations immediately clamp stale projected activity', async () => {
  const [sql, passport] = await Promise.all([
    read('supabase/migrations/20260814112302_clamp_passport_activity_to_access_mode.sql'),
    read('src/lib/passport.ts'),
  ]);

  assert.match(sql, /AFTER UPDATE OF publication_status, default_visibility, is_discoverable, field_visibility/i);
  assert.match(sql, /NEW\.publication_status <> 'published'/i);
  assert.match(sql, /NEW\.default_visibility = 'public' AND NEW\.is_discoverable = false/i);
  assert.match(sql, /SET audience = 'private'/i);
  assert.match(sql, /NEW\.default_visibility = 'friends'[\s\S]+SET audience = 'friends'/i);
  assert.doesNotMatch(sql, /SET audience = 'public'/i);
  assert.match(sql, /REVOKE ALL ON FUNCTION private\.clamp_passport_activity_to_access_mode/i);
  assert.match(passport, /refreshPassportActivityAfterAccessChange[\s\S]+projectPassportActivity\(userId\)/);
  assert.match(passport, /changedFields\.some[\s\S]+is_discoverable[\s\S]+refreshPassportActivityAfterAccessChange\(userId\)/);
  assert.match(passport, /passport_published[\s\S]+refreshPassportActivityAfterAccessChange\(userId\)/);
});

test('owner UI explains direct-link consequences before publication and discovery changes', async () => {
  const editor = await read('src/app/(app)/passport/passport-editor.tsx');

  assert.match(editor, /Publish this Gamer Passport\?/);
  assert.match(editor, /Anyone with your @handle link will be able to view/);
  assert.match(editor, /public by direct link/);
  assert.match(editor, /old or shared links still work/);
  assert.match(editor, /Publication starts link-only and never enables discovery automatically/);
  assert.match(editor, /direct @handle link still works for anyone/);
  assert.match(editor, /aria-pressed=\{isDiscoverable\}/);
});
