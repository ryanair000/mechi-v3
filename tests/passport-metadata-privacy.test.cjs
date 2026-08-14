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
  jsx: true,
});

const metadataModulePromise = jiti.import('../src/lib/passport-metadata.ts');
const pngModulePromise = jiti.import('../src/lib/passport-card-png.ts');
const rendererModulePromise = jiti.import('../src/lib/passport-card-renderer.tsx');
const privateRouteModulePromise = jiti.import('../src/app/api/og/passport-private/route.ts');

const fields = {
  bio: 'public',
  gamer_since: 'public',
  archetypes: 'public',
  current_status: 'public',
  location: 'private',
  platforms: 'private',
  games: 'public',
  game_ids: 'private',
  competitive: 'private',
  events: 'private',
  achievements: 'private',
  teams: 'private',
  social: 'private',
};

function passport(overrides = {}) {
  return {
    access: 'public',
    identity: {
      user_id: 'user-1',
      username: 'safeplayer',
      public_handle: 'safeplayer',
      publication_status: 'published',
      published_at: '2026-08-14T00:00:00.000Z',
      publication_consent_version: '2026-08-13',
      publication_consent_at: '2026-08-14T00:00:00.000Z',
      display_name: 'Safe Player',
      default_visibility: 'public',
      field_visibility: fields,
      is_discoverable: true,
      updated_at: '2026-08-14T00:00:00.000Z',
    },
    summary: { total_matches: 900, events_attended: 40 },
    library: { access: 'public', entries: [], stats: { total: 3, completed: 2 } },
    events: [],
    teams: [],
    verifications: [],
    ...overrides,
  };
}

function firstOpenGraphImage(metadata) {
  const image = metadata.openGraph.images[0];
  return typeof image === 'string' ? image : image.url;
}

test('public metadata uses the privacy-resolved V5 Gamer Card and omits hidden legacy statistics', async () => {
  const { buildPassportMetadata } = await metadataModulePromise;
  const metadata = buildPassportMetadata(passport());
  const image = String(firstOpenGraphImage(metadata));

  assert.match(image, /\/api\/passport\/cards\/safeplayer\?format=horizontal&v=[a-f0-9]{12}$/);
  assert.doesNotMatch(image, /\/api\/og\/profile/);
  assert.equal(metadata.robots.index, true);
  assert.equal(metadata.robots.follow, true);
  assert.doesNotMatch(metadata.description, /900|40|matches|events/i);
});

test('restricted metadata is generic, non-indexable, non-cacheable, and identity-free outside the canonical URL', async () => {
  const { buildPassportMetadata } = await metadataModulePromise;
  const metadata = buildPassportMetadata(passport({ access: 'restricted' }));

  assert.equal(metadata.title, 'Private Gamer Passport | PlayMechi');
  assert.equal(metadata.description, 'This PlayMechi Gamer Passport is private.');
  assert.equal(metadata.robots.index, false);
  assert.equal(metadata.robots.follow, false);
  assert.equal(metadata.robots.noarchive, true);
  assert.equal(metadata.robots.nocache, true);
  assert.equal(metadata.robots.noimageindex, true);
  assert.match(String(firstOpenGraphImage(metadata)), /\/api\/og\/passport-private$/);
  assert.doesNotMatch(JSON.stringify(metadata.openGraph.images), /safeplayer|Safe Player|900|40/);
  assert.doesNotMatch(JSON.stringify(metadata.twitter), /safeplayer|Safe Player|900|40/);
});

test('missing and link-only Passports fail closed for search indexing', async () => {
  const { buildPassportMetadata } = await metadataModulePromise;
  const missing = buildPassportMetadata(null);
  const linkOnly = buildPassportMetadata(passport({
    identity: { ...passport().identity, is_discoverable: false },
  }));

  assert.equal(missing.robots.index, false);
  assert.equal(missing.robots.noarchive, true);
  assert.equal(missing.openGraph, undefined);
  assert.equal(linkOnly.robots.index, false);
  assert.equal(linkOnly.robots.noimageindex, true);
});

test('visibility changes alter the card cache key without exposing the raw privacy timestamp', async () => {
  const { buildPassportMetadata } = await metadataModulePromise;
  const before = buildPassportMetadata(passport());
  const after = buildPassportMetadata(passport({
    identity: {
      ...passport().identity,
      field_visibility: { ...fields, games: 'private' },
      updated_at: '2026-08-14T00:01:00.000Z',
    },
  }));
  const beforeImage = String(firstOpenGraphImage(before));
  const afterImage = String(firstOpenGraphImage(after));

  assert.notEqual(beforeImage, afterImage);
  assert.doesNotMatch(beforeImage, /2026|%3A/);
  assert.doesNotMatch(afterImage, /2026|%3A/);
});

test('generic private Passport image is a real 1200x630 PNG', async () => {
  const { readPassportCardPngDimensions } = await pngModulePromise;
  const { renderPrivatePassportCardPng } = await rendererModulePromise;
  const png = await renderPrivatePassportCardPng();

  assert.ok(png.byteLength > 10_000);
  assert.deepEqual(readPassportCardPngDimensions(png), { width: 1200, height: 630 });
});

test('generic private OG endpoint returns a cacheable, MIME-safe PNG response', async () => {
  const { readPassportCardPngDimensions } = await pngModulePromise;
  const { GET } = await privateRouteModulePromise;
  const response = await GET();
  const png = new Uint8Array(await response.arrayBuffer());

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'image/png');
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.match(response.headers.get('cache-control'), /immutable/);
  assert.deepEqual(readPassportCardPngDimensions(png), { width: 1200, height: 630 });
});

test('legacy OG compatibility route has no broad profile query and delegates to the V5 privacy boundary', async () => {
  const route = await readFile(path.join(root, 'src/app/api/og/profile/route.ts'), 'utf8');
  const page = await readFile(path.join(root, 'src/app/p/[handle]/page.tsx'), 'utf8');
  const share = await readFile(path.join(root, 'src/lib/share.ts'), 'utf8');

  assert.doesNotMatch(route, /\.from\(['"]profiles['"]\)|select\(['"]\*['"]\)/);
  assert.match(route, /createPassportCardResponse/);
  assert.match(route, /Deprecation/);
  assert.doesNotMatch(page, /\/api\/og\/profile/);
  assert.doesNotMatch(share, /\/api\/og\/profile/);
});
