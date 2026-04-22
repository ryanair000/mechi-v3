import { getStorageStatePath } from '../helpers/storage-state';
import { test, expect } from '../fixtures';

test.use({ storageState: getStorageStatePath('admin') });

test.describe('Admin Workflows', () => {
  test('admin overview and control pages render on the admin host @admin', async ({
    page,
    adminUrl,
  }) => {
    const routes = [
      '/',
      '/users',
      '/queue',
      '/matches',
      '/tournaments',
      '/rewards',
      '/bounties',
      '/support',
      '/logs',
    ];

    for (const route of routes) {
      await page.goto(adminUrl(route));
      const bodyText = await page.locator('body').innerText();
      expect(bodyText.length).toBeGreaterThan(80);
    }

    await page.goto(adminUrl('/'));
    await expect(page.locator('body')).toContainText(/Recent admin activity/i);
  });

  test('admin communications pages load on the admin host @admin', async ({
    page,
    adminUrl,
  }) => {
    await page.goto(adminUrl('/whatsapp'));
    expect((await page.locator('body').innerText()).length).toBeGreaterThan(50);

    await page.goto(adminUrl('/instagram'));
    expect((await page.locator('body').innerText()).length).toBeGreaterThan(50);
  });
});
