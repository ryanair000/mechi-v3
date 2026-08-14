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

const summaryModulePromise = jiti.import('../src/lib/passport-public-summary.ts');

const fields = [
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
  return Object.fromEntries(fields.map((field) => [field, value]));
}

function identity(overrides = {}) {
  return {
    default_visibility: 'public',
    field_visibility: visibility(),
    ...overrides,
  };
}

function summary() {
  return {
    games_count: 13,
    playing_games_count: 2,
    completed_games_count: 8,
    favorite_games_count: 4,
    total_library_hours: 620,
    friends_count: 7,
    followers_count: 31,
    following_count: 12,
    total_matches: 43,
    total_wins: 29,
    total_losses: 14,
    win_rate: 67,
    best_rating: 1610,
    tournaments_registered: 9,
    events_attended: 6,
    completed_events: 5,
    achievements_count: 11,
    badges_count: 3,
    teams_count: 2,
    verified_records_count: 58,
    last_activity_at: '2026-08-13T21:00:00.000Z',
    computed_at: '2026-08-14T00:00:00.000Z',
    internal_secret: 'must-never-be-spread',
  };
}

test('public summary is an explicit allowlist and excludes internal projection fields', async () => {
  const { buildPublicPassportSummary } = await summaryModulePromise;
  const output = buildPublicPassportSummary(summary(), identity());

  assert.equal(output.games_count, 13);
  assert.equal(output.verified_records_count, 58);
  assert.equal(output.last_activity_at, '2026-08-13T21:00:00.000Z');
  assert.equal(Object.hasOwn(output, 'computed_at'), false);
  assert.equal(Object.hasOwn(output, 'internal_secret'), false);
});

test('every public summary key has an explicit source-domain mapping', async () => {
  const { PASSPORT_SUMMARY_PRIVACY_SOURCES, buildPublicPassportSummary } = await summaryModulePromise;
  const output = buildPublicPassportSummary(summary(), identity());

  assert.deepEqual(
    Object.keys(PASSPORT_SUMMARY_PRIVACY_SOURCES).sort(),
    Object.keys(output).sort()
  );
});

test('hiding games masks every game-derived counter without masking unrelated facts', async () => {
  const { buildPublicPassportSummary } = await summaryModulePromise;
  const output = buildPublicPassportSummary(summary(), identity({
    field_visibility: { ...visibility(), games: 'private' },
  }));

  assert.equal(output.games_count, 0);
  assert.equal(output.playing_games_count, 0);
  assert.equal(output.completed_games_count, 0);
  assert.equal(output.favorite_games_count, 0);
  assert.equal(output.total_library_hours, 0);
  assert.equal(output.total_matches, 43);
  assert.equal(Object.hasOwn(output, 'verified_records_count'), false);
});

test('hiding competitive or event history removes every cross-domain inference', async () => {
  const { buildPublicPassportSummary } = await summaryModulePromise;
  for (const hiddenField of ['competitive', 'events']) {
    const output = buildPublicPassportSummary(summary(), identity({
      field_visibility: { ...visibility(), [hiddenField]: 'private' },
    }));
    assert.equal(Object.hasOwn(output, 'verified_records_count'), false, `${hiddenField} leaked verified total`);
    assert.equal(Object.hasOwn(output, 'last_activity_at'), false, `${hiddenField} leaked activity timing`);
  }

  const competitiveHidden = buildPublicPassportSummary(summary(), identity({
    field_visibility: { ...visibility(), competitive: 'private' },
  }));
  assert.equal(competitiveHidden.total_matches, 0);
  assert.equal(competitiveHidden.total_wins, 0);
  assert.equal(competitiveHidden.total_losses, 0);
  assert.equal(competitiveHidden.win_rate, 0);
  assert.equal(competitiveHidden.best_rating, 0);

  const eventsHidden = buildPublicPassportSummary(summary(), identity({
    field_visibility: { ...visibility(), events: 'private' },
  }));
  assert.equal(eventsHidden.tournaments_registered, 0);
  assert.equal(eventsHidden.events_attended, 0);
  assert.equal(eventsHidden.completed_events, 0);
});

