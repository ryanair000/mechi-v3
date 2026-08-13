import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
import test from 'node:test';

const prioritySource = await readFile(
  new URL('../src/lib/player-dashboard-priority.ts', import.meta.url),
  'utf8'
);
const priorityModule = await import(
  `data:text/javascript;base64,${Buffer.from(
    stripTypeScriptTypes(prioritySource, { mode: 'transform' })
  ).toString('base64')}`
);
const {
  buildPlayerDashboardTodayItems,
  choosePlayerDashboardAction,
} = priorityModule;

const match = {
  id: 'match-1',
  opponentName: 'Amani',
  gameLabel: 'eFootball',
};
const tournament = {
  id: 'tournament-1',
  slug: 'mechi-cup',
  title: 'Mechi Cup',
  gameLabel: 'eFootball',
  scheduledAt: '2026-08-01T17:00:00.000Z',
  scheduledLabel: '1 Aug 2026, 8:00 PM EAT',
};
const challenge = {
  id: 'challenge-1',
  challengerName: 'Nia',
  gameLabel: 'Tekken 8',
  expiresAt: '2026-08-01T12:00:00.000Z',
};

test('uses the written player-home priority order', () => {
  const all = {
    activeMatch: match,
    checkIn: tournament,
    incomingChallenge: challenge,
    interruptedRegistration: { ...tournament, paymentStatus: 'pending' },
    resultResponse: { ...match, disputed: false },
    setupBlocker: { label: 'Finish setup', description: 'Add your player ID.' },
    upcomingTournament: tournament,
  };

  assert.equal(choosePlayerDashboardAction(all).kind, 'active_match');
  assert.equal(
    choosePlayerDashboardAction({ ...all, activeMatch: null }).kind,
    'check_in'
  );
  assert.equal(
    choosePlayerDashboardAction({ ...all, activeMatch: null, checkIn: null }).kind,
    'incoming_challenge'
  );
  assert.equal(
    choosePlayerDashboardAction({
      ...all,
      activeMatch: null,
      checkIn: null,
      incomingChallenge: null,
    }).kind,
    'payment'
  );
  assert.equal(
    choosePlayerDashboardAction({
      ...all,
      activeMatch: null,
      checkIn: null,
      incomingChallenge: null,
      interruptedRegistration: null,
    }).kind,
    'result_review'
  );
});

test('falls through from setup to upcoming tournament and discovery', () => {
  assert.equal(
    choosePlayerDashboardAction({
      setupBlocker: { label: 'Finish setup', description: 'Add your player ID.' },
      upcomingTournament: tournament,
    }).kind,
    'profile_setup'
  );
  assert.equal(
    choosePlayerDashboardAction({ upcomingTournament: tournament }).kind,
    'upcoming_tournament'
  );
  const discovery = choosePlayerDashboardAction({});
  assert.equal(discovery.kind, 'discover');
  assert.equal(discovery.secondary_href, '/challenges');
});

test('returns a bounded Today list with durable action links', () => {
  const items = buildPlayerDashboardTodayItems({
    activeMatch: match,
    checkIn: tournament,
    incomingChallenge: challenge,
    interruptedRegistration: { ...tournament, paymentStatus: 'failed' },
    resultResponse: { ...match, disputed: true },
    setupBlocker: null,
    upcomingTournament: tournament,
    teamInvitation: {
      id: 'invite-1',
      teamName: 'Nairobi Strikers',
      inviterName: 'Kai',
    },
  });

  assert.equal(items.length, 4);
  assert.deepEqual(
    items.map((item) => item.kind),
    ['active_match', 'check_in', 'incoming_challenge', 'payment']
  );
  assert.ok(items.every((item) => item.href.startsWith('/')));
});
