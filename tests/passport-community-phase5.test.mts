import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const migration = await readFile(new URL('../supabase/migrations/20260812152249_passport_activity_teams_community.sql', import.meta.url), 'utf8');
const community = await readFile(new URL('../src/lib/passport-community.ts', import.meta.url), 'utf8');
const feed = await readFile(new URL('../src/components/PassportActivityFeed.tsx', import.meta.url), 'utf8');
const teamPassport = await readFile(new URL('../src/components/TeamPassportView.tsx', import.meta.url), 'utf8');

test('Phase 5 storage is server mediated with RLS defense in depth', () => {
  for (const table of ['passport_activity_objects', 'passport_activity_reactions', 'passport_activity_reports', 'passport_highlights', 'passport_gaming_circles', 'passport_gaming_circle_members', 'team_passport_achievements']) assert.match(migration, new RegExp(`ALTER TABLE public\\.${table} ENABLE ROW LEVEL SECURITY`, 'i'));
  assert.match(migration, /REVOKE ALL ON TABLE[\s\S]+FROM anon, authenticated/i);
  assert.match(migration, /GRANT ALL ON TABLE[\s\S]+TO service_role/i);
});

test('activity projection inherits source and Passport field visibility', () => {
  assert.match(community, /mostRestrictiveVisibility/);
  assert.match(community, /audienceFor\(["']games["']/);
  assert.match(community, /audienceFor\(["']competitive["']/);
  assert.match(community, /audienceFor\(["']events["']/);
  assert.match(community, /audienceFor\(["']achievements["']/);
  assert.match(community, /audienceFor\(\s*["']teams["']/);
});

test('activity projection retracts stale sources and deduplicates current sources', () => {
  assert.match(community, /update\(\{\s*retracted_at: new Date\(\)\.toISOString\(\)\s*\}\)/);
  assert.match(community, /onConflict: ["']actor_id,activity_type,source_type,source_id["']/);
  assert.match(migration, /passport_activity_source_unique UNIQUE \(actor_id, activity_type, source_type, source_id\)/);
});

test('feed excludes private journals and sensitive operational actions by construction', () => {
  assert.match(migration, /'game_completed', 'achievement_unlocked', 'match_completed', 'event_credential'/);
  assert.doesNotMatch(migration, /activity_type IN \([\s\S]*'payout'/);
  assert.doesNotMatch(migration, /activity_type IN \([\s\S]*'dispute'/);
  assert.doesNotMatch(community, /review_text|journal_text/);
  assert.match(feed, /no private journals, payouts, disputes, or moderation actions/i);
});

test('reaction attempts are serialized and rate limited before mutation', () => {
  assert.match(migration, /pg_advisory_xact_lock/);
  assert.match(migration, /passport_activity_reaction_events/);
  assert.match(migration, /v_recent_count >= 20/);
  assert.match(migration, /REACTION_RATE_LIMIT/);
});

test('reports cannot target hidden, blocked, private, or self-authored activity', () => {
  assert.match(community, /activity\.actor_id === reporterId/);
  assert.match(community, /hasPassportBlockBetween\(reporterId/);
  assert.match(community, /activity\.audience === ["']private["']/);
});

test('Gaming Circles enforce 3-8 distinct accepted friends transactionally', () => {
  assert.match(migration, /v_count NOT BETWEEN 3 AND 8/);
  assert.match(migration, /friendship\.status = 'accepted'/);
  assert.match(migration, /FOR UPDATE/);
  assert.match(community, /visibleCompetitiveIds/);
});

test('team Passport preserves current and former roster history', () => {
  assert.match(teamPassport, /member\.status === 'active'/);
  assert.match(teamPassport, /member\.status !== 'active'/);
  assert.match(teamPassport, /Former members/);
});

test('team achievements have verifiable and revocable audit state', () => {
  assert.match(migration, /verification_token uuid NOT NULL DEFAULT gen_random_uuid\(\) UNIQUE/);
  assert.match(migration, /state text NOT NULL DEFAULT 'active' CHECK \(state IN \('active', 'revoked'\)\)/);
  assert.match(community, /getTeamPassportAchievementByToken/);
  assert.match(teamPassport, /\/verify\/team\//);
});

test('notification controls cover reactions and circle membership', () => {
  assert.match(migration, /notify_reactions boolean NOT NULL DEFAULT true/);
  assert.match(migration, /notify_circle_updates boolean NOT NULL DEFAULT true/);
  assert.match(community, /if \(preferences\.notify_reactions\)/);
  assert.match(community, /notify_circle_updates/);
});
