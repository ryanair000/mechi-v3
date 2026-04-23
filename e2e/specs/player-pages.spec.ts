import { getStorageStatePath } from '../helpers/storage-state';
import { test, expect } from '../fixtures';
import { createApiContextAs } from './support';

test.use({ storageState: getStorageStatePath('playerFree') });

test.describe('Player Pages', () => {
  test('dashboard and core player surfaces load with seeded content @core', async ({
    page,
  }) => {
    await page.goto('/dashboard');
    await expect(page.locator('body')).toContainText(/eFootball 2026/i);
    await expect(page.locator('body')).toContainText(/EA FC 26/i);

    await page.goto('/notifications');
    await expect(page.locator('body')).toContainText(/Baseline match complete/i);

    await page.goto('/rewards');
    await expect(page.locator('body')).toContainText(/Available points/i);
    await expect(page.locator('body')).toContainText(/Mechi wallet/i);

    await page.goto('/bounties');
    await expect(page.locator('body')).toContainText(/Bounties/i);
    await expect(page.locator('body')).toContainText(/E2E Live Bounty/i);

    await page.goto('/suggest');
    await expect(page.locator('body')).toContainText(/Rocket League/i);
  });

  test('rewards redeem page loads native catalog and can queue a redemption @core', async ({
    page,
  }) => {
    await page.goto('/rewards/redeem');
    await expect(page.locator('body')).toContainText(/CODM Redeemables/i);
    await expect(page.locator('body')).toContainText(/PUBG UC Redeemables/i);
    await expect(page.locator('body')).toContainText(/eFootball Coins Redeemables/i);
    await expect(page.locator('body')).toContainText(/M-Pesa number/i);

    await page.getByRole('button', { name: /^Redeem$/i }).first().click();

    const mpesaInput = page.getByPlaceholder('0700 000 000');
    await expect(mpesaInput).toHaveValue(/.+/);
    await page.getByRole('button', { name: /Redeem 30 CP/i }).click();

    await expect(page.locator('body')).toContainText(/Pending/i);
    await expect(page.locator('body')).toContainText(/30 CP/i);
  });

  test('queue join and leave works for an authenticated player @core', async ({
    page,
    playwright,
    appUrl,
  }) => {
    const playerApi = await createApiContextAs(playwright, appUrl(), 'playerFree');
    const joinResponse = await playerApi.post('/api/queue/join', {
      data: {
        game: 'efootball',
        platform: 'ps',
      },
    });
    expect(joinResponse.ok()).toBeTruthy();

    await page.goto('/queue?game=efootball&platform=ps');
    await expect(page.locator('body')).toContainText(/Cancel Search/i);
    await page.getByRole('button', { name: /cancel search/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);
    await playerApi.dispose();
  });

  test('lobbies and tournaments list seeded fixtures @core', async ({ page }) => {
    await page.goto('/lobbies');
    await expect(page.locator('body')).toContainText(/E2E Lobby/i);

    await page.goto('/tournaments');
    await expect(page.locator('body')).toContainText(/E2E Open Cup/i);
    await expect(page.locator('body')).toContainText(/E2E Live Cup/i);
    await expect(page.locator('body')).toContainText(/LIVE/i);

    await page.goto('/t/e2e-open-cup');
    await expect(page.locator('body')).toContainText(/E2E Open Cup/i);
  });

  test('challenge finder shows eligible games, filters by username, and refreshes sent challenges @core', async ({
    page,
  }) => {
    await page.goto('/challenges');

    await page.getByRole('button', { name: /find opponent/i }).click();
    const dialog = page.getByRole('dialog', { name: /find opponent/i });

    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('button', { name: /efootball 2026/i })).toBeVisible();
    await expect(dialog.getByRole('button', { name: /ea fc 26/i })).toBeVisible();
    await expect(dialog.getByRole('button', { name: /call of duty: mobile/i })).toHaveCount(0);

    const usernameSearch = dialog.getByLabel(/search by username/i);
    await usernameSearch.fill('@opponent-a');
    await expect(dialog).toContainText(/e2e-opponent-a/i);

    const opponentRow = dialog.locator('div.rounded-2xl').filter({ hasText: 'e2e-opponent-a' }).first();
    await opponentRow.getByRole('button', { name: /^challenge$/i }).click();

    await expect(dialog).toBeHidden();
    await expect(page.locator('body')).toContainText(/e2e-opponent-a/i);
    await expect(page.locator('body')).toContainText(/waiting on/i);

    const sentRow = page.locator('div').filter({ hasText: 'e2e-opponent-a' }).last();
    await sentRow.getByRole('button', { name: /cancel/i }).click();
    await expect(page.locator('body')).not.toContainText(/waiting on e2e-opponent-a/i);
  });

  test('friends and public profile surfaces show last seen copy @core', async ({ page }) => {
    await page.goto('/share?username=e2e-free-player');
    await expect(page.locator('body')).toContainText(/last seen/i);

    await page.goto('/s/e2e-free-player');
    await expect(page.locator('body')).toContainText(/last seen/i);

    await page.goto('/share?username=e2e-support-contact');
    await expect(page.locator('body')).toContainText(/no matches yet/i);
  });

  test('live tournament pages show active and queued stream states from seeded data @core', async ({
    page,
  }) => {
    await page.goto('/t/e2e-live-cup');
    await expect(page.locator('body')).toContainText(/E2E Live Cup/i);
    await expect(page.locator('body')).toContainText(/Open live stream/i);
    await expect(page.locator('body')).toContainText(/E2E Live Cup Broadcast/i);

    await page.goto('/t/e2e-idle-cup/live');
    await expect(page.locator('body')).toContainText(/Stream starting soon/i);
    await expect(page.locator('body')).toContainText(/E2E Idle Cup/i);

    await page.goto('/t/e2e-live-cup/live');
    await expect(page.locator('body')).toContainText(/E2E Live Cup Broadcast/i);
    await expect(page.locator('body')).toContainText(/Streamer: e2e-elite-player/i);
  });
});
