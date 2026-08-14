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

const publicModulePromise = jiti.import('../src/lib/passport-resume-public.ts');
const routeModulePromise = jiti.import('../src/lib/passport-resume-public-route.ts');
const pdfModulePromise = jiti.import('../src/lib/passport-cv-pdf.ts');

function game(gameKey, overrides = {}) {
  return {
    game: gameKey,
    label: gameKey === 'efootball' ? 'eFootball' : 'Call of Duty Mobile',
    current_rating: 1300,
    peak_rating: 1400,
    matches: 20,
    wins: 12,
    losses: 6,
    draws: 2,
    win_rate: 60,
    tournament_entries: 3,
    tournament_wins: 1,
    podiums: 2,
    latest_match_at: '2026-08-10T10:00:00.000Z',
    ...overrides,
  };
}

function source(overrides = {}) {
  return {
    storage_ready: true,
    identity: {
      user_id: 'private-user-id',
      username: 'safe_player',
      display_name: 'Safe Player',
      avatar_url: 'https://private.example/avatar.png',
      cover_image_url: null,
      bio: 'Private source biography',
      gamer_since: 2019,
      archetypes: ['competitive'],
      current_status: 'competing',
      country_code: 'KE',
      city: 'Nairobi',
      timezone: 'Africa/Nairobi',
      languages: ['English'],
      platforms: ['mobile'],
      favorite_genres: ['Sports'],
      verification_tier: 'mechi_verified',
      verification_score: 90,
      is_discoverable: true,
      default_visibility: 'public',
      field_visibility: {},
      updated_at: '2026-08-14T00:00:00.000Z',
    },
    games: [game('efootball'), game('codm')],
    seasons: ['efootball', 'codm'].map((gameKey) => ({
      id: `season-${gameKey}`,
      season_key: `internal-${gameKey}`,
      title: `${gameKey} season`,
      game: gameKey,
      current_rating: 1300,
      peak_rating: 1400,
      matches: 10,
      wins: 6,
      losses: 3,
      draws: 1,
      tournament_entries: 2,
      tournament_wins: 1,
      podiums: 1,
      starts_at: '2026-01-01T00:00:00.000Z',
      ends_at: null,
    })),
    matches: ['efootball', 'codm'].map((gameKey) => ({
      id: `match-${gameKey}`,
      game: gameKey,
      platform: 'private-platform-id',
      opponent_id: `private-opponent-${gameKey}`,
      opponent_username: `rival_${gameKey}`,
      result: 'win',
      score: '2-0',
      completed_at: '2026-08-10T10:00:00.000Z',
      tournament_id: `private-tournament-${gameKey}`,
    })),
    tournaments: ['efootball', 'codm'].map((gameKey) => ({
      id: `private-tournament-${gameKey}`,
      slug: `public-${gameKey}`,
      title: `${gameKey} cup`,
      game: gameKey,
      status: 'completed',
      registration_state: 'checked_in',
      joined_at: '2026-08-01T10:00:00.000Z',
      checked_in_at: '2026-08-01T11:00:00.000Z',
      highest_round: 4,
      champion: false,
      ended_at: '2026-08-02T10:00:00.000Z',
    })),
    teams: [{
      id: 'private-team-id',
      name: 'Nairobi Titans',
      slug: 'nairobi-titans',
      avatar_url: 'https://private.example/team.png',
      role: 'captain',
      membership_status: 'active',
      joined_at: '2025-01-05T10:00:00.000Z',
      left_at: null,
    }],
    events: ['efootball', 'codm', null].map((gameKey, index) => ({
      id: `private-credential-${index}`,
      verification_token: `public-token-${index}`,
      user_id: 'private-user-id',
      username: 'safe_player',
      display_name: 'Safe Player',
      event_key: `internal-event-${index}`,
      event_title: `Event ${index}`,
      stamp_type: 'competed',
      credential_state: 'active',
      game: gameKey,
      role_label: null,
      placement: 2,
      source_type: 'private-source-type',
      source_key: `private-source-key-${index}`,
      issued_by: 'private-issuer-id',
      issuer_username: null,
      issued_at: '2026-08-01T10:00:00.000Z',
      occurred_at: '2026-08-01T10:00:00.000Z',
      public_details: { email: 'private@example.com' },
      media_url: 'https://private.example/evidence.png',
      media_consent: false,
      revoked_at: null,
    })),
    cv_settings: {
      selected_games: ['efootball'],
      include_events: false,
      include_teams: false,
      include_achievements: false,
      inquiry_enabled: false,
      inquiry_url: 'https://private.example/disabled-contact',
      headline: '  Competitive\u0000   player  ',
    },
    generated_at: '2026-08-14T00:00:00.000Z',
    ...overrides,
  };
}

