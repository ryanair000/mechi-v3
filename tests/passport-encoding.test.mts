import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const sources = [
  '../src/app/(app)/t/[slug]/manage/tournament-control-client.tsx',
  '../docs/playmechi-launch-pubgm-results.md',
  '../docs/playmechi-launch-codm-results.md',
  '../docs/playmechi-launch-efootball-results.md',
  '../docs/playmechi-launch-tournament-results.md',
] as const;

test('user-facing tournament and result sources do not contain common UTF-8 mojibake', async () => {
  for (const source of sources) {
    const content = await readFile(new URL(source, import.meta.url), 'utf8');
    assert.doesNotMatch(
      content,
      /\u00c2|\u00c3|\u00e2\u20ac|\u00f0\u0178|\ufffd/,
      `${source} contains a common double-encoding marker`,
    );
  }
});
