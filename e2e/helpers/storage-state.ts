import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { E2EEnvironment } from './env';
import type { PersonaKey } from './personas';

type StorageState = {
  cookies: Array<{
    name: string;
    value: string;
    url: string;
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
  const secureCookie = params.environment.baseURL.startsWith('https://');
  const cookies = [params.environment.baseURL, params.environment.adminBaseURL].map((url) => ({
    name: 'auth_token',
    value: params.token,
    url,
    httpOnly: true,
    sameSite: 'Lax' as const,
    secure: secureCookie,
  }));

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
