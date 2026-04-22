import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { E2EEnvironment } from './env';
import type { PersonaKey } from './personas';

const ONBOARDING_STORAGE_KEY = 'mechi_onboarding_seen_v1';

type StorageState = {
  cookies: Array<{
    name: string;
    value: string;
    domain: string;
    path: string;
    expires: number;
    httpOnly: boolean;
    sameSite: 'Lax';
    secure: boolean;
  }>;
  origins: Array<{
    origin: string;
    localStorage: Array<{
      name: string;
      value: string;
    }>;
  }>;
};

export function getStorageStatePath(
  personaKey: PersonaKey,
  projectDir = process.cwd()
): string {
  return path.join(projectDir, '.e2e', 'auth', `${personaKey}.json`);
}

function buildOriginState(origin: string, user: Record<string, unknown>) {
  return {
    origin,
    localStorage: [
      {
        name: 'mechi_user',
        value: JSON.stringify(user),
      },
      {
        name: ONBOARDING_STORAGE_KEY,
        value: 'true',
      },
    ],
  };
}

export function buildAnonymousStorageState(): StorageState {
  return {
    cookies: [],
    origins: [],
  };
}

export function buildAuthenticatedStorageState(params: {
  environment: E2EEnvironment;
  token: string;
  user: Record<string, unknown>;
}): StorageState {
  const cookies = [params.environment.baseURL, params.environment.adminBaseURL].map((url) => {
    const parsedUrl = new URL(url);

    return {
      name: 'auth_token',
      value: params.token,
      domain: parsedUrl.hostname,
      path: '/',
      expires: -1,
      httpOnly: true,
      sameSite: 'Lax' as const,
      secure: parsedUrl.protocol === 'https:',
    };
  });

  return {
    cookies,
    origins: [
      buildOriginState(new URL(params.environment.baseURL).origin, params.user),
      buildOriginState(new URL(params.environment.adminBaseURL).origin, params.user),
    ],
  };
}

export async function writeStorageStateFile(
  personaKey: PersonaKey,
  storageState: StorageState,
  projectDir = process.cwd()
) {
  const targetPath = getStorageStatePath(personaKey, projectDir);
  await mkdir(path.dirname(targetPath), { recursive: true });
  await writeFile(targetPath, JSON.stringify(storageState, null, 2), 'utf8');
}
