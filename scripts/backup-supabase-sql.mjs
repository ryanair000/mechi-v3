#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawn } from 'node:child_process';

const DEFAULT_BACKUP_ROOT = path.join(process.cwd(), 'output', 'supabase-sql-backups');
const POSTGRES_COMMON_BIN_DIRS = [
  'C:\\Program Files\\PostgreSQL\\17\\bin',
  'C:\\Program Files\\PostgreSQL\\18\\bin',
  'C:\\Program Files\\PostgreSQL\\16\\bin',
];

function normalizeEnvValue(value) {
  return (value ?? '').replace(/\\n/g, '').trim();
}

function stripWrappingQuotes(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

function loadEnvFromWorkspace(cwd) {
  const candidateFiles = ['.env.local', '.env'];

  for (const fileName of candidateFiles) {
    const filePath = path.join(cwd, fileName);

    if (!fs.existsSync(filePath)) {
      continue;
    }

    const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);

    for (const line of lines) {
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) {
        continue;
      }

      const separatorIndex = trimmed.indexOf('=');
      const key = trimmed.slice(0, separatorIndex).trim();
      const rawValue = trimmed.slice(separatorIndex + 1).trim();

      if (!key || process.env[key]) {
        continue;
      }

      process.env[key] = stripWrappingQuotes(rawValue);
    }
  }
}

function parseArgs(argv) {
  const options = {
    outputDir: null,
    skipSplit: false,
    skipGlobals: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--output') {
      options.outputDir = argv[index + 1] ? path.resolve(argv[index + 1]) : null;
      index += 1;
      continue;
    }

    if (arg === '--skip-split') {
      options.skipSplit = true;
      continue;
    }

    if (arg === '--skip-globals') {
      options.skipGlobals = true;
      continue;
    }
  }

  return options;
}

function createTimestampLabel(date = new Date()) {
  return date.toISOString().replace(/[:]/g, '-').replace(/\..+$/, 'Z');
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function writeText(filePath, value) {
  fs.writeFileSync(filePath, value, 'utf8');
}

function relativePath(rootDir, absolutePath) {
  return path.relative(rootDir, absolutePath).split(path.sep).join('/');
}

function readRequiredFile(filePath, label) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing ${label}: ${filePath}`);
  }

  return fs.readFileSync(filePath, 'utf8').trim();
}

function ensureEmptyOrMissingDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    return;
  }

  const entries = fs.readdirSync(dirPath);

  if (entries.length > 0) {
    throw new Error(`Backup directory already exists and is not empty: ${dirPath}`);
  }
}

function resolveExecutable(fileName) {
  const pathEntries = String(process.env.PATH || '')
    .split(path.delimiter)
    .filter(Boolean);

  for (const entry of pathEntries) {
    const candidate = path.join(entry, fileName);
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  for (const dirPath of POSTGRES_COMMON_BIN_DIRS) {
    const candidate = path.join(dirPath, fileName);
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(`Could not find ${fileName}. Install PostgreSQL client tools first.`);
}

function buildConnectionUrl() {
  const directDbUrl = normalizeEnvValue(process.env.SUPABASE_DB_URL);

  if (directDbUrl) {
    return new URL(directDbUrl);
  }

  const poolerPath = path.join(process.cwd(), 'supabase', '.temp', 'pooler-url');
  const poolerUrl = readRequiredFile(poolerPath, 'linked Supabase pooler URL');
  const url = new URL(poolerUrl);
  const dbPassword = normalizeEnvValue(process.env.SUPABASE_DB_PASSWORD);

  if (!dbPassword) {
    throw new Error(
      'SUPABASE_DB_PASSWORD is required for a complete SQL backup. Set it in the shell or .env.local, or reset it from Supabase Database Settings.'
    );
  }

  url.password = dbPassword;

  if (!url.searchParams.get('sslmode')) {
    url.searchParams.set('sslmode', 'require');
  }

  return url;
}

function runCommand(command, args, env, label) {
  return new Promise((resolve, reject) => {
    console.log(`${label}: ${command} ${args.join(' ')}`);

    const child = spawn(command, args, {
      cwd: process.cwd(),
      env,
      stdio: 'inherit',
      windowsHide: true,
    });

    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${label} failed with exit code ${code}`));
    });
  });
}

