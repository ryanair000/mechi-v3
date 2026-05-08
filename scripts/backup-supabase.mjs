#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { createClient } from '@supabase/supabase-js';

const DEFAULT_PAGE_SIZE = 1000;
const DEFAULT_AUTH_PAGE_SIZE = 1000;
const DEFAULT_BACKUP_ROOT = path.join(process.cwd(), 'output', 'supabase-backups');
const MAX_FILENAME_LENGTH = 120;
const WINDOWS_RESERVED_NAMES = new Set([
  'CON',
  'PRN',
  'AUX',
  'NUL',
  'COM1',
  'COM2',
  'COM3',
  'COM4',
  'COM5',
  'COM6',
  'COM7',
  'COM8',
  'COM9',
  'LPT1',
  'LPT2',
  'LPT3',
  'LPT4',
  'LPT5',
  'LPT6',
  'LPT7',
  'LPT8',
  'LPT9',
]);

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

function clampInteger(value, fallback, minimum, maximum) {
  const parsed = Number.parseInt(value ?? '', 10);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(maximum, Math.max(minimum, parsed));
}

function parseArgs(argv) {
  const options = {
    outputDir: null,
    pageSize: DEFAULT_PAGE_SIZE,
    skipStorageDownloads: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--output') {
      options.outputDir = argv[index + 1] ? path.resolve(argv[index + 1]) : null;
      index += 1;
      continue;
    }

    if (arg === '--page-size') {
      options.pageSize = clampInteger(argv[index + 1], DEFAULT_PAGE_SIZE, 100, 5000);
      index += 1;
      continue;
    }

    if (arg === '--skip-storage-downloads') {
      options.skipStorageDownloads = true;
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

function relativePath(rootDir, absolutePath) {
  return path.relative(rootDir, absolutePath).split(path.sep).join('/');
}

function safeFilename(name) {
  const cleaned = String(name || 'file')
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_')
    .replace(/[. ]+$/g, '')
    .trim();

  const fallback = cleaned || 'file';
  const prefixed = WINDOWS_RESERVED_NAMES.has(fallback.toUpperCase()) ? `_${fallback}` : fallback;

  return prefixed.slice(0, MAX_FILENAME_LENGTH);
}

function createStorageFileName(index, key) {
  const keyHash = crypto.createHash('sha256').update(key).digest('hex').slice(0, 12);
  const baseName = safeFilename(path.basename(key) || 'file');
  return `${String(index).padStart(6, '0')}-${keyHash}-${baseName}`;
}

function getProjectRef(supabaseUrl) {
  return new URL(supabaseUrl).hostname.split('.')[0] ?? 'unknown-project';
}

function buildRestHeaders(serviceRoleKey, extraHeaders = {}) {
  return {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    ...extraHeaders,
  };
}

function parseContentRangeCount(contentRangeHeader) {
  const rawCount = String(contentRangeHeader || '').split('/').pop() ?? '';
  const count = Number.parseInt(rawCount, 10);
  return Number.isFinite(count) ? count : null;
}

function listRestResources(openApiDocument) {
  return Object.entries(openApiDocument.paths ?? {})
    .filter(([resourcePath, definition]) => {
      return resourcePath !== '/' && !resourcePath.startsWith('/rpc/') && Boolean(definition?.get);
    })
    .map(([resourcePath]) => ({
      resourcePath,
      resourceName: resourcePath.slice(1).replace(/\//g, '__'),
    }))
    .sort((left, right) => left.resourceName.localeCompare(right.resourceName));
}

async function wait(ms) {
  await new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function withRetry(label, task, attempts = 3) {
  let lastError = null;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await task();
    } catch (error) {
      lastError = error;

      if (attempt === attempts) {
        break;
      }

      console.warn(`${label} failed on attempt ${attempt}/${attempts}. Retrying...`);
      await wait(500 * attempt);
    }
  }

  throw lastError;
}

async function fetchOpenApiDocument(supabaseUrl, serviceRoleKey) {
  const url = new URL('/rest/v1/', supabaseUrl);

  return withRetry('OpenAPI fetch', async () => {
    const response = await fetch(url, {
      headers: buildRestHeaders(serviceRoleKey, {
        Accept: 'application/openapi+json',
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(body || `OpenAPI fetch failed with ${response.status}`);
    }

    return response.json();
  });
}

async function fetchRestCount(supabaseUrl, serviceRoleKey, resourcePath) {
  const url = new URL(`/rest/v1${resourcePath}`, supabaseUrl);
  url.searchParams.set('select', '*');

  const response = await fetch(url, {
    method: 'HEAD',
    headers: buildRestHeaders(serviceRoleKey, {
      Prefer: 'count=exact',
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || `Count request failed for ${resourcePath} with ${response.status}`);
  }

  return parseContentRangeCount(response.headers.get('content-range'));
}

async function fetchRestPage(supabaseUrl, serviceRoleKey, resourcePath, limit, offset) {
  const url = new URL(`/rest/v1${resourcePath}`, supabaseUrl);
  url.searchParams.set('select', '*');
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('offset', String(offset));

  return withRetry(`REST export ${resourcePath} offset ${offset}`, async () => {
    const response = await fetch(url, {
      headers: buildRestHeaders(serviceRoleKey),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(body || `REST fetch failed for ${resourcePath} with ${response.status}`);
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      throw new Error(`Expected array response for ${resourcePath}`);
    }

    return data;
  });
}

async function exportRestResource({
  backupDir,
  pageSize,
  resource,
  serviceRoleKey,
  supabaseUrl,
}) {
  const restDir = path.join(backupDir, 'rest');
  ensureDir(restDir);

  const outputPath = path.join(restDir, `${resource.resourceName}.jsonl`);
  const writeStream = fs.createWriteStream(outputPath, { encoding: 'utf8' });

  let expectedCount = null;
  let exportedCount = 0;
  let pageCount = 0;
  let offset = 0;

  try {
    expectedCount = await fetchRestCount(supabaseUrl, serviceRoleKey, resource.resourcePath);

    while (true) {
      const rows = await fetchRestPage(
        supabaseUrl,
        serviceRoleKey,
        resource.resourcePath,
        pageSize,
        offset
      );

      if (rows.length === 0) {
        break;
      }

      pageCount += 1;

      for (const row of rows) {
        writeStream.write(`${JSON.stringify(row)}\n`);
      }

      exportedCount += rows.length;
      offset += rows.length;

      if (rows.length < pageSize) {
        break;
      }

      if (expectedCount !== null && exportedCount >= expectedCount) {
        break;
      }
    }
  } finally {
    await new Promise((resolve) => {
      writeStream.end(resolve);
    });
  }

  return {
    resourceName: resource.resourceName,
    resourcePath: resource.resourcePath,
    exportedCount,
    expectedCount,
    pageCount,
    outputPath: relativePath(backupDir, outputPath),
  };
}

async function exportAuthUsers({ backupDir, supabase }) {
  const authDir = path.join(backupDir, 'auth');
  ensureDir(authDir);

  const outputPath = path.join(authDir, 'users.jsonl');
  const writeStream = fs.createWriteStream(outputPath, { encoding: 'utf8' });

  let exportedCount = 0;
  let pageCount = 0;
  let page = 1;

  try {
    while (true) {
      const response = await withRetry(`Auth export page ${page}`, async () => {
        return supabase.auth.admin.listUsers({
          page,
          perPage: DEFAULT_AUTH_PAGE_SIZE,
        });
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const users = response.data?.users ?? [];

      if (users.length === 0) {
        break;
      }

      pageCount += 1;

      for (const user of users) {
        writeStream.write(`${JSON.stringify(user)}\n`);
      }

      exportedCount += users.length;

      if (users.length < DEFAULT_AUTH_PAGE_SIZE) {
        break;
      }

      page += 1;
    }
  } finally {
    await new Promise((resolve) => {
      writeStream.end(resolve);
    });
  }

  return {
    exportedCount,
    pageCount,
    outputPath: relativePath(backupDir, outputPath),
  };
}

async function exportStorage({ backupDir, skipStorageDownloads, supabase }) {
  const storageDir = path.join(backupDir, 'storage');
  ensureDir(storageDir);

  const bucketsResponse = await withRetry('Storage bucket listing', async () => {
    return supabase.storage.listBuckets();
  });

  if (bucketsResponse.error) {
    throw new Error(bucketsResponse.error.message);
  }

  const buckets = bucketsResponse.data ?? [];
  const bucketsOutputPath = path.join(storageDir, 'buckets.json');
  writeJson(bucketsOutputPath, buckets);

  const summaries = [];

  for (const bucket of buckets) {
    const bucketName = bucket.name;
    const bucketDir = path.join(storageDir, bucketName);
    const filesDir = path.join(bucketDir, 'files');
    ensureDir(bucketDir);

    const metadataOutputPath = path.join(bucketDir, 'objects.jsonl');
    const metadataStream = fs.createWriteStream(metadataOutputPath, { encoding: 'utf8' });

    let cursor = undefined;
    let pageCount = 0;
    let objectCount = 0;
    let downloadedCount = 0;
    let downloadedBytes = 0;
    let downloadIndex = 1;
    const errors = [];

    try {
      while (true) {
        const response = await withRetry(`Storage list ${bucketName}`, async () => {
          return supabase.storage.from(bucketName).listV2({
            prefix: '',
            cursor,
            limit: 1000,
            sortBy: { column: 'name', order: 'asc' },
            with_delimiter: false,
          });
        });

        if (response.error) {
          throw new Error(response.error.message);
        }

        const page = response.data;
        const objects = page?.objects ?? [];
        pageCount += 1;

        for (const object of objects) {
          objectCount += 1;

          let localBackupPath = null;

          if (!skipStorageDownloads) {
            try {
              ensureDir(filesDir);
              const downloadResponse = await withRetry(
                `Storage download ${bucketName}/${object.key ?? object.name}`,
                async () => {
                  return supabase.storage
                    .from(bucketName)
                    .download(object.key ?? object.name, undefined, { cache: 'no-store' });
                }
              );

              if (downloadResponse.error) {
                throw new Error(downloadResponse.error.message);
              }

              const blob = downloadResponse.data;
              const arrayBuffer = await blob.arrayBuffer();
              const buffer = Buffer.from(arrayBuffer);
              const downloadName = createStorageFileName(
                downloadIndex,
                object.key ?? object.name ?? `object-${downloadIndex}`
              );
              const absoluteFilePath = path.join(filesDir, downloadName);
              fs.writeFileSync(absoluteFilePath, buffer);

              localBackupPath = relativePath(backupDir, absoluteFilePath);
              downloadedCount += 1;
              downloadedBytes += buffer.length;
              downloadIndex += 1;
            } catch (error) {
              errors.push({
                objectKey: object.key ?? object.name ?? null,
                message: error instanceof Error ? error.message : String(error),
              });
            }
          }

          metadataStream.write(
            `${JSON.stringify({
              ...object,
              localBackupPath,
            })}\n`
          );
        }

        if (!page?.hasNext || !page?.nextCursor) {
          break;
        }

        cursor = page.nextCursor;
      }
    } finally {
      await new Promise((resolve) => {
        metadataStream.end(resolve);
      });
    }

    summaries.push({
      bucketId: bucket.id ?? null,
      bucketName,
      public: bucket.public ?? null,
      objectCount,
      pageCount,
      downloadedCount,
      downloadedBytes,
      errors,
      metadataOutputPath: relativePath(backupDir, metadataOutputPath),
    });
  }

  return {
    bucketCount: buckets.length,
    bucketsOutputPath: relativePath(backupDir, bucketsOutputPath),
    buckets: summaries,
  };
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

async function main() {
  const options = parseArgs(process.argv.slice(2));
  loadEnvFromWorkspace(process.cwd());

  const supabaseUrl = normalizeEnvValue(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const supabaseServiceRoleKey = normalizeEnvValue(process.env.SUPABASE_SERVICE_ROLE_KEY);

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Load them via the host environment or workspace .env.local before running this backup.'
    );
  }

  const startedAt = new Date().toISOString();
  const projectRef = getProjectRef(supabaseUrl);
  const backupDir =
    options.outputDir ??
    path.join(DEFAULT_BACKUP_ROOT, `${projectRef}-${createTimestampLabel(new Date(startedAt))}`);

  ensureEmptyOrMissingDirectory(backupDir);
  ensureDir(backupDir);
  ensureDir(path.join(backupDir, 'meta'));

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  console.log(`Starting Supabase backup for project ${projectRef}`);
  console.log(`Backup directory: ${backupDir}`);
  console.log(`Mode: service-role REST/Auth/Storage export`);

  const manifest = {
    projectRef,
    startedAt,
    completedAt: null,
    backupDir,
    mode: 'service-role-export',
    pageSize: options.pageSize,
    toolAvailability: {
      hasSupabaseDbUrl: Boolean(process.env.SUPABASE_DB_URL),
      hasDocker: false,
      hasPgDump: false,
    },
    limitations: [
      'This machine does not currently expose SUPABASE_DB_URL, Docker, or pg_dump, so this backup is not a raw logical SQL dump.',
      'Exposed PostgREST resources, auth users, storage bucket metadata, and downloadable storage objects are included.',
      'Internal schemas not exposed through PostgREST, role definitions, auth sessions, and database-level objects require a DB-level dump path to capture completely.',
    ],
    rest: {
      openApiPath: 'meta/openapi.json',
      resourcesPath: 'meta/rest-resources.json',
      resources: [],
    },
    auth: null,
    storage: null,
    errors: [],
  };

  try {
    const openApiDocument = await fetchOpenApiDocument(supabaseUrl, supabaseServiceRoleKey);
    const restResources = listRestResources(openApiDocument);

    writeJson(path.join(backupDir, 'meta', 'openapi.json'), openApiDocument);
    writeJson(path.join(backupDir, 'meta', 'rest-resources.json'), restResources);

    console.log(`Found ${restResources.length} exposed REST resources`);

    for (const resource of restResources) {
      try {
        console.log(`Exporting REST resource: ${resource.resourceName}`);
        const summary = await exportRestResource({
          backupDir,
          pageSize: options.pageSize,
          resource,
          serviceRoleKey: supabaseServiceRoleKey,
          supabaseUrl,
        });
        manifest.rest.resources.push(summary);
      } catch (error) {
        manifest.errors.push({
          surface: 'rest',
          resource: resource.resourceName,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }

    try {
      console.log('Exporting auth users');
      manifest.auth = await exportAuthUsers({ backupDir, supabase });
    } catch (error) {
      manifest.errors.push({
        surface: 'auth',
        resource: 'users',
        message: error instanceof Error ? error.message : String(error),
      });
    }

    try {
      console.log(
        options.skipStorageDownloads
          ? 'Exporting storage metadata (downloads skipped)'
          : 'Exporting storage metadata and downloadable files'
      );
      manifest.storage = await exportStorage({
        backupDir,
        skipStorageDownloads: options.skipStorageDownloads,
        supabase,
      });
    } catch (error) {
      manifest.errors.push({
        surface: 'storage',
        resource: 'buckets',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  } finally {
    manifest.completedAt = new Date().toISOString();
    writeJson(path.join(backupDir, 'meta', 'manifest.json'), manifest);
  }

  console.log('Backup complete');
  console.log(`Manifest: ${path.join(backupDir, 'meta', 'manifest.json')}`);

  if (manifest.errors.length > 0) {
    console.error(`Backup completed with ${manifest.errors.length} error(s). Check the manifest.`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
