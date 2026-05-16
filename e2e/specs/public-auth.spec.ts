import { DEFAULT_PASSWORD, SEEDED_PERSONAS } from '../helpers/personas';
import { test, expect } from '../fixtures';
import {
  createApiContextAs,
  createUniqueAccount,
  expectNoConsoleErrors,
  extractFirstLinkFromHtml,
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

  test('weekend cup vote login preserves the server session @core', async ({ page }) => {
    await page.goto('/login?next=/weekendcup%23vote');
    await page.getByLabel('Phone number').fill(SEEDED_PERSONAS.playerPro.username);
    await page.getByLabel('Password').fill(DEFAULT_PASSWORD);
    await page.getByRole('button', { name: /^sign in$/i }).click();

    await expect(page).toHaveURL(/\/weekendcup#vote/);

    const authStatus = await page.evaluate(async () => {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      return res.status;
    });
    expect(authStatus).toBe(200);
  });

  test('normal users are not redirected into the moderator desk by next params @core', async ({
    page,
  }) => {
    await page.goto('/login?next=/moderators');
    await page.getByLabel('Phone number').fill(SEEDED_PERSONAS.playerPro.phone);
    await page.getByLabel('Password').fill(DEFAULT_PASSWORD);
    await page.getByRole('button', { name: /^sign in$/i }).click();

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator('body')).not.toContainText(/moderator access required/i);

    await page.goto('/login?next=/moderators');
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('email magic sign-in and username/contact password reset recovery work @core', async ({
    page,
    playwright,
    appUrl,
    providerTranscripts,
  }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: /email/i }).click();
    await page.getByLabel('Email').fill(SEEDED_PERSONAS.playerElite.email);
    await page.getByRole('button', { name: /email me a sign-in link/i }).click();
    await expect(page.locator('body')).toContainText(/check your email/i);

    const magicLinkEmail = await providerTranscripts.waitFor('email', (entry) => {
      const requestPayload = entry.request as
        | { to?: string; subject?: string; html?: string }
        | undefined;

      return (
        entry.operation === 'send' &&
        requestPayload?.to === SEEDED_PERSONAS.playerElite.email &&
        requestPayload.subject === 'Your Mechi sign-in link'
      );
    });

    const magicLink = extractFirstLinkFromHtml(
      String(
        (
          magicLinkEmail.request as { html?: string } | undefined
        )?.html ?? ''
      ),
      /\/api\/auth\/magic-link\/consume\?token=/
    );
    expect(magicLink).toBeTruthy();

    await page.goto(magicLink!);
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
    await page.getByLabel(/email or phone/i).fill(throwaway.phone);
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
