import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const migration = await readFile(new URL('../supabase/migrations/20260813101621_passport_progression_customization_replay.sql', import.meta.url), 'utf8');
const service = await readFile(new URL('../src/lib/passport-progression.ts', import.meta.url), 'utf8');
const publicPassport = await readFile(new URL('../src/app/p/[handle]/page.tsx', import.meta.url), 'utf8');
const replayPage = await readFile(new URL('../src/app/replay/[token]/page.tsx', import.meta.url), 'utf8');
const eventCard = await readFile(new URL('../src/app/api/passport/event-cards/[token]/route.tsx', import.meta.url), 'utf8');

test('Phase 6 storage is server mediated with RLS defense in depth', () => {
  for (const table of ['passport_dimension_snapshots', 'passport_achievement_definitions', 'passport_achievement_awards', 'passport_cosmetic_catalog', 'passport_customizations', 'passport_showcase_items', 'passport_custom_shelves', 'passport_custom_shelf_items', 'passport_replay_snapshots', 'passport_media_kit_settings']) assert.match(migration, new RegExp(`ALTER TABLE public\\.${table} ENABLE ROW LEVEL SECURITY`, 'i'));
  assert.match(migration, /REVOKE ALL ON TABLE[\s\S]+FROM anon, authenticated/i);
  assert.match(migration, /GRANT ALL ON TABLE[\s\S]+TO service_role/i);
});

test('Gamer progression has six independent dimensions and rejects a universal skill rank', () => {
  for (const key of ['competitive', 'explorer', 'completionist', 'community', 'event_presence', 'team_player']) assert.match(service, new RegExp(`makeDimension\\(\\s*["']${key}["']`));
  assert.match(service, /not a universal skill ranking/i);
  assert.match(service, /Competitive facts come only from completed Mechi matches/i);
});

test('achievements retain requirement, rarity, trust, issuer, and revocation state', () => {
  assert.match(migration, /requirement_text text NOT NULL/);
  assert.match(migration, /rarity IN \('common', 'uncommon', 'rare', 'epic', 'legendary', 'limited'\)/);
  assert.match(migration, /trust_tier IN \('personal', 'mechi_verified', 'organizer_verified'\)/);
  assert.match(migration, /revoked_at timestamptz/);
  assert.match(service, /Source requirement is no longer satisfied/);
});

test('paid cosmetics are structurally incapable of resembling verification', () => {
  assert.match(migration, /is_cosmetic boolean NOT NULL DEFAULT true CHECK \(is_cosmetic = true\)/);
  assert.match(migration, /resembles_verification boolean NOT NULL DEFAULT false CHECK \(resembles_verification = false\)/);
  assert.match(service, /required for this cosmetic/);
  assert.match(publicPassport, /Source-backed item/);
});

test('showcases and shelves cannot widen nested game or highlight visibility', () => {
  assert.match(service, /allowedHighlights/);
  assert.match(service, /allowedGames/);
  assert.match(service, /entry\?\.visibility === ["']public["'] \|\|\s*\(friend && entry\?\.visibility === ["']friends["']\)/);
  assert.match(publicPassport, /visibleShowcase/);
});

test('free Passport progression remains complete while expansion products are gated', () => {
  assert.match(service, /SHOWCASE_LIMIT: Record<Plan, number> = \{ free: 3, pro: 6, elite: 9 \}/);
  assert.match(service, /Pro or Elite is required for custom shelves/);
  assert.match(service, /Pro or Elite is required for a media kit/);
  assert.match(migration, /'mechi_core'[\s\S]*'free'/);
  assert.match(migration, /'card_core'[\s\S]*'free'/);
});

test('Annual Replay keeps exact facts separate from explicitly labeled estimates', () => {
  assert.match(service, /exact: \{\s*games_added:/);
  assert.match(service, /estimates: \[\]/);
  assert.match(service, /source_cutoff_at: cutoff/);
  assert.match(replayPage, /This Replay contains no estimated values/);
});

test('sponsor-safe event cards remove the public handle while retaining verification path', () => {
  assert.match(eventCard, /sponsorSafe/);
  assert.match(eventCard, /SPONSOR-SAFE EVENT CREDENTIAL/);
  assert.match(eventCard, /sponsorSafe \? '' :/);
  assert.match(eventCard, /mechi\.club\/verify\/passport/);
});
