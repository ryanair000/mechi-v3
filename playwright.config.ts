import { defineConfig, devices } from '@playwright/test';
import { resolveE2EEnvironment } from './e2e/helpers/env';
import { getStorageStatePath } from './e2e/helpers/storage-state';

const environment = resolveE2EEnvironment();
const isCI = process.env.CI === 'true';

export default defineConfig({
  testDir: './e2e/specs',
  fullyParallel: false,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  workers: isCI ? 2 : undefined,
  timeout: 90_000,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
  ],
  outputDir: 'test-results/artifacts',
  use: {
    baseURL: environment.baseURL,
    storageState: getStorageStatePath('anon'),
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  globalSetup: './e2e/global.setup.ts',
  webServer: {
    command: 'npm run dev',
    url: environment.baseURL,
    reuseExistingServer: !isCI,
    timeout: 180_000,
    env: {
      ...process.env,
      PORT: String(environment.port),
      HOSTNAME: '0.0.0.0',
      NODE_ENV: 'test',
      E2E_PROVIDER_MODE: environment.providerMode,
      E2E_PROVIDER_TRANSCRIPT_DIR: environment.providerTranscriptDirectory,
      NEXT_PUBLIC_APP_URL: environment.baseURL,
      NEXT_PUBLIC_ADMIN_URL: environment.adminBaseURL,
      NEXT_PUBLIC_SUPABASE_URL:
        process.env.NEXT_PUBLIC_SUPABASE_URL ?? environment.supabaseUrl,
      SUPABASE_SERVICE_ROLE_KEY:
        process.env.SUPABASE_SERVICE_ROLE_KEY ?? environment.supabaseServiceRoleKey,
    },
  },
  projects: [
    {
      name: 'desktop-core',
      grep: /@core/,
      use: {
        ...devices['Desktop Chrome'],
      },
    },
    {
      name: 'mobile-core',
      grep: /@core/,
      use: {
        ...devices['iPhone 13'],
      },
    },
    {
      name: 'admin',
      grep: /@admin/,
      use: {
        ...devices['Desktop Chrome'],
      },
    },
    {
      name: 'providers-mock',
      grep: /@providers/,
      use: {
        ...devices['Desktop Chrome'],
      },
    },
    {
      name: 'providers-sandbox',
      grep: /@providers/,
      use: {
        ...devices['Desktop Chrome'],
      },
    },
    {
      name: 'cross-browser-chromium',
      grep: /@smoke/,
      use: {
        ...devices['Desktop Chrome'],
      },
    },
    {
      name: 'cross-browser-firefox',
      grep: /@smoke/,
      use: {
        ...devices['Desktop Firefox'],
      },
    },
    {
      name: 'cross-browser-webkit',
      grep: /@smoke/,
      use: {
        ...devices['Desktop Safari'],
      },
    },
  ],
});
