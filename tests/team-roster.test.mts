import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
import test from 'node:test';

const assessmentSource = await readFile(
  new URL('../src/lib/team-roster-assessment.ts', import.meta.url),
  'utf8'
);
const assessmentModule = await import(
  `data:text/javascript;base64,${Buffer.from(
    stripTypeScriptTypes(assessmentSource, { mode: 'transform' })
  ).toString('base64')}`
);
const { assessTeamRoster } = assessmentModule;

function player(
  userId: string,
  rosterRole: 'starter' | 'substitute',
  overrides: Record<string, unknown> = {}
) {
  return {
    user_id: userId,
    username: `Player ${userId}`,
    roster_role: rosterRole,
    eligible: true,
    blocker: null,
    selected: true,
    ...overrides,
  };
}

test('accepts the exact starter count with at most two substitutes', () => {
  const result = assessTeamRoster(
    [
      player('1', 'starter'),
      player('2', 'starter'),
      player('3', 'starter'),
      player('4', 'substitute'),
      player('5', 'substitute'),
    ],
    3
  );

  assert.equal(result.ready, true);
  assert.equal(result.starter_count, 3);
  assert.equal(result.substitute_count, 2);
});
test('reports missing setup and the wrong starter count', () => {
  const result = assessTeamRoster(
    [
      player('1', 'starter'),
      player('2', 'starter', {
        eligible: false,
        blocker: 'Add the player game ID.',
      }),
    ],
    3
  );

  assert.equal(result.ready, false);
  assert.match(result.blockers.join(' '), /exactly 3 starters/i);
  assert.match(result.blockers.join(' '), /game ID/i);
});

test('blocks duplicate players and more than two substitutes', () => {
  const result = assessTeamRoster(
    [
      player('1', 'starter'),
      player('2', 'starter'),
      player('1', 'substitute'),
      player('3', 'substitute'),
      player('4', 'substitute'),
    ],
    2
  );

  assert.equal(result.ready, false);
  assert.match(result.blockers.join(' '), /only once/i);
  assert.match(result.blockers.join(' '), /no more than 2 substitutes/i);
});

test('Phase 2 migration protects lifecycle and immutable roster contracts', async () => {
  const sql = await readFile(
    new URL(
      '../supabase/migrations/20260730174238_team_lifecycle_and_tournament_registration.sql',
      import.meta.url
    ),
    'utf8'
  );

  for (const functionName of [
    'create_player_team',
    'respond_team_invitation',
    'set_team_member_role',
    'transfer_team_ownership',
    'leave_player_team',
    'replace_team_roster',
    'claim_team_tournament_slot',
    'check_in_team_tournament',
  ]) {
    assert.match(sql, new RegExp(`FUNCTION public\\.${functionName}`, 'i'));
  }
  assert.match(sql, /ROSTER_SNAPSHOT_IMMUTABLE/);
  assert.match(sql, /PLAYER_ALREADY_REGISTERED/);
  assert.match(sql, /OWNER_TRANSFER_REQUIRED/);
  assert.match(sql, /REVOKE ALL ON FUNCTION[\s\S]+authenticated/i);
  assert.match(sql, /GRANT EXECUTE ON FUNCTION[\s\S]+service_role/i);
});
