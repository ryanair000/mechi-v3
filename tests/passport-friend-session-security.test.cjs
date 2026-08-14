/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const { readFile } = require('node:fs/promises');
const path = require('node:path');
const test = require('node:test');
const jwt = require('jsonwebtoken');
const { createJiti } = require('jiti');

const root = path.resolve(__dirname, '..');
const sourceRoot = path.join(root, 'src').replaceAll('\\', '/');
const testSecret = 'passport-friend-session-security-secret';
process.env.JWT_SECRET = testSecret;

const jiti = createJiti(__filename, {
  alias: { '@/': `${sourceRoot}/` },
  interopDefault: true,
});

const sessionPolicyPromise = jiti.import('../src/lib/auth-session-policy.ts');
const viewerPolicyPromise = jiti.import('../src/lib/passport-viewer-access-policy.ts');
const authPromise = jiti.import('../src/lib/auth.ts');
const read = (relativePath) => readFile(path.join(root, relativePath), 'utf8');

function accessDependencies(viewer, options = {}) {
  const calls = { blocks: 0, friendships: 0 };
  return {
    calls,
    dependencies: {
      getActiveViewer: async () => viewer,
      hasBlock: async () => {
        calls.blocks += 1;
        return options.blocked ?? false;
      },
      areFriends: async () => {
        calls.friendships += 1;
        return options.friends ?? false;
      },
    },
  };
}

test('session versions preserve legacy rollout and reject stale credentials', async () => {
  const {
    LEGACY_AUTH_SESSION_VERSION,
    isAuthSessionVersionCurrent,
    nextAuthSessionVersion,
    normalizeAuthSessionVersion,
  } = await sessionPolicyPromise;

  assert.equal(normalizeAuthSessionVersion(undefined), LEGACY_AUTH_SESSION_VERSION);
  assert.equal(isAuthSessionVersionCurrent(undefined, 1), true);
  assert.equal(isAuthSessionVersionCurrent(4, 4), true);
  assert.equal(isAuthSessionVersionCurrent(3, 4), false);
  assert.equal(nextAuthSessionVersion(4), 5);
  assert.throws(() => nextAuthSessionVersion(2_147_483_647), RangeError);
});

test('issued JWTs carry the live session version and expired JWTs fail verification', async () => {
  const { createSessionForProfile, verifyToken } = await authPromise;
  const session = createSessionForProfile({
    id: 'viewer-1',
    username: 'viewer',
    auth_session_version: 7,
  });
  assert.equal(verifyToken(session.token).auth_session_version, 7);

  const expired = jwt.sign(
    { sub: 'viewer-1', username: 'viewer', auth_session_version: 7 },
    testSecret,
    { expiresIn: -1 }
  );
  assert.equal(verifyToken(expired), null);
});

test('valid active friends receive friend access using the current relationship', async () => {
  const { resolvePassportViewerAccess } = await viewerPolicyPromise;
  const fixture = accessDependencies({ id: 'viewer-1' }, { friends: true });
  const access = await resolvePassportViewerAccess(
    'target-1',
    true,
    fixture.dependencies
  );

  assert.deepEqual(access, {
    credential_presented: true,
    viewer_id: 'viewer-1',
    blocked: false,
    friend_view: true,
  });
  assert.deepEqual(fixture.calls, { blocks: 1, friendships: 1 });
});

for (const state of ['expired', 'suspended', 'deleted', 'stale']) {
  test(`${state} sessions cannot receive friend-only Passport data`, async () => {
    const { resolvePassportViewerAccess } = await viewerPolicyPromise;
    const fixture = accessDependencies(null, { friends: true });
    const access = await resolvePassportViewerAccess(
      'target-1',
      true,
      fixture.dependencies
    );

    assert.deepEqual(access, {
      credential_presented: true,
      viewer_id: null,
      blocked: false,
      friend_view: false,
    });
    assert.deepEqual(fixture.calls, { blocks: 0, friendships: 0 });
  });
}

test('a current block wins over friendship and avoids the friendship lookup', async () => {
  const { resolvePassportViewerAccess } = await viewerPolicyPromise;
  const fixture = accessDependencies(
    { id: 'viewer-1' },
    { blocked: true, friends: true }
  );
  const access = await resolvePassportViewerAccess(
    'target-1',
    true,
    fixture.dependencies
  );

  assert.equal(access.blocked, true);
  assert.equal(access.friend_view, false);
  assert.deepEqual(fixture.calls, { blocks: 1, friendships: 0 });
});

test('friendship changes take effect on the next authorization decision', async () => {
  const { resolvePassportViewerAccess } = await viewerPolicyPromise;
  let friends = true;
  const dependencies = {
    getActiveViewer: async () => ({ id: 'viewer-1' }),
    hasBlock: async () => false,
    areFriends: async () => friends,
  };

  const before = await resolvePassportViewerAccess('target-1', true, dependencies);
  friends = false;
  const after = await resolvePassportViewerAccess('target-1', true, dependencies);
  assert.equal(before.friend_view, true);
  assert.equal(after.friend_view, false);
});

test('friend-only surfaces use centralized live viewer authorization and private caching', async () => {
  const [passportRoute, gamesRoute, page, viewerAccess, access] = await Promise.all([
    read('src/app/api/passport/[username]/route.ts'),
    read('src/app/api/passport/[username]/games/route.ts'),
    read('src/app/p/[handle]/page.tsx'),
    read('src/lib/passport-viewer-access.ts'),
    read('src/lib/access.ts'),
  ]);

  for (const source of [passportRoute, gamesRoute]) {
    assert.match(source, /resolvePassportRequestViewerAccess/);
    assert.match(source, /credential_presented/);
    assert.match(source, /private, no-store/);
    assert.doesNotMatch(source, /getAuthUser|arePassportFriends|hasPassportBlockBetween/);
  }
  assert.match(page, /resolvePassportTokenViewerAccess/);
  assert.doesNotMatch(page, /verifyToken|arePassportFriends|hasPassportBlockBetween/);
  assert.match(viewerAccess, /getOptionalActiveAccessProfile/);
  assert.match(viewerAccess, /getActiveAccessProfileFromToken/);
  assert.match(access, /isAuthSessionVersionCurrent/);
  assert.match(access, /is_banned/);
});

test('password changes, suspension, and incident response rotate the session version', async () => {
  const [passwordReset, moderatorReset, adminUser, migration] = await Promise.all([
    read('src/app/api/auth/password/reset/route.ts'),
    read('src/app/api/admin/moderators/reset-password/route.ts'),
    read('src/app/api/admin/users/[id]/route.ts'),
    read('supabase/migrations/20260814015409_add_profile_auth_session_version.sql'),
  ]);

  assert.match(passwordReset, /nextAuthSessionVersion/);
  assert.match(moderatorReset, /nextAuthSessionVersion/);
  assert.match(adminUser, /body\.action === 'ban'[\s\S]+nextAuthSessionVersion/);
  assert.match(adminUser, /body\.action === 'revoke_sessions'[\s\S]+nextAuthSessionVersion/);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS auth_session_version integer NOT NULL DEFAULT 1/i);
  assert.match(migration, /CHECK \(auth_session_version >= 1\)/i);
});
