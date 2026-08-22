/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const { readFile } = require('node:fs/promises');
const path = require('node:path');
const test = require('node:test');
const { createJiti } = require('jiti');

const root = path.resolve(__dirname, '..');
const sourceRoot = path.join(root, 'src').replaceAll('\\', '/');
const jiti = createJiti(__filename, {
  alias: { '@/': `${sourceRoot}/` },
  interopDefault: true,
});

const privacyModulePromise = jiti.import('../src/lib/passport-verification-privacy.ts');
const summaryModulePromise = jiti.import('../src/lib/passport-public-summary.ts');
const typesModulePromise = jiti.import('../src/lib/passport-types.ts');

const passportFields = [
  'bio',
  'gamer_since',
  'archetypes',
  'current_status',
  'location',
  'platforms',
  'games',
  'game_ids',
  'competitive',
  'events',
  'achievements',
  'teams',
  'social',
];

function visibility(value = 'public') {
  return Object.fromEntries(passportFields.map((field) => [field, value]));
}

function identity(overrides = {}) {
  return {
    default_visibility: 'public',
    field_visibility: visibility(),
    ...overrides,
  };
}

function verification(subjectType, publicDetails = {}) {
  return {
    id: `verification-${subjectType}`,
    subject_type: subjectType,
    verification_state: 'mechi_verified',
    label: `${subjectType} verified`,
    source_type: 'mechi_test',
    public_details: publicDetails,
    issued_at: '2026-08-14T00:00:00.000Z',
  };
}

const subjects = [
  'profile',
  'game_account',
  'match',
  'tournament',
  'event',
  'team',
  'achievement',
];

test('every database verification subject has an explicit visibility policy', async () => {
  const { PASSPORT_VERIFICATION_VISIBILITY_FIELDS } = await privacyModulePromise;
  const { PASSPORT_VERIFICATION_SUBJECT_TYPES } = await typesModulePromise;

  assert.deepEqual([...PASSPORT_VERIFICATION_SUBJECT_TYPES].sort(), subjects.slice().sort());
  assert.deepEqual(Object.keys(PASSPORT_VERIFICATION_VISIBILITY_FIELDS).sort(), subjects.slice().sort());
  for (const fields of Object.values(PASSPORT_VERIFICATION_VISIBILITY_FIELDS)) {
    assert.ok(fields.length > 0);
    assert.ok(fields.every((field) => passportFields.includes(field)));
  }
});

test('known verification subjects remain visible only when their controlling facts are public', async () => {
  const { filterPublicPassportVerifications } = await privacyModulePromise;
  const input = subjects.map((subject) => verification(subject));
  const output = filterPublicPassportVerifications(input, identity());

  assert.deepEqual(output.map((entry) => entry.subject_type), subjects);
  assert.ok(output.every((entry) => entry.issued_at === '2026-08-14T00:00:00.000Z'));
});

test('each hidden source field removes its corresponding verification preview and timestamp', async () => {
  const { resolvePublicPassportVerification } = await privacyModulePromise;
  const cases = [
    ['bio', 'profile'],
    ['games', 'game_account'],
    ['game_ids', 'game_account'],
    ['platforms', 'game_account'],
    ['competitive', 'match'],
    ['events', 'tournament'],
    ['events', 'event'],
    ['teams', 'team'],
    ['achievements', 'achievement'],
  ];

  for (const [hiddenField, subject] of cases) {
    const targetIdentity = identity({
      field_visibility: { ...visibility(), [hiddenField]: 'private' },
    });
    assert.equal(
      resolvePublicPassportVerification(verification(subject), targetIdentity),
      null,
      `${subject} leaked through hidden ${hiddenField}`
    );
  }
});

test('friends-only verification facts appear only in an authorized friend view', async () => {
  const { resolvePublicPassportVerification } = await privacyModulePromise;
  const targetIdentity = identity({
    field_visibility: { ...visibility(), competitive: 'friends' },
  });
  const match = verification('match', { game: 'eFootball', result: 'win' });

  assert.equal(resolvePublicPassportVerification(match, targetIdentity, false), null);
  assert.equal(resolvePublicPassportVerification(match, targetIdentity, true)?.subject_type, 'match');
});