test('achievement privacy removes the aggregate verified-record inference', async () => {
  const { buildPublicPassportSummary } = await summaryModulePromise;
  const output = buildPublicPassportSummary(summary(), identity({
    field_visibility: { ...visibility(), achievements: 'private' },
  }));

  assert.equal(output.achievements_count, 0);
  assert.equal(output.badges_count, 0);
  assert.equal(Object.hasOwn(output, 'verified_records_count'), false);
  assert.equal(output.last_activity_at, '2026-08-13T21:00:00.000Z');
});

test('every verification subject domain must be visible before exposing the combined count', async () => {
  const { buildPublicPassportSummary } = await summaryModulePromise;
  const verificationDomains = [
    'games',
    'game_ids',
    'platforms',
    'competitive',
    'events',
    'teams',
    'achievements',
  ];

  for (const hiddenField of verificationDomains) {
    const output = buildPublicPassportSummary(summary(), identity({
      field_visibility: { ...visibility(), [hiddenField]: 'private' },
    }));
    assert.equal(
      Object.hasOwn(output, 'verified_records_count'),
      false,
      `${hiddenField} leaked the combined verification count`
    );
  }
});

test('team and social privacy mask only their dependent counters', async () => {
  const { buildPublicPassportSummary } = await summaryModulePromise;
  const teamsHidden = buildPublicPassportSummary(summary(), identity({
    field_visibility: { ...visibility(), teams: 'private' },
  }));
  assert.equal(teamsHidden.teams_count, 0);
  assert.equal(Object.hasOwn(teamsHidden, 'verified_records_count'), false);

  const socialHidden = buildPublicPassportSummary(summary(), identity({
    field_visibility: { ...visibility(), social: 'private' },
  }));
  assert.equal(socialHidden.friends_count, 0);
  assert.equal(socialHidden.followers_count, 0);
  assert.equal(socialHidden.following_count, 0);
  assert.equal(socialHidden.games_count, 13);
  assert.equal(socialHidden.total_matches, 43);
  assert.equal(socialHidden.verified_records_count, 58);
});

test('friends-only fields are visible only in an authorized friend view', async () => {
  const { buildPublicPassportSummary } = await summaryModulePromise;
  const friendIdentity = identity({
    field_visibility: { ...visibility(), competitive: 'friends', events: 'friends' },
  });
  const stranger = buildPublicPassportSummary(summary(), friendIdentity, false);
  const friend = buildPublicPassportSummary(summary(), friendIdentity, true);

  assert.equal(stranger.total_matches, 0);
  assert.equal(Object.hasOwn(stranger, 'last_activity_at'), false);
  assert.equal(friend.total_matches, 43);
  assert.equal(friend.last_activity_at, '2026-08-13T21:00:00.000Z');
});

test('private default visibility fails closed even when individual fields say public', async () => {
  const { buildPublicPassportSummary } = await summaryModulePromise;
  const output = buildPublicPassportSummary(summary(), identity({ default_visibility: 'private' }));

  for (const [key, value] of Object.entries(output)) {
    assert.equal(value, 0, `${key} should be masked`);
  }
  assert.equal(Object.hasOwn(output, 'verified_records_count'), false);
  assert.equal(Object.hasOwn(output, 'last_activity_at'), false);
});

test('serialized public Passport DTO contains no hidden derived keys or internal timestamps', async () => {
  const { buildPublicPassportSummary } = await summaryModulePromise;
  const publicDto = {
    access: 'public',
    identity: identity({
      field_visibility: { ...visibility(), competitive: 'private' },
    }),
    summary: buildPublicPassportSummary(summary(), identity({
      field_visibility: { ...visibility(), competitive: 'private' },
    })),
    events: [],
    teams: [],
    verifications: [],
    library: { access: 'public', entries: [], stats: {} },
  };
  const serialized = JSON.parse(JSON.stringify(publicDto));

  assert.equal(serialized.summary.total_matches, 0);
  assert.equal(Object.hasOwn(serialized.summary, 'verified_records_count'), false);
  assert.equal(Object.hasOwn(serialized.summary, 'last_activity_at'), false);
  assert.equal(Object.hasOwn(serialized.summary, 'computed_at'), false);
  assert.doesNotMatch(JSON.stringify(serialized), /must-never-be-spread|2026-08-14T00:00:00/);

  const passportSource = await readFile(path.join(root, 'src/lib/passport.ts'), 'utf8');
  assert.match(passportSource, /summary: buildPublicPassportSummary\(/);
  assert.doesNotMatch(passportSource, /function maskSummary|\.\.\.summary,/);
});