test('public Gamer CV projection removes disabled modules and owner-only settings', async () => {
  const { buildPublicPassportCompetitiveResume } = await publicModulePromise;
  const input = source();
  const output = buildPublicPassportCompetitiveResume(input);

  assert.deepEqual(Object.keys(output).sort(), [
    'access', 'events', 'games', 'generated_at', 'identity', 'matches',
    'presentation', 'seasons', 'teams', 'tournaments',
  ]);
  assert.deepEqual(output.identity, {
    username: 'safe_player',
    display_name: 'Safe Player',
  });
  assert.deepEqual(output.games.map((entry) => entry.game), ['efootball']);
  assert.deepEqual(output.seasons.map((entry) => entry.game), ['efootball']);
  assert.deepEqual(output.matches.map((entry) => entry.game), ['efootball']);
  assert.deepEqual(output.tournaments.map((entry) => entry.game), ['efootball']);
  assert.deepEqual(output.events, []);
  assert.deepEqual(output.teams, []);
  assert.deepEqual(output.presentation, { headline: 'Competitive player' });
  assert.equal('cv_settings' in output, false);
  assert.equal('storage_ready' in output, false);
  assert.equal('inquiry_url' in output.presentation, false);

  const serialized = JSON.stringify(output);
  for (const forbidden of [
    'private-user-id', 'disabled-contact', 'private-opponent',
    'private-tournament', 'private-source', 'private-issuer',
    'private@example.com', 'private.example/evidence',
  ]) {
    assert.doesNotMatch(serialized, new RegExp(forbidden));
  }
  assert.equal(input.cv_settings.inquiry_url, 'https://private.example/disabled-contact');
  assert.equal(input.teams.length, 1);
});

test('enabled public CV modules use explicit field allowlists', async () => {
  const { buildPublicPassportCompetitiveResume } = await publicModulePromise;
  const output = buildPublicPassportCompetitiveResume(source({
    cv_settings: {
      selected_games: ['efootball'],
      include_events: true,
      include_teams: true,
      include_achievements: true,
      inquiry_enabled: true,
      inquiry_url: 'https://contact.example/player',
      headline: 'Public competitor',
    },
  }));

  assert.equal(output.presentation.inquiry_url, 'https://contact.example/player');
  assert.deepEqual(output.events.map((entry) => entry.game), ['efootball', null]);
  assert.deepEqual(Object.keys(output.events[0]).sort(), [
    'event_title', 'game', 'occurred_at', 'placement', 'stamp_type',
    'verification_token',
  ]);
  assert.deepEqual(Object.keys(output.teams[0]).sort(), [
    'joined_at', 'membership_status', 'name', 'role',
  ]);
  assert.deepEqual(Object.keys(output.matches[0]).sort(), [
    'completed_at', 'game', 'id', 'opponent_username', 'result', 'score',
  ]);
  assert.doesNotMatch(JSON.stringify(output), /source_key|public_details|opponent_id|tournament_id/);
});