function createRestoreNotes() {
  return [
    'Restore order:',
    '1. globals.sql',
    '2. full.sql',
    '',
    'Alternative split restore order:',
    '1. globals.sql',
    '2. schema.sql',
    "3. SET session_replication_role = replica;",
    '4. data.sql',
    '',
    'Notes:',
    '- These backups contain sensitive SQL and role definitions.',
    '- Storage object binaries are not part of a SQL dump and require a separate Storage backup.',
  ].join('\n');
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  loadEnvFromWorkspace(process.cwd());

  const pgDumpPath = resolveExecutable('pg_dump.exe');
  const pgDumpAllPath = resolveExecutable('pg_dumpall.exe');
  const connectionUrl = buildConnectionUrl();

  const projectRef = readRequiredFile(
    path.join(process.cwd(), 'supabase', '.temp', 'project-ref'),
    'linked Supabase project ref'
  );
  const postgresVersion = readRequiredFile(
    path.join(process.cwd(), 'supabase', '.temp', 'postgres-version'),
    'linked Supabase postgres version'
  );
  const startedAt = new Date().toISOString();
  const backupDir =
    options.outputDir ??
    path.join(DEFAULT_BACKUP_ROOT, `${projectRef}-${createTimestampLabel(new Date(startedAt))}`);
  const sqlDir = path.join(backupDir, 'sql');
  const metaDir = path.join(backupDir, 'meta');

  ensureEmptyOrMissingDirectory(backupDir);
  ensureDir(sqlDir);
  ensureDir(metaDir);

  const safeEnv = {
    ...process.env,
    PGPASSWORD: connectionUrl.password,
  };

  const sanitizedUrl = new URL(connectionUrl.toString());
  sanitizedUrl.password = '***';

  const manifest = {
    projectRef,
    postgresVersion,
    startedAt,
    completedAt: null,
    backupDir,
    connection: {
      host: connectionUrl.hostname,
      port: connectionUrl.port || '5432',
      database: connectionUrl.pathname.replace(/^\//, '') || 'postgres',
      user: decodeURIComponent(connectionUrl.username),
      scheme: connectionUrl.protocol.replace(/:$/, ''),
      sslmode: connectionUrl.searchParams.get('sslmode') || null,
      urlPreview: sanitizedUrl.toString(),
    },
    tools: {
      pgDumpPath,
      pgDumpAllPath,
    },
    files: [],
  };

  try {
    if (!options.skipGlobals) {
      const globalsPath = path.join(sqlDir, 'globals.sql');
      await runCommand(
        pgDumpAllPath,
        ['--dbname', connectionUrl.toString(), '--globals-only', '--verbose', '--file', globalsPath],
        safeEnv,
        'Dump globals'
      );
      manifest.files.push({
        kind: 'globals',
        path: relativePath(backupDir, globalsPath),
      });
    }

    const fullPath = path.join(sqlDir, 'full.sql');
    await runCommand(
      pgDumpPath,
      [
        '--dbname',
        connectionUrl.toString(),
        '--format=plain',
        '--encoding=UTF8',
        '--verbose',
        '--create',
        '--clean',
        '--if-exists',
        '--blobs',
        '--file',
        fullPath,
      ],
      safeEnv,
      'Dump full database'
    );
    manifest.files.push({
      kind: 'full',
      path: relativePath(backupDir, fullPath),
    });

    if (!options.skipSplit) {
      const schemaPath = path.join(sqlDir, 'schema.sql');
      const dataPath = path.join(sqlDir, 'data.sql');

      await runCommand(
        pgDumpPath,
        [
          '--dbname',
          connectionUrl.toString(),
          '--format=plain',
          '--encoding=UTF8',
          '--verbose',
          '--schema-only',
          '--clean',
          '--if-exists',
          '--file',
          schemaPath,
        ],
        safeEnv,
        'Dump schema'
      );

      await runCommand(
        pgDumpPath,
        [
          '--dbname',
          connectionUrl.toString(),
          '--format=plain',
          '--encoding=UTF8',
          '--verbose',
          '--data-only',
          '--blobs',
          '--file',
          dataPath,
        ],
        safeEnv,
        'Dump data'
      );

      manifest.files.push(
        {
          kind: 'schema',
          path: relativePath(backupDir, schemaPath),
        },
        {
          kind: 'data',
          path: relativePath(backupDir, dataPath),
        }
      );
    }

    const restoreNotesPath = path.join(metaDir, 'restore-notes.txt');
    writeText(restoreNotesPath, `${createRestoreNotes()}\n`);

    manifest.files.push({
      kind: 'restore-notes',
      path: relativePath(backupDir, restoreNotesPath),
    });
  } finally {
    manifest.completedAt = new Date().toISOString();
    writeJson(path.join(metaDir, 'manifest.json'), manifest);
  }

  console.log('SQL backup complete');
  console.log(`Manifest: ${path.join(metaDir, 'manifest.json')}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
