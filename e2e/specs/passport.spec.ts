import path from 'node:path';
import type { Page } from '@playwright/test';
import { test, expect } from '../fixtures';
import { createE2ESupabaseClient } from '../helpers/seed';

async function expectNoHighImpactAxeViolations(page: Page, context: string) {
  await page.addScriptTag({ path: path.join(process.cwd(), 'node_modules', 'axe-core', 'axe.min.js') });
  const violations = await page.evaluate(async () => {
    const axe = (window as unknown as { axe: { run: (context: Document, options: unknown) => Promise<{ violations: Array<{ id: string; impact: string | null; nodes: unknown[] }> }> } }).axe;
    const result = await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } });
    return result.violations
      .filter((violation) => violation.impact === 'critical' || violation.impact === 'serious')
      .map((violation) => ({ id: violation.id, impact: violation.impact, nodes: violation.nodes.length }));
  });
  expect(violations, `${context} has serious or critical axe violations`).toEqual([]);
}

function pngDimensions(bytes: Buffer) {
  expect(bytes.subarray(1, 4).toString('ascii')).toBe('PNG');
  return {
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
  };
}

test.describe.serial('Gamer Passport runtime release gate', () => {
  test('@core anonymous public DTO and browser page expose only public projection', async ({ request, page }) => {
    const response = await request.get('/api/passport/e2e-public');
    expect(response.status()).toBe(200);
    expect(response.headers()['cache-control']).toContain('max-age=0');
    const payload = await response.json();
    expect(payload.passport.access).toBe('public');
    expect(payload.passport.identity.display_name).toBe('E2E Public Player');
    expect(payload.passport.identity).not.toHaveProperty('age_policy_status');
    expect(payload.passport.library.entries).toHaveLength(1);
    expect(payload.passport.library.entries[0].short_review).toBe('Public E2E game review');

    await page.goto('/p/@e2e-public');
    await expect(page.getByRole('heading', { name: 'E2E Public Player' })).toBeVisible();
    await expect(page.getByText('Public E2E Gamer Passport biography')).toBeVisible();
    await expect(page.getByText('E2E public completion highlight')).toBeVisible();
    await expect(page.getByText('This Gamer Passport is private')).toHaveCount(0);
  });

  test('@core all Gamer Card shapes return real exact-size PNG responses', async ({ request }) => {
    const expected = {
      horizontal: { width: 1200, height: 630 },
      square: { width: 1080, height: 1080 },
      story: { width: 1080, height: 1920 },
    } as const;

    for (const [format, dimensions] of Object.entries(expected)) {
      const response = await request.get(`/api/passport/cards/e2e-public?format=${format}`);
      expect(response.status()).toBe(200);
      expect(response.headers()['content-type']).toContain('image/png');
      expect(pngDimensions(await response.body())).toEqual(dimensions);
    }
  });

  test('@core public route diagnostics retain safe status, latency, format, and subject hashes', async ({
    environment,
    request,
  }) => {
    const client = createE2ESupabaseClient(environment);
    expect((await request.get('/api/passport/cards/e2e-public?format=square')).status()).toBe(200);
    await expect.poll(async () => {
      const result = await client.from('passport_route_diagnostics')
        .select('route_name, request_id_hash, subject_hash, operation, response_status, duration_ms, result_class, cache_state')
        .eq('route_name', 'passport_card')
        .eq('operation', 'square')
        .order('occurred_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return result.data ?? null;
    }).toMatchObject({
      route_name: 'passport_card',
      operation: 'square',
      response_status: 200,
      result_class: 'success',
      cache_state: 'rendered',
    });
    const diagnostic = await client.from('passport_route_diagnostics')
      .select('request_id_hash, subject_hash, duration_ms')
      .eq('route_name', 'passport_card')
      .eq('operation', 'square')
      .order('occurred_at', { ascending: false })
      .limit(1)
      .single();
    expect(diagnostic.data?.request_id_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(diagnostic.data?.subject_hash).toMatch(/^[a-f0-9]{20}$/);
    expect(Number(diagnostic.data?.duration_ms)).toBeGreaterThanOrEqual(0);
  });

  test('@core owner and public Passport surfaces pass the automated accessibility gate', async ({
    page,
    openPersonaPage,
  }) => {
    await page.goto('/p/@e2e-public');
    await expect(page.getByRole('heading', { name: 'E2E Public Player' })).toBeVisible();
    await expectNoHighImpactAxeViolations(page, 'public Passport');

    const owner = await openPersonaPage('playerFree');
    try {
      await owner.page.goto('/passport');
      await expect(owner.page.getByRole('heading', { name: 'PlayMechi Gamer Passport' })).toBeVisible();
      await expectNoHighImpactAxeViolations(owner.page, 'owner Passport');
      await owner.page.goto('/passport/cards');
      await expect(owner.page.getByRole('heading', { name: 'Generate your Gamer Card' })).toBeVisible();
      await expectNoHighImpactAxeViolations(owner.page, 'Gamer Card studio');
    } finally {
      await owner.context.close();
    }
  });

  test('@core game editor traps keyboard focus, closes with Escape, and restores focus', async ({
    openPersonaPage,
  }) => {
    const owner = await openPersonaPage('playerFree');
    try {
      await owner.page.goto('/passport/games');
      const edit = owner.page.getByRole('button', { name: 'Edit' }).first();
      await edit.focus();
      await edit.click();
      const dialog = owner.page.getByRole('dialog', { name: /edit eFootball/i });
      await expect(dialog).toBeVisible();
      const close = dialog.getByRole('button', { name: /close edit/i });
      await expect(close).toBeFocused();
      await owner.page.keyboard.press('Shift+Tab');
      await expect(dialog.getByRole('button', { name: 'Save record' })).toBeFocused();
      await owner.page.keyboard.press('Escape');
      await expect(dialog).toHaveCount(0);
      await expect(edit).toBeFocused();
    } finally {
      await owner.context.close();
    }
  });

  test('@core public Passport fits 320px and 360px viewports with reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    for (const width of [320, 360]) {
      await page.setViewportSize({ width, height: 780 });
      await page.goto('/p/@e2e-public');
      await expect(page.getByRole('heading', { name: 'E2E Public Player' })).toBeVisible();
      expect(await page.evaluate(() => ({
        reduced: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      }))).toEqual({ reduced: true, overflow: 0 });
    }
  });

  test('@core friend visibility, block state, minor state, and missing profiles are enforced at runtime', async ({
    request,
    page,
    openPersonaPage,
  }) => {
    await page.goto('/p/@e2e-friends');
    await expect(page.getByText('This Gamer Passport is private')).toBeVisible();
    await expect(page.getByText('Friends-only E2E Gamer Passport biography')).toHaveCount(0);

    const friend = await openPersonaPage('playerFree');
    try {
      await friend.page.goto('/p/@e2e-friends');
      await expect(friend.page.getByText('Friends-only E2E Gamer Passport biography')).toBeVisible();
      await expect(friend.page.getByRole('link', { name: 'My Passport' })).toHaveAttribute('href', '/passport');
      await expect(friend.page.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/dashboard');
      await expect(friend.page.getByRole('link', { name: 'Sign in' })).toHaveCount(0);
      await expect(friend.page.getByRole('link', { name: 'Create yours' })).toHaveCount(0);
      await expect(friend.page.getByRole('link', { name: 'Open my Passport' })).toHaveAttribute('href', '/passport');
      const friendApi = await friend.context.request.get('/api/passport/e2e-friends');
      expect(friendApi.status()).toBe(200);
      expect(friendApi.headers()['cache-control']).toContain('private, no-store');
      expect((await friendApi.json()).passport.library.access).toBe('friend');
    } finally {
      await friend.context.close();
    }

    const blocked = await openPersonaPage('playerOpponentA');
    try {
      expect((await blocked.context.request.get('/api/passport/e2e-public')).status()).toBe(404);
    } finally {
      await blocked.context.close();
    }

    expect((await request.get('/api/passport/e2e-minor')).status()).toBe(404);
    expect((await request.get('/api/passport/e2e-deleted')).status()).toBe(404);
  });

  test('@core anonymous traffic cannot rewrite progression or achievement state', async ({
    environment,
    personas,
    request,
  }) => {
    const client = createE2ESupabaseClient(environment);
    const beforeSnapshot = await client.from('passport_dimension_snapshots')
      .select('projected_at, source_cursor')
      .eq('user_id', personas.playerFree.id)
      .single();
    const beforeAwards = await client.from('passport_achievement_awards')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', personas.playerFree.id);
    expect(beforeSnapshot.error).toBeNull();
    expect(beforeAwards.error).toBeNull();

    expect((await request.get('/api/passport/e2e-public')).status()).toBe(200);
    expect((await request.get('/p/@e2e-public')).status()).toBe(200);
    expect((await request.get('/api/passport/cards/e2e-public?format=horizontal')).status()).toBe(200);

    const afterSnapshot = await client.from('passport_dimension_snapshots')
      .select('projected_at, source_cursor')
      .eq('user_id', personas.playerFree.id)
      .single();
    const afterAwards = await client.from('passport_achievement_awards')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', personas.playerFree.id);
    expect(afterSnapshot.data).toEqual(beforeSnapshot.data);
    expect(afterAwards.count).toBe(beforeAwards.count);
  });

  test('@core authenticated analytics accepts only the privacy-safe event contract', async ({
    environment,
    personas,
    openPersonaPage,
  }) => {
    const client = createE2ESupabaseClient(environment);
    const owner = await openPersonaPage('playerFree');
    try {
      const response = await owner.context.request.post('/api/passport/analytics', {
        data: {
          event: 'passport_card_shared',
          properties: {
            format: 'story',
            channel: 'whatsapp',
            username: 'must-not-be-stored',
            phone: '+254700000000',
            url: 'https://example.test/private',
          },
        },
      });
      expect(response.status()).toBe(204);

      await expect.poll(async () => {
        const result = await client.from('passport_product_events')
          .select('properties')
          .eq('subject_user_id', personas.playerFree.id)
          .eq('event_name', 'passport_card_shared')
          .order('occurred_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        expect(result.error).toBeNull();
        return result.data?.properties ?? null;
      }).toEqual({ format: 'story', channel: 'whatsapp' });
    } finally {
      await owner.context.close();
    }
  });

  test('@core Passport data exports are complete, expiring, and owner-only', async ({
    environment,
    personas,
    request,
    openPersonaPage,
  }) => {
    expect((await request.post('/api/passport/me/export')).status()).toBe(401);
    const owner = await openPersonaPage('playerFree');
    const otherPlayer = await openPersonaPage('playerPro');
    try {
      const created = await owner.context.request.post('/api/passport/me/export');
      expect(created.status()).toBe(201);
      const createdPayload = await created.json() as { export: { download_url: string; expires_at: string } };
      expect(new Date(createdPayload.export.expires_at).getTime()).toBeGreaterThan(Date.now());

      expect((await request.get(createdPayload.export.download_url)).status()).toBe(401);
      expect((await otherPlayer.context.request.get(createdPayload.export.download_url)).status()).toBe(404);

      const downloaded = await owner.context.request.get(createdPayload.export.download_url);
      expect(downloaded.status()).toBe(200);
      expect(downloaded.headers()['cache-control']).toContain('private, no-store');
      const bundle = await downloaded.json();
      expect(bundle.export.schema_version).toBe('passport-export-v1');
      expect(bundle.export.subject_user_id).toBe(personas.playerFree.id);
      expect(bundle.identity_and_privacy.public_handle).toBe('e2e-public');
      expect(bundle.game_journal).toHaveLength(1);
      expect(bundle.verification_records).toBeDefined();
      expect(bundle.event_credentials).toBeDefined();
      expect(bundle.social_relationships.friendships).toHaveLength(1);
      expect(JSON.stringify(bundle)).not.toContain('encrypted_access_token');
      expect(JSON.stringify(bundle)).not.toContain('encrypted_refresh_token');
      expect(JSON.stringify(bundle)).not.toContain(personas.playerPro.id);

      const client = createE2ESupabaseClient(environment);
      await expect.poll(async () => {
        const result = await client.from('passport_data_export_audit')
          .select('action')
          .eq('user_id', personas.playerFree.id)
          .eq('action', 'downloaded');
        return result.data?.length ?? 0;
      }).toBe(1);
    } finally {
      await owner.context.close();
      await otherPlayer.context.close();
    }
  });

  test('@core unpublishing invalidates a warmed public cache immediately', async ({
    environment,
    personas,
    request,
  }) => {
    const client = createE2ESupabaseClient(environment);
    expect((await request.get('/api/passport/e2e-public')).status()).toBe(200);
    const before = await client.from('passport_profiles')
      .select('public_version')
      .eq('user_id', personas.playerFree.id)
      .single();

    try {
      const unpublished = await client.from('passport_profiles').update({
        publication_status: 'draft',
        is_discoverable: false,
      }).eq('user_id', personas.playerFree.id);
      expect(unpublished.error).toBeNull();
      expect((await request.get('/api/passport/e2e-public')).status()).toBe(404);
      const after = await client.from('passport_profiles')
        .select('public_version')
        .eq('user_id', personas.playerFree.id)
        .single();
      expect(Number(after.data?.public_version)).toBeGreaterThan(Number(before.data?.public_version));
    } finally {
      const restored = await client.from('passport_profiles').update({
        publication_status: 'published',
        is_discoverable: true,
      }).eq('user_id', personas.playerFree.id);
      expect(restored.error).toBeNull();
    }
  });
});
