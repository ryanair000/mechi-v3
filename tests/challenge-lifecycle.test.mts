import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
import test from 'node:test';

const lifecycleSource = await readFile(
  new URL('../src/lib/challenge-lifecycle.ts', import.meta.url),
  'utf8'
);
const lifecycleModule = await import(
  `data:text/javascript;base64,${Buffer.from(
    stripTypeScriptTypes(lifecycleSource, { mode: 'transform' })
  ).toString('base64')}`
);
const {
  challengeItemHref,
  challengeOperationError,
  getChallengeLifecyclePresentation,
} = lifecycleModule;

test('pending incoming and sent invites explain who owns the next step', () => {
  const challenge = { id: 'invite-1', status: 'pending', match_id: null };
  const incoming = getChallengeLifecyclePresentation(challenge, 'incoming');
  const sent = getChallengeLifecyclePresentation(challenge, 'sent');

  assert.equal(incoming.label, 'Needs your answer');
  assert.match(incoming.description, /Accept/i);
  assert.equal(sent.label, 'Waiting for player');
  assert.match(sent.description, /cancel/i);
  assert.equal(challengeItemHref(challenge.id), '/challenges#challenge-invite-1');
});

test('accepted, declined, cancelled, and expired states have explicit recovery copy', () => {
  const accepted = getChallengeLifecyclePresentation(
    { id: 'invite-1', status: 'accepted', match_id: 'match-1' },
    'incoming'
  );
  const declined = getChallengeLifecyclePresentation(
    { id: 'invite-2', status: 'declined', match_id: null },
    'sent'
  );
  const cancelled = getChallengeLifecyclePresentation(
    { id: 'invite-3', status: 'cancelled', match_id: null },
    'incoming'
  );
  const expired = getChallengeLifecyclePresentation(
    { id: 'invite-4', status: 'expired', match_id: null },
    'sent'
  );

  assert.equal(accepted.actionHref, '/match/match-1');
  assert.match(declined.description, /another opponent/i);
  assert.match(cancelled.description, /cancelled/i);
  assert.match(expired.description, /new invite/i);
});

test('database conflicts map to player-facing recovery messages', () => {
  assert.deepEqual(challengeOperationError('CHALLENGE_QUEUE_CONFLICT'), {
    status: 409,
    error: 'Leave the ranked queue before accepting this 1v1 invite.',
  });
  assert.match(
    challengeOperationError('CHALLENGE_MATCH_CONFLICT').error,
    /already has a live match/i
  );
  assert.equal(challengeOperationError('CHALLENGE_FORBIDDEN').status, 403);
  assert.equal(challengeOperationError('CHALLENGE_NOT_FOUND').status, 404);
});

test('Phase 3 migration serializes acceptance and prevents duplicate pending pairs', async () => {
  const sql = await readFile(
    new URL(
      '../supabase/migrations/20260730190954_challenge_acceptance_idempotency.sql',
      import.meta.url
    ),
    'utf8'
  );

  assert.match(sql, /UNIQUE INDEX[\s\S]+one_pending_pair/i);
  assert.match(sql, /WHERE status = 'pending'/i);
  assert.match(sql, /FUNCTION public\.accept_match_challenge/i);
  assert.match(sql, /FROM public\.match_challenges[\s\S]+FOR UPDATE/i);
  assert.match(sql, /FROM public\.profiles[\s\S]+ORDER BY profile\.id[\s\S]+FOR UPDATE/i);
  assert.match(sql, /status = 'accepted'[\s\S]+match_id IS NOT NULL/i);
  assert.match(sql, /RETURN QUERY[\s\S]+true/i);
  assert.match(sql, /INSERT INTO public\.matches/i);
  assert.match(sql, /CHALLENGE_MATCH_CONFLICT/i);
  assert.match(sql, /REVOKE ALL ON FUNCTION[\s\S]+authenticated/i);
  assert.match(sql, /GRANT EXECUTE ON FUNCTION[\s\S]+service_role/i);
});

test('challenge APIs expose history, conditional transitions, and exact match recovery', async () => {
  const [listRoute, acceptRoute, declineRoute, cancelRoute] = await Promise.all([
    readFile(new URL('../src/app/api/challenges/route.ts', import.meta.url), 'utf8'),
    readFile(
      new URL('../src/app/api/challenges/[id]/accept/route.ts', import.meta.url),
      'utf8'
    ),
    readFile(
      new URL('../src/app/api/challenges/[id]/decline/route.ts', import.meta.url),
      'utf8'
    ),
    readFile(
      new URL('../src/app/api/challenges/[id]/cancel/route.ts', import.meta.url),
      'utf8'
    ),
  ]);

  assert.match(listRoute, /history:/);
  assert.match(listRoute, /insertError\?\.code === '23505'/);
  assert.match(acceptRoute, /\.rpc\(\s*'accept_match_challenge'/);
  assert.match(acceptRoute, /replayed: true/);
  assert.match(acceptRoute, /match_href: `\/match\/\$\{challenge\.match_id\}`/);
  assert.match(declineRoute, /\.eq\('status', 'pending'\)/);
  assert.match(cancelRoute, /\.eq\('status', 'pending'\)/);
  assert.match(declineRoute, /next_action:/);
  assert.match(cancelRoute, /next_action:/);
});