test('private default visibility suppresses every verification preview', async () => {
  const { filterPublicPassportVerifications } = await privacyModulePromise;
  const output = filterPublicPassportVerifications(
    subjects.map((subject) => verification(subject)),
    identity({ default_visibility: 'private' })
  );
  assert.deepEqual(output, []);
});

test('unknown verification subjects fail closed and do not widen the public contract', async () => {
  const { resolvePublicPassportVerification } = await privacyModulePromise;
  const unknown = verification('future_biometric_identity', {
    email: 'private@example.com',
    phone: '+254700000000',
  });

  assert.equal(resolvePublicPassportVerification(unknown, identity()), null);
});

test('public details are strict per subject and discard unexpected or malformed keys', async () => {
  const { resolvePublicPassportVerification } = await privacyModulePromise;
  const event = resolvePublicPassportVerification(verification('event', {
    event_key: 'playmechi-finals',
    stamp_type: 'checked_in',
    game: 'CODM',
    placement: 2,
    partner_organization: 'Mechi Arena',
    tournament_id: 'internal-uuid',
    partner_issuer_id: 'internal-partner-id',
    email: 'private@example.com',
    phone: '+254700000000',
    evidence: { secret_url: 'https://private.example/evidence' },
  }), identity());

  assert.deepEqual(event?.public_details, {
    event_key: 'playmechi-finals',
    stamp_type: 'checked_in',
    game: 'CODM',
    placement: 2,
    partner_organization: 'Mechi Arena',
  });

  const malformed = resolvePublicPassportVerification(verification('event', {
    event_key: { nested: true },
    placement: 'first',
    game: ['CODM'],
  }), identity());
  assert.deepEqual(malformed?.public_details, {});
});

test('profile detail arrays retain only known field names and bounded public values', async () => {
  const { resolvePublicPassportVerification } = await privacyModulePromise;
  const profile = resolvePublicPassportVerification(verification('profile', {
    verification_kind: `identity\u0000 ${'x'.repeat(100)}`,
    verified_fields: ['bio', 'location', 'email', 'phone', { nested: true }],
  }), identity());

  assert.deepEqual(profile?.public_details.verified_fields, ['bio', 'location']);
  assert.equal(profile?.public_details.verification_kind.length, 60);
});

test('public aggregate counts only verification previews that survived visibility and schema policy', async () => {
  const { filterPublicPassportVerifications } = await privacyModulePromise;
  const { buildPublicPassportSummary } = await summaryModulePromise;
  const targetIdentity = identity();
  const visible = filterPublicPassportVerifications([
    verification('match'),
    verification('event'),
    verification('future_private_type'),
  ], targetIdentity);
  const sourceSummary = {
    games_count: 1,
    playing_games_count: 1,
    completed_games_count: 0,
    favorite_games_count: 0,
    total_library_hours: 0,
    friends_count: 0,
    followers_count: 0,
    following_count: 0,
    total_matches: 12,
    total_wins: 7,
    total_losses: 5,
    win_rate: 58,
    best_rating: 1200,
    tournaments_registered: 3,
    events_attended: 2,
    completed_events: 1,
    achievements_count: 0,
    badges_count: 0,
    teams_count: 0,
    verified_records_count: 999,
    last_activity_at: '2026-08-14T00:00:00.000Z',
    computed_at: '2026-08-14T00:01:00.000Z',
  };
  const publicSummary = buildPublicPassportSummary(
    sourceSummary,
    targetIdentity,
    false,
    visible.length
  );

  assert.equal(visible.length, 2);
  assert.equal(publicSummary.verified_records_count, 16);
  assert.notEqual(publicSummary.verified_records_count, sourceSummary.verified_records_count);
});

test('public Passport assembly uses the verification filter before summary and serialization', async () => {
  const source = await readFile(path.join(root, 'src/lib/passport.ts'), 'utf8');
  const filterPosition = source.indexOf('const publicVerifications = filterPublicPassportVerifications');
  const summaryPosition = source.indexOf('summary: buildPublicPassportSummary');
  const outputPosition = source.indexOf('verifications: publicVerifications');

  assert.ok(filterPosition > 0);
  assert.ok(summaryPosition > filterPosition);
  assert.ok(outputPosition > summaryPosition);
  assert.doesNotMatch(source.slice(summaryPosition, outputPosition + 40), /verifications,\s*$/m);
});
