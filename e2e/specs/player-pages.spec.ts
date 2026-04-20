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
    await expect(page.locator('body')).toContainText(/Available RP/i);

    await page.goto('/suggest');
    await expect(page.locator('body')).toContainText(/Rocket League/i);
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

    await page.goto('/t/e2e-open-cup');
    await expect(page.locator('body')).toContainText(/E2E Open Cup/i);
  });
});