test('public inquiry URL fails closed for unsafe or malformed targets', async () => {
  const { buildPublicPassportCompetitiveResume } = await publicModulePromise;
  for (const inquiryUrl of [
    'http://contact.example/player',
    'javascript:alert(1)',
    'https://user:password@contact.example/player',
    'not a URL',
    `https://contact.example/${'x'.repeat(600)}`,
  ]) {
    const output = buildPublicPassportCompetitiveResume(source({
      cv_settings: {
        ...source().cv_settings,
        inquiry_enabled: true,
        inquiry_url: inquiryUrl,
      },
    }));
    assert.equal('inquiry_url' in output.presentation, false, inquiryUrl);
  }
});

test('empty selected-games setting intentionally includes all visible game history', async () => {
  const { buildPublicPassportCompetitiveResume } = await publicModulePromise;
  const output = buildPublicPassportCompetitiveResume(source({
    cv_settings: { ...source().cv_settings, selected_games: [] },
  }));
  assert.deepEqual(output.games.map((entry) => entry.game), ['efootball', 'codm']);
  assert.deepEqual(output.matches.map((entry) => entry.game), ['efootball', 'codm']);
});

test('public route handler serializes only the projected DTO with public caching', async () => {
  const { buildPublicPassportCompetitiveResume } = await publicModulePromise;
  const { createPublicPassportResumeHandler } = await routeModulePromise;
  const projected = buildPublicPassportCompetitiveResume(source());
  let loadedUsername = null;
  const GET = createPublicPassportResumeHandler({
    normalizeUsername: (value) => value.replace(/^@/, '').toLowerCase(),
    loadResume: async (username) => {
      loadedUsername = username;
      return projected;
    },
  });

  const response = await GET(
    new Request('https://mechi.club/api/passport/resume/@SAFE_PLAYER'),
    { params: Promise.resolve({ username: '@SAFE_PLAYER' }) }
  );
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(loadedUsername, 'safe_player');
  assert.equal(
    response.headers.get('cache-control'),
    'public, max-age=30, stale-while-revalidate=120'
  );
  assert.deepEqual(payload, { resume: projected });
  assert.doesNotMatch(JSON.stringify(payload), /cv_settings|disabled-contact/);
});

test('public route handler returns a privacy-safe 404 without a resume', async () => {
  const { createPublicPassportResumeHandler } = await routeModulePromise;
  const GET = createPublicPassportResumeHandler({
    normalizeUsername: (value) => value,
    loadResume: async () => null,
  });
  const response = await GET(
    new Request('https://mechi.club/api/passport/resume/missing'),
    { params: Promise.resolve({ username: 'missing' }) }
  );
  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { error: 'Gamer Resume not found' });
});

test('public PDF consumes the already-filtered DTO and cannot recover disabled inquiry data', async () => {
  const { buildPublicPassportCompetitiveResume } = await publicModulePromise;
  const { buildGamerCvPdf } = await pdfModulePromise;
  const projected = buildPublicPassportCompetitiveResume(source());
  const pdf = buildGamerCvPdf(projected).toString('latin1');

  assert.match(pdf, /^%PDF-1\.4/);
  assert.doesNotMatch(pdf, /disabled-contact|CODM|Nairobi Titans|EVENT PASSPORT/);
});

test('production wiring keeps full settings behind the authenticated owner route', async () => {
  const [publicRoute, ownerRoute, resumeSource] = await Promise.all([
    readFile(path.join(root, 'src/app/api/passport/resume/[username]/route.ts'), 'utf8'),
    readFile(path.join(root, 'src/app/api/passport/resume/me/route.ts'), 'utf8'),
    readFile(path.join(root, 'src/lib/passport-resume.ts'), 'utf8'),
  ]);

  assert.match(publicRoute, /createPublicPassportResumeHandler/);
  assert.doesNotMatch(publicRoute, /NextResponse\.json\(\{ resume \}/);
  assert.match(ownerRoute, /requireActiveAccessProfile/);
  assert.match(ownerRoute, /getPassportCompetitiveResume\(access\.profile\.username, true\)/);
  assert.match(resumeSource, /buildPublicPassportCompetitiveResume\(source\)/);
  assert.match(resumeSource, /\? \{\s*access: ["']owner["'],\s*\.\.\.source,?\s*\}/);
});
