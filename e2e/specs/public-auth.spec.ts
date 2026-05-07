import { DEFAULT_PASSWORD, SEEDED_PERSONAS } from '../helpers/personas';
import { test, expect } from '../fixtures';
import {
  createApiContextAs,
  createUniqueAccount,
  expectNoConsoleErrors,
  trackConsoleErrors,
} from './support';

test.describe('Public and Auth Flows', () => {
  test('marketing and legal routes render without console errors @core @smoke', async ({
    page,
  }) => {
    const routes = [
      '/',
      '/pricing',
      '/privacy-policy',
      '/terms-of-service',
      '/user-data-deletion',
    ];

    for (const route of routes) {
      const consoleErrors = trackConsoleErrors(page);
      await page.goto(route);
      const bodyText = await page.locator('body').innerText();
      expect(bodyText.trim().length).toBeGreaterThan(10);
      await expectNoConsoleErrors(page, consoleErrors);
    }
  });

  test('registration form creates a new account from the browser @core', async ({
    page,
  }) => {
    const account = createUniqueAccount('register');

    await page.goto('/register');
    await page.getByLabel('Username').fill(account.username);
    await page.getByLabel('Phone Number').fill(account.phone);
    await page.getByLabel('Mail Address').fill(account.email);
    await page.getByLabel('Password').fill(DEFAULT_PASSWORD);
    await page.getByRole('button', { name: /create account/i }).click();

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator('body')).toContainText(/Mechi playbook/i);
  });

  test('phone login works for a seeded account @core', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Phone number').fill(SEEDED_PERSONAS.playerPro.phone);
    await page.getByLabel('Password').fill(DEFAULT_PASSWORD);
    await page.getByRole('button', { name: /^sign in$/i }).click();

    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('username and email recovery completes magic sign-in and password reset @core', async ({
    page,
    playwright,
    appUrl,
  }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: /email/i }).click();
    await page.getByLabel('Email').fill(SEEDED_PERSONAS.playerElite.email);
    await page.getByLabel('Username').fill(SEEDED_PERSONAS.playerElite.username);
    await page.getByRole('button', { name: /sign in with username and email/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    await page.evaluate(() => localStorage.clear());
    await page.context().clearCookies();

    const throwaway = createUniqueAccount('reset');
    const anonApi = await createApiContextAs(playwright, appUrl(), 'anon');
    const registerResponse = await anonApi.post('/api/auth/register', {
      data: {
        username: throwaway.username,
        phone: throwaway.phone,
        email: throwaway.email,
        password: DEFAULT_PASSWORD,
      },
    });
    expect(registerResponse.ok()).toBeTruthy();

    await page.goto('/forgot-password');
    await page.getByLabel('Username').fill(throwaway.username);
    await page.getByLabel('Email').fill(throwaway.email);
    await page.getByRole('button', { name: /continue/i }).click();
    await expect(page.locator('body')).toContainText(/account matched/i);
    await page.getByLabel('New password').fill('MechiReset!456');
    await page.getByLabel('Confirm password').fill('MechiReset!456');
    await page.getByRole('button', { name: /reset password/i }).click();

    await expect(page).toHaveURL(/\/dashboard/);

    const oldPasswordResponse = await anonApi.post('/api/auth/login', {
      data: {
        identifier: throwaway.email,
        password: DEFAULT_PASSWORD,
        login_method: 'email',
      },
    });
    expect(oldPasswordResponse.status()).toBe(401);

    const newPasswordResponse = await anonApi.post('/api/auth/login', {
      data: {
        identifier: throwaway.email,
        password: 'MechiReset!456',
        login_method: 'email',
      },
    });
    expect(newPasswordResponse.ok()).toBeTruthy();

    await anonApi.dispose();
  });

  test('banned accounts are rejected at login @core', async ({ playwright, appUrl }) => {
    const anonApi = await createApiContextAs(playwright, appUrl(), 'anon');
    const response = await anonApi.post('/api/auth/login', {
      data: {
        identifier: SEEDED_PERSONAS.playerBanned.phone,
        password: DEFAULT_PASSWORD,
        login_method: 'phone',
      },
    });

    expect(response.status()).toBe(403);
    const payload = (await response.json()) as { error?: string };
    expect(payload.error).toMatch(/suspended/i);
    await anonApi.dispose();
  });
});
