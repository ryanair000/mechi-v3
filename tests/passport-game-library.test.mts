import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const migration = await readFile(
  new URL('../supabase/migrations/20260810145644_passport_game_library_mvp.sql', import.meta.url),
  'utf8'
);
const manager = await readFile(
  new URL('../src/app/(app)/passport/games/passport-game-library-manager.tsx', import.meta.url),
  'utf8'
);
const publicLibrary = await readFile(
  new URL('../src/app/p/[handle]/games/page.tsx', import.meta.url),
  'utf8'
);
const cardRoute = await readFile(
  new URL('../src/app/api/passport/cards/[username]/route.tsx', import.meta.url),
  'utf8'
);
const cardModel = await readFile(
  new URL('../src/lib/passport-card-model.ts', import.meta.url),
  'utf8'
);
const cardRenderer = await readFile(
  new URL('../src/lib/passport-card-renderer.tsx', import.meta.url),
  'utf8'
);
const inputParser = await readFile(
  new URL('../src/lib/passport-game-input.ts', import.meta.url),
  'utf8'
);

test('Phase 2 game-library tables are RLS-protected and server-only', () => {
  for (const table of ['passport_game_catalog', 'passport_game_entries', 'passport_game_requests']) {
    assert.match(migration, new RegExp(`ALTER TABLE public\\.${table} ENABLE ROW LEVEL SECURITY`, 'i'));
  }
  assert.match(migration, /REVOKE ALL ON TABLE[\s\S]+FROM anon, authenticated/i);
  assert.match(migration, /GRANT ALL ON TABLE[\s\S]+TO service_role/i);
  assert.match(migration, /UNIQUE \(user_id, catalog_game_id, platform\)/i);
  assert.match(migration, /enforce_passport_featured_game_limit/);
  assert.match(migration, />= 5 THEN/);
});

test('Catalogue and entries support story-first gamers and intentional platform copies', () => {
  assert.match(migration, /The Witcher 3: Wild Hunt/);
  assert.match(migration, /Life is Strange/);
  assert.match(migration, /Detroit: Become Human/);
  assert.match(migration, /contains_spoilers boolean NOT NULL DEFAULT false/i);
  assert.match(migration, /play_status IN \('playing', 'completed', 'backlog', 'paused', 'dropped', 'replaying'\)/i);
  assert.match(migration, /platform IN \('unspecified', 'ps', 'xbox', 'nintendo', 'mobile', 'pc'\)/i);
});

test('Owner game library implements five-game onboarding and rich records', () => {
  assert.match(manager, /Five-game start/);
  assert.match(manager, /Start with five games/);
  assert.match(manager, /Rating \(1–10\)/);
  assert.match(manager, /Hours played/);
  assert.match(manager, /Contains spoilers/);
  assert.match(manager, /Screenshot/);
  assert.match(manager, /Friends only/);
});

test('Public library exposes filters while hiding spoiler text by default', () => {
  for (const filter of ['status', 'platform', 'genre', 'year']) {
    assert.match(publicLibrary, new RegExp(`name=\\"${filter}\\"`));
  }
  assert.match(publicLibrary, /Show spoiler-marked review/);
  assert.match(publicLibrary, /library\.access === 'restricted'/);
});

test('Gamer Cards render square, story, and horizontal social dimensions', () => {
  assert.match(cardModel, /square: \{ width: 1080, height: 1080 \}/);
  assert.match(cardModel, /story: \{ width: 1080, height: 1920 \}/);
  assert.match(cardModel, /horizontal: \{ width: 1200, height: 630 \}/);
  assert.match(cardRenderer, /mechi\.club\/@\$\{model\.handle\}/);
  assert.match(cardRoute, /createPassportCardResponse/);
});

test('Game-entry validation enforces rating, review, hours, and ordered dates', () => {
  assert.match(inputParser, /rating < 1 \|\| rating > 10/);
  assert.match(inputParser, /body\.short_review\.trim\(\)\.length > 500/);
  assert.match(inputParser, /hours < 0 \|\| hours > 100000/);
  assert.match(inputParser, /Completion date cannot be before the start date/);
});
