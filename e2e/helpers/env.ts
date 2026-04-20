import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import * as nextEnvModule from '@next/env';

type LoadEnvConfig = typeof import('@next/env').loadEnvConfig;
type NextEnvCompat = {
  loadEnvConfig?: LoadEnvConfig;
  default?: {
    loadEnvConfig?: LoadEnvConfig;
  };
};

const nextEnvCompat = nextEnvModule as NextEnvCompat;
const loadEnvConfig =
  nextEnvCompat.loadEnvConfig ?? nextEnvCompat.default?.loadEnvConfig;

if (!loadEnvConfig) {
  throw new Error('Unable to resolve loadEnvConfig from @next/env');
}

const resolvedLoadEnvConfig: LoadEnvConfig = loadEnvConfig;

const EXTRA_ENV_FILES = ['.env.e2e.local', '.env.e2e'];
let envLoaded = false;

export type E2EEnvironment = {
  projectDir: string;
  baseURL: string;
  adminBaseURL: string;
  authStateDirectory: string;
  providerTranscriptDirectory: string;
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  jwtSecret: string;
  cronSecret: string;
  runId: string;
  providerMode: 'live' | 'mock' | 'sandbox';
  allowDatabaseReset: boolean;
  port: number;
};

function stripWrappingQuotes(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

function loadPlainEnvFile(filePath: string) {
  if (!existsSync(filePath)) {
    return;
  }

  const contents = readFileSync(filePath, 'utf8');
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const equalsIndex = line.indexOf('=');
    if (equalsIndex <= 0) {
      continue;
    }

    const key = line.slice(0, equalsIndex).trim();
    if (!key || process.env[key] !== undefined) {
      continue;
    }

    const value = stripWrappingQuotes(line.slice(equalsIndex + 1).trim());
    process.env[key] = value;
  }
}

function defaultRunId() {
  return `e2e-${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}`;
}

export function loadE2EEnvironment(projectDir = process.cwd()): void {
  if (envLoaded) {
    return;
  }

  resolvedLoadEnvConfig(projectDir);
  for (const fileName of EXTRA_ENV_FILES) {
    loadPlainEnvFile(path.join(projectDir, fileName));
  }

  process.env.E2E_BASE_URL ??= 'http://localhost:3000';
  process.env.E2E_ADMIN_BASE_URL ??= 'http://admin.localhost:3000';
  process.env.E2E_RUN_ID ??= defaultRunId();
  process.env.E2E_PROVIDER_MODE ??= 'mock';
  process.env.NEXT_PUBLIC_APP_URL ??= process.env.E2E_BASE_URL;
  process.env.NEXT_PUBLIC_ADMIN_URL ??= process.env.E2E_ADMIN_BASE_URL;
  process.env.E2E_PROVIDER_TRANSCRIPT_DIR ??= path.join(
    projectDir,
    'test-results',
    'provider-transcripts'
  );

  envLoaded = true;
}

function getPortFromUrl(value: string): number {
  const parsed = new URL(value);
  if (parsed.port) {
    return Number(parsed.port);
  }

  return parsed.protocol === 'https:' ? 443 : 80;
}

export function resolveE2EEnvironment(projectDir = process.cwd()): E2EEnvironment {
  loadE2EEnvironment(projectDir);

  const providerMode =
    process.env.E2E_PROVIDER_MODE === 'live' ||
    process.env.E2E_PROVIDER_MODE === 'sandbox'
      ? process.env.E2E_PROVIDER_MODE
      : 'mock';

  return {
    projectDir,
    baseURL: process.env.E2E_BASE_URL!,
    adminBaseURL: process.env.E2E_ADMIN_BASE_URL!,
    authStateDirectory: path.join(projectDir, '.e2e', 'auth'),
    providerTranscriptDirectory:
      process.env.E2E_PROVIDER_TRANSCRIPT_DIR ??
      path.join(projectDir, 'test-results', 'provider-transcripts'),
    supabaseUrl:
      process.env.E2E_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    supabaseServiceRoleKey:
      process.env.E2E_SUPABASE_SERVICE_ROLE_KEY ??
      process.env.SUPABASE_SERVICE_ROLE_KEY ??
      '',
    jwtSecret: process.env.JWT_SECRET?.trim() ?? '',
    cronSecret: process.env.CRON_SECRET?.trim() ?? '',
    runId: process.env.E2E_RUN_ID!,
    providerMode,
    allowDatabaseReset: process.env.E2E_ALLOW_DB_RESET === 'true',
    port: getPortFromUrl(process.env.E2E_BASE_URL!),
  };
}

export function validateE2EEnvironment(
  env: E2EEnvironment,
  options: {
    requireDatabase?: boolean;
    requireJwt?: boolean;
    requireResetFlag?: boolean;
  } = {}
) {
  const missing: string[] = [];

  if (options.requireDatabase) {
    if (!env.supabaseUrl) {
      missing.push('E2E_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL');
    }
    if (!env.supabaseServiceRoleKey) {
      missing.push('E2E_SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SERVICE_ROLE_KEY');
    }
  }

  if (options.requireJwt && !env.jwtSecret) {
    missing.push('JWT_SECRET');
  }

  if (options.requireResetFlag && !env.allowDatabaseReset) {
    missing.push('E2E_ALLOW_DB_RESET=true');
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required E2E environment values: ${missing.join(', ')}`
    );
  }
}
