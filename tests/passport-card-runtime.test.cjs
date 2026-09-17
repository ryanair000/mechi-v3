/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
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

const modelModulePromise = jiti.import('../src/lib/passport-card-model.ts');
const pngModulePromise = jiti.import('../src/lib/passport-card-png.ts');
const rendererModulePromise = jiti.import('../src/lib/passport-card-renderer.tsx');
const responseModulePromise = jiti.import('../src/lib/passport-card-response.ts');

function cardSource(overrides = {}) {
  return {
    handle: 'player-one',
    displayName: 'Player One',
    archetypes: ['story_explorer', 'completionist'],
    accent: '#32E0C4',
    games: [
      { id: 'game-1', title: 'Life is Strange', status: 'Completed', rating: 9.4, featured: true, favorite: true },
      { id: 'game-2', title: 'The Witcher 3', status: 'Playing', rating: 8.8, featured: false, favorite: true },
    ],
    gamesCount: 12,
    completedCount: 7,
    matchesCount: 24,
    ...overrides,
  };
}

function publicPassport(overrides = {}) {
  return {
    access: 'public',
    identity: {
      user_id: 'user-1',
      username: 'player-one',
      display_name: 'Player One',
      archetypes: ['story_explorer'],
      card_accent: '#32E0C4',
    },
    library: {
      entries: [
        {
          id: 'entry-1',
          game: { title: 'Life is Strange' },
          play_status: 'completed',
          rating: 9,
          is_featured: true,
          is_favorite: true,
        },
      ],
      stats: { total: 1, completed: 1 },
    },
    summary: { total_matches: 3 },
    events: [],
    teams: [],
    verifications: [],
    ...overrides,
  };
}

async function assertPngResponse(response, expectedStatus, expectedFormat) {
  const { PASSPORT_CARD_SIZES } = await modelModulePromise;
  const { readPassportCardPngDimensions } = await pngModulePromise;
  assert.equal(response.status, expectedStatus);
  assert.equal(response.headers.get('content-type'), 'image/png');
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  const bytes = new Uint8Array(await response.arrayBuffer());
  assert.ok(bytes.byteLength > 100, 'PNG response should not be empty');
  assert.deepEqual(readPassportCardPngDimensions(bytes), PASSPORT_CARD_SIZES[expectedFormat]);
}

test('card model rejects unsafe cosmetic tokens and bounds user-controlled text and metrics', async () => {
  const { buildPassportCardModel } = await modelModulePromise;
  const model = buildPassportCardModel(cardSource({
    handle: `PLAYER-${'x'.repeat(50)}\u0000`,
    displayName: `${'Long name '.repeat(20)}\u0007`,
    accent: 'url(https://invalid.example)',
    gamesCount: Number.POSITIVE_INFINITY,
    completedCount: -30,
    matchesCount: 1_000_000_000,
  }), {
    accent: 'rgb(1, 2, 3)',
    background: 'linear-gradient(red, blue)',
    surface: '#abcdef',
    pattern: 'url-injection',
    cardStyleLabel: '\u0000Signal\u0007 Card',
  }, 'horizontal');

  assert.equal(model.accent, '#32E0C4');
  assert.equal(model.background, '#071018');
  assert.equal(model.surface, '#ABCDEF');
  assert.equal(model.pattern, 'core');
  assert.equal(model.handle, `player-${'x'.repeat(13)}`);
  assert.equal(model.displayName.length, 40);
  assert.deepEqual(model.metrics, { games: 0, completed: 0, matches: 999_999 });
  assert.equal(model.styleLabel, 'Signal Card');
});

test('real ImageResponse rendering produces valid PNG bytes at every public card dimension', async () => {
  const { PASSPORT_CARD_FORMATS, PASSPORT_CARD_SIZES, buildPassportCardModel } = await modelModulePromise;
  const { readPassportCardPngDimensions } = await pngModulePromise;
  const { renderPassportCardPng } = await rendererModulePromise;

  for (const format of PASSPORT_CARD_FORMATS) {
    const model = buildPassportCardModel(cardSource({
      displayName: 'Nia \ud83c\udfae Mwangangi',
      games: [],
      gamesCount: 0,
      completedCount: 0,
      matchesCount: 0,
    }), { pattern: format === 'square' ? 'signal' : 'aurora' }, format);
    const bytes = await renderPassportCardPng(model);
    assert.ok(bytes.byteLength > 10_000, `${format} should contain a rendered card, not a tiny placeholder`);
    assert.deepEqual(readPassportCardPngDimensions(bytes), PASSPORT_CARD_SIZES[format]);
  }
});

test('card endpoint response eagerly returns rendered PNGs and safe presentation defaults', async () => {
  const { createPassportCardResponse } = await responseModulePromise;
  const response = await createPassportCardResponse(
    new Request('https://mechi.club/api/passport/cards/player-one?format=square'),
    'PLAYER-ONE',
    {
      loadPassport: async (handle) => {
        assert.equal(handle, 'player-one');
        return publicPassport();
      },
      loadPresentation: async () => ({
        accent: 'var(--malicious)',
        background: 'not-a-color',
        surface: '#102438',
        pattern: 'not-a-pattern',
      }),
    }
  );

  await assertPngResponse(response, 200, 'square');
  assert.equal(response.headers.get('x-passport-card-state'), 'rendered');
  assert.match(response.headers.get('cache-control'), /^public,/);
});

test('missing and restricted passports return non-cacheable PNG responses without rendering private data', async () => {
  const { createPassportCardResponse } = await responseModulePromise;
  let presentationReads = 0;
  const missing = await createPassportCardResponse(
    new Request('https://mechi.club/api/passport/cards/deleted?format=story'),
    'deleted',
    { loadPassport: async () => null, loadPresentation: async () => { presentationReads += 1; return {}; } }
  );
  await assertPngResponse(missing, 404, 'story');
  assert.equal(missing.headers.get('x-passport-card-state'), 'not_found');

  const restricted = await createPassportCardResponse(
    new Request('https://mechi.club/api/passport/cards/private?format=horizontal'),
    'private',
    {
      loadPassport: async () => publicPassport({ access: 'restricted' }),
      loadPresentation: async () => { presentationReads += 1; return {}; },
    }
  );
  await assertPngResponse(restricted, 403, 'horizontal');
  assert.equal(restricted.headers.get('x-passport-card-state'), 'restricted');
  assert.equal(presentationReads, 0);
  assert.equal(restricted.headers.get('cache-control'), 'private, no-store');
});

test('a Satori failure is contained as a valid, exact-size PNG instead of a route 500', async () => {
  const { createPassportCardResponse } = await responseModulePromise;
  const originalConsoleError = console.error;
  console.error = () => {};
  try {
    const response = await createPassportCardResponse(
      new Request('https://mechi.club/api/passport/cards/player-one?format=story'),
      'player-one',
      {
        loadPassport: async () => publicPassport(),
        loadPresentation: async () => ({}),
        renderCard: async () => { throw new Error('synthetic Satori failure'); },
      }
    );
    await assertPngResponse(response, 200, 'story');
    assert.equal(response.headers.get('x-passport-card-state'), 'render_fallback');
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
  } finally {
    console.error = originalConsoleError;
  }
});
