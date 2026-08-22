import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
import test from 'node:test';

const source = await readFile(
  new URL('../src/lib/passport-analytics-contract.ts', import.meta.url),
  'utf8'
);
const contract = await import(
  `data:text/javascript;base64,${Buffer.from(
    stripTypeScriptTypes(source, { mode: 'transform' })
  ).toString('base64')}`
);
const {
  PASSPORT_PRODUCT_EVENTS,
  bucketCount,
  bucketPercentage,
  sanitizePassportAnalyticsProperties,
} = contract;

test('Passport analytics taxonomy contains every activation and sharing event', () => {
  assert.deepEqual(PASSPORT_PRODUCT_EVENTS, [
    'passport_created',
    'passport_publication_changed',
    'passport_onboarding_completed',
    'passport_game_added',
    'passport_five_games_reached',
    'passport_current_game_added',
    'passport_record_claimed',
    'passport_comparison_completed',
    'passport_card_generated',
    'passport_card_shared',
    'passport_public_viewed',
    'passport_cv_viewed',
    'passport_cv_downloaded',
    'passport_friend_action',
    'passport_replay_generated',
    'passport_replay_shared',
  ]);
});

test('Passport analytics strips direct and free-form identifiers at runtime', () => {
  assert.deepEqual(sanitizePassportAnalyticsProperties('passport_card_shared', {
    format: 'story',
    channel: 'whatsapp',
    username: 'private-handle',
    phone: '+254700000000',
    target_user_id: '00000000-0000-0000-0000-000000000000',
    url: 'https://example.test/private',
    nested: { secret: true },
  }), {
    format: 'story',
    channel: 'whatsapp',
  });
});

test('Passport analytics buckets high-cardinality measurements', () => {
  assert.equal(bucketCount(0), '0');
  assert.equal(bucketCount(7), '5-9');
  assert.equal(bucketCount(50), '10+');
  assert.equal(bucketPercentage(null), 'discovery');
  assert.equal(bucketPercentage(74), '50-74');
  assert.equal(bucketPercentage(100), '75-100');
});
