import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const projectDir = process.cwd();
const mode = process.argv[2] ?? 'all';
const validModes = new Set(['all', 'quality', 'database', 'e2e', 'preview']);
const npmCliPath = process.env.npm_execpath;
const npxCliPath = npmCliPath
  ? path.join(path.dirname(npmCliPath), 'npx-cli.js')
  : undefined;
const evidence = {
  startedAt: new Date().toISOString(),
  mode,
  revision: 'unknown',
  platform: process.platform,
  node: process.version,
  checks: [],
};

function loadEnvFile(fileName) {
  const filePath = path.join(projectDir, fileName);
  if (!existsSync(filePath)) return;

  for (const rawLine of readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const separator = line.indexOf('=');
    if (separator <= 0) continue;
    const key = line.slice(0, separator).trim();
    if (!key || process.env[key] !== undefined) continue;
    let value = line.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

function record(name, status, detail) {
  evidence.checks.push({ name, status, detail, at: new Date().toISOString() });
}

function run(name, command, args, options = {}) {
  process.stdout.write(`\n[release] ${name}\n`);
  const result = spawnSync(command, args, {
    cwd: projectDir,
    env: { ...process.env, ...options.env },
    stdio: 'inherit',
    shell: false,
  });

  if (result.error) {
    record(name, 'failed', result.error.message);
    throw result.error;
  }
  if (result.status !== 0) {
    record(name, 'failed', `exit ${result.status ?? 'unknown'}`);
    throw new Error(`${name} failed with exit ${result.status ?? 'unknown'}`);
  }
  record(name, 'passed', 'exit 0');
}

function runNpm(name, args, options) {
  if (npmCliPath) {
    run(name, process.execPath, [npmCliPath, ...args], options);
    return;
  }
  run(name, 'npm', args, options);
}

function runNpx(name, args, options) {
  if (!npxCliPath || !existsSync(npxCliPath)) {
    throw new Error('Run this gate through an npm release script so npx is resolved safely.');
  }
  run(name, process.execPath, [npxCliPath, ...args], options);
}

function requireValue(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment value: ${name}`);
  return value;
}

function assertIsolatedDatabase() {
  if (process.env.E2E_ALLOW_DB_RESET !== 'true') {
    throw new Error('E2E_ALLOW_DB_RESET=true is required.');
  }
  if (process.env.E2E_DATABASE_CONFIRMATION !== 'isolated-e2e-reset-authorized') {
    throw new Error(
      'E2E_DATABASE_CONFIRMATION=isolated-e2e-reset-authorized is required.'
    );
  }

  const databaseUrl = requireValue('E2E_SUPABASE_DB_URL');
  const parsed = new URL(databaseUrl);
  if (!['postgres:', 'postgresql:'].includes(parsed.protocol)) {
    throw new Error('E2E_SUPABASE_DB_URL must be a PostgreSQL connection URL.');
  }
  if (/prod(uction)?/i.test(parsed.hostname) || /prod(uction)?/i.test(parsed.pathname)) {
    throw new Error('The E2E database URL appears to identify production.');
  }
  return databaseUrl;
}

function runQuality() {
  runNpm('production dependency audit', ['run', 'audit:production']);
  runNpm('V5 cutover guard', ['run', 'check:v5-cutover']);
  runNpm('Passport contract and unit tests', ['run', 'test:passport']);
  runNpm('lint', ['run', 'lint']);
  runNpm('typecheck', ['run', 'typecheck']);
  runNpm('E2E typecheck', ['run', 'typecheck:e2e']);
  runNpm('production build', ['run', 'build']);
}

function runDatabase() {
  const databaseUrl = assertIsolatedDatabase();
  runNpx('apply migrations to isolated database', [
    '--yes',
    'supabase@2.109.1',
    'db',
    'push',
    '--db-url',
    databaseUrl,
    '--include-all',
    '--yes',
  ]);
  runNpx('lint isolated database', [
    '--yes',
    'supabase@2.109.1',
    'db',
    'lint',
    '--db-url',
    databaseUrl,
    '--level',
    'warning',
    '--fail-on',
    'error',
  ]);
  run('verify database security contract', 'psql', [
    databaseUrl,
    '-v',
    'ON_ERROR_STOP=1',
    '-f',
    'supabase/verification/v5_production_security.sql',
  ]);
  run('verify Passport runtime security contract', 'psql', [
    databaseUrl,
    '-v',
    'ON_ERROR_STOP=1',
    '-f',
    'supabase/verification/passport_runtime_security.sql',
  ]);
}

function runE2E({ externalServer = false, skipBuild = false } = {}) {
  if (process.env.E2E_ALLOW_DB_RESET !== 'true') {
    throw new Error('E2E_ALLOW_DB_RESET=true is required for seeded browser tests.');
  }
  requireValue('E2E_SUPABASE_URL');
  requireValue('E2E_SUPABASE_SERVICE_ROLE_KEY');
  requireValue('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  requireValue('JWT_SECRET');
  requireValue('CRON_SECRET');

  if (externalServer) {
    if (process.env.E2E_PREVIEW_CONFIRMATION !== 'isolated-preview-authorized') {
      throw new Error(
        'E2E_PREVIEW_CONFIRMATION=isolated-preview-authorized is required.'
      );
    }
    const baseUrl = new URL(requireValue('E2E_BASE_URL'));
    if (baseUrl.protocol !== 'https:') {
      throw new Error('Preview verification requires an HTTPS E2E_BASE_URL.');
    }
  }

  runNpm(externalServer ? 'preview browser suite' : 'local browser suite', [
    'run',
    'test:e2e',
  ], {
    env: {
      CI: 'true',
      E2E_EXTERNAL_SERVER: externalServer ? 'true' : 'false',
      E2E_SKIP_BUILD: skipBuild ? 'true' : 'false',
    },
  });
}

function writeEvidence(error) {
  evidence.finishedAt = new Date().toISOString();
  evidence.status = error ? 'failed' : 'passed';
  if (error) evidence.error = error.message;
  const outputDir = path.join(projectDir, 'output');
  mkdirSync(outputDir, { recursive: true });
  const safeTime = evidence.startedAt.replace(/[:.]/g, '-');
  const outputPath = path.join(outputDir, `v5-release-${mode}-${safeTime}.json`);
  writeFileSync(outputPath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
  process.stdout.write(`\n[release] Evidence: ${outputPath}\n`);
}

if (!validModes.has(mode)) {
  throw new Error(`Unknown mode "${mode}". Use: ${[...validModes].join(', ')}.`);
}

loadEnvFile('.env.e2e.local');
loadEnvFile('.env.e2e');

const revision = spawnSync('git', ['rev-parse', 'HEAD'], {
  cwd: projectDir,
  encoding: 'utf8',
  shell: false,
});
if (revision.status === 0) evidence.revision = revision.stdout.trim();

let failure;
try {
  if (mode === 'quality' || mode === 'all') runQuality();
  if (mode === 'database' || mode === 'all') runDatabase();
  if (mode === 'e2e') runE2E();
  if (mode === 'all') runE2E({ skipBuild: true });
  if (mode === 'preview') runE2E({ externalServer: true });
} catch (error) {
  failure = error instanceof Error ? error : new Error(String(error));
  process.stderr.write(`\n[release] FAILED: ${failure.message}\n`);
} finally {
  writeEvidence(failure);
}

if (failure) process.exit(1);
process.stdout.write('\n[release] All requested gates passed.\n');
