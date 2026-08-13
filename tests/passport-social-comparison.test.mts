import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const migration = await readFile(new URL('../supabase/migrations/20260810153013_passport_social_comparison_rivalries.sql', import.meta.url), 'utf8');
const social = await readFile(new URL('../src/lib/passport-social.ts', import.meta.url), 'utf8');
const comparison = await readFile(new URL('../src/lib/passport-comparison.ts', import.meta.url), 'utf8');
const challengeCreate = await readFile(new URL('../src/app/api/challenges/route.ts', import.meta.url), 'utf8');
const challengeAccept = await readFile(new URL('../src/app/api/challenges/[id]/accept/route.ts', import.meta.url), 'utf8');
const card = await readFile(new URL('../src/app/api/passport/comparison-cards/[left]/[right]/route.tsx', import.meta.url), 'utf8');

test('Phase 3 social tables are server-only and RLS protected', () => {
  for (const table of ['passport_friendships', 'passport_follows', 'passport_blocks', 'passport_game_recommendations', 'passport_comparison_invitations', 'passport_comparison_events']) {
    assert.match(migration, new RegExp(`ALTER TABLE public\\.${table} ENABLE ROW LEVEL SECURITY`, 'i'));
  }
  assert.match(migration, /REVOKE ALL ON TABLE[\s\S]+FROM anon, authenticated/i);
  assert.match(migration, /GRANT ALL ON TABLE[\s\S]+TO service_role/i);
  assert.match(migration, /passport_friendships_canonical_pair/);
  assert.match(migration, /WHERE status IN \('sent', 'seen'\)/);
});

test('block state gates discovery, comparisons, recommendations, and challenges', () => {
  assert.match(social, /hasPassportBlockBetween/);
  assert.match(social, /discoverPassportProfiles[\s\S]+passport_blocks/);
  assert.match(social, /recommendPassportGame[\s\S]+hasPassportBlockBetween/);
  assert.match(comparison, /hasPassportBlockBetween\(leftProfile\.id, rightProfile\.id\)/);
  assert.match(challengeCreate, /hasPassportBlockBetween\(authUser\.id, opponentId\)/);
  assert.match(challengeAccept, /hasPassportBlockBetween\(challenge\.challenger_id, challenge\.opponent_id\)/);
});

test('Taste Match uses visible libraries and treats zero overlap as discovery', () => {
  assert.match(comparison, /getPassportData\(String\(leftProfile\.username\), \{ friendView \}\)/);
  assert.match(comparison, /score: null/);
  assert.match(comparison, /No visible games overlap yet/);
  for (const factor of ['shared_games', 'favorites', 'play_style', 'platforms', 'genres']) assert.match(comparison, new RegExp(`key: '${factor}'`));
});

test('verified rivalry reads completed authoritative matches only', () => {
  assert.match(comparison, /from\('matches'\)[\s\S]+\.eq\('status', 'completed'\)/);
  assert.match(comparison, /verified: true/);
  assert.doesNotMatch(comparison, /player1_reported_winner/);
});

test('comparison cards identify both players and link back to comparison', () => {
  assert.match(card, /\['left', 'versus', 'right'\]/);
  assert.match(card, /comparison\[side\]/);
  assert.match(card, /mechi\.club\/compare\//);
  assert.match(card, /width: 1200, height: 630/);
});

test('comparison invitations retain source attribution and conversion fields', () => {
  assert.match(migration, /attribution_source text NOT NULL DEFAULT 'passport_compare'/);
  assert.match(migration, /campaign text/);
  assert.match(migration, /visit_count integer/);
  assert.match(migration, /claimed_by uuid/);
});
