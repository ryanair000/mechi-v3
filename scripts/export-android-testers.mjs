#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const DEFAULT_LIMIT = 100;
const VALID_STATUSES = new Set(['pending', 'invited', 'opted_in', 'active', 'removed', 'all']);
let supabaseUrl = '';
let supabaseServiceRoleKey = '';

function stripWrappingQuotes(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

function normalizeEnvValue(value) {
  return (value ?? '').replace(/\\n/g, '').trim();
}

function loadEnvFromWorkspace(cwd) {
  for (const fileName of ['.env.local', '.env']) {
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
      const value = stripWrappingQuotes(trimmed.slice(separatorIndex + 1).trim());

      if (key && !process.env[key]) {
        process.env[key] = value;
      }
    }
  }
}

function parseArgs(argv) {
  const options = {
    help: false,
    json: false,
    playConsoleCsv: false,
    status: 'pending',
    limit: DEFAULT_LIMIT,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--help' || arg === '-h') {
      options.help = true;
      continue;
    }

    if (arg === '--json') {
      options.json = true;
      continue;
    }

    if (arg === '--play-console-csv' || arg === '--emails') {
      options.playConsoleCsv = true;
      continue;
    }

    if (arg === '--status') {
      const status = String(argv[index + 1] ?? '').trim();
      if (VALID_STATUSES.has(status)) {
        options.status = status;
      }
      index += 1;
      continue;
    }

    if (arg === '--limit') {
      const parsedLimit = Number.parseInt(argv[index + 1] ?? '', 10);
      if (Number.isFinite(parsedLimit)) {
        options.limit = Math.max(1, Math.min(2000, parsedLimit));
      }
      index += 1;
    }
  }

  return options;
}

function getUsage() {
  return [
    'Usage: npm run ops:android-testers -- [options]',
    '',
    'Options:',
    '  --play-console-csv   Print Play Console email upload list, one email per line.',
    '  --emails             Alias for --play-console-csv.',
    '  --json               Print full tester rows as JSON.',
    '  --status <status>    pending, invited, opted_in, active, removed, or all.',
    '  --limit <number>     Limit rows, default 100.',
  ].join('\n');
}

function buildHeaders() {
  return {
    apikey: supabaseServiceRoleKey,
    Authorization: `Bearer ${supabaseServiceRoleKey}`,
  };
}

function formatDateTime(iso) {
  if (!iso) {
    return 'Unknown time';
  }

  return new Intl.DateTimeFormat('en-KE', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Africa/Nairobi',
  }).format(new Date(iso));
}

async function fetchTesterRows(options) {
  const url = new URL('/rest/v1/android_tester_signups', supabaseUrl);
  url.searchParams.set(
    'select',
    'full_name,play_email,whatsapp_number,mechi_username,device_model,android_version,target_track,status,created_at,updated_at'
  );
  url.searchParams.set('order', 'created_at.asc');
  url.searchParams.set('limit', String(options.limit));

  if (options.status !== 'all') {
    url.searchParams.set('status', `eq.${options.status}`);
  }

  const response = await fetch(url, { headers: buildHeaders() });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || `Supabase tester export failed with ${response.status}`);
  }

  return response.json();
}

const options = parseArgs(process.argv.slice(2));

if (options.help) {
  console.log(getUsage());
} else {
  loadEnvFromWorkspace(process.cwd());

  supabaseUrl = normalizeEnvValue(process.env.NEXT_PUBLIC_SUPABASE_URL);
  supabaseServiceRoleKey = normalizeEnvValue(process.env.SUPABASE_SERVICE_ROLE_KEY);

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
    process.exitCode = 1;
  } else {
    try {
      const rows = await fetchTesterRows(options);

      if (options.playConsoleCsv) {
        const uniqueEmails = [...new Set(rows.map((row) => row.play_email).filter(Boolean))];
        console.log(uniqueEmails.join('\n'));
      } else if (options.json) {
        console.log(JSON.stringify({ count: rows.length, status: options.status, testers: rows }, null, 2));
      } else {
        console.log(`Android tester signups: ${rows.length} (${options.status})`);
        rows.slice(0, 20).forEach((row, index) => {
          console.log(
            `${index + 1}. ${row.full_name} | ${row.play_email} | ${row.whatsapp_number} | ${row.device_model} | ${row.status} | ${formatDateTime(row.created_at)}`
          );
        });

        if (rows.length > 20) {
          console.log(`...${rows.length - 20} more`);
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('android_tester_signups') || message.includes('PGRST205')) {
        console.error(
          'Android tester storage is not ready. Apply supabase/migrations/20260504130000_android_tester_signups.sql first.'
        );
      } else {
        console.error(message);
      }
      process.exitCode = 1;
    }
  }
}
