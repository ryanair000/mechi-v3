import { rm } from 'node:fs/promises';
import { resolveE2EEnvironment, validateE2EEnvironment } from './helpers/env';
import { seedBaseline } from './helpers/seed';

async function globalSetup() {
  const environment = resolveE2EEnvironment();
  validateE2EEnvironment(environment, {
    requireDatabase: true,
    requireJwt: true,
    requireResetFlag: true,
  });

  process.env.NEXT_PUBLIC_APP_URL ??= environment.baseURL;
  process.env.NEXT_PUBLIC_ADMIN_URL ??= environment.adminBaseURL;
  process.env.E2E_PROVIDER_MODE ??= environment.providerMode;
  process.env.E2E_PROVIDER_TRANSCRIPT_DIR ??= environment.providerTranscriptDirectory;

  await rm(environment.providerTranscriptDirectory, {
    force: true,
    recursive: true,
  });
  await seedBaseline(environment);
}

export default globalSetup;
