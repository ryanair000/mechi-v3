import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const sitemap = await readFile(new URL('../src/app/sitemap.ts', import.meta.url), 'utf8');
const robots = await readFile(new URL('../src/app/robots.ts', import.meta.url), 'utf8');

test('Passport sitemap is live and admits only public discoverable adult-safe handles', () => {
  assert.match(sitemap, /dynamic = 'force-dynamic'/);
  assert.match(sitemap, /publication_status', 'published'/);
  assert.match(sitemap, /is_discoverable', true/);
  assert.match(sitemap, /default_visibility', 'public'/);
  assert.match(sitemap, /age_policy_status === 'minor'/);
  assert.match(sitemap, /\^\[a-z0-9\]/);
  assert.match(sitemap, /lastModified: String\(row\.updated_at\)/);
  assert.doesNotMatch(sitemap, /const now = new Date/);
});

test('robots allows canonical Passport routes while private application routes remain blocked', () => {
  assert.match(robots, /'\/p\/'/);
  assert.match(robots, /'\/passport'/);
  assert.match(robots, /'\/api'/);
});
