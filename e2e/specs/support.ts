import { expect, type APIRequestContext, type Page } from '@playwright/test';
import { getStorageStatePath } from '../helpers/storage-state';
import type { PersonaKey } from '../helpers/personas';

type APIRequestFactory = {
  newContext: (options: {
    baseURL: string;
    storageState: string;
  }) => Promise<APIRequestContext>;
};

export async function createApiContextAs(
  playwright: { request: APIRequestFactory },
  baseURL: string,
  personaKey: PersonaKey
): Promise<APIRequestContext> {
  return playwright.request.newContext({
    baseURL,
    storageState: getStorageStatePath(personaKey),
  });
}

export function trackConsoleErrors(page: Page): string[] {
  const errors: string[] = [];

  page.on('console', (message) => {
    if (message.type() === 'error') {
      errors.push(message.text());
    }
  });

  page.on('pageerror', (error) => {
    errors.push(error.message);
  });

  return errors;
}

export async function expectNoConsoleErrors(page: Page, errors: string[]) {
  await expect(page.locator('body')).toBeVisible();
  expect(errors).toEqual([]);
}

export function createUniqueAccount(prefix: string) {
  const slug = `${prefix}-${Date.now().toString(36)}`;
  return {
    username: slug,
    phone: `0712${Math.floor(Math.random() * 900000 + 100000)}`,
    email: `${slug}@mechi.test`,
  };
}

export function extractFirstLinkFromHtml(html: string, matcher: RegExp): string | null {
  const hrefMatches = html.match(/href="([^"]+)"/gi) ?? [];
  for (const candidate of hrefMatches) {
    const match = candidate.match(/href="([^"]+)"/i);
    const url = match?.[1] ?? '';
    if (matcher.test(url)) {
      return url;
    }
  }

  return null;
}

export const ONE_PIXEL_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aF9cAAAAASUVORK5CYII=',
  'base64'
);
