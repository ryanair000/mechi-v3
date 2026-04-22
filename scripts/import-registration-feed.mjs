#!/usr/bin/env node

import bcrypt from 'bcryptjs';
import nextEnv from '@next/env';
import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const { loadEnvConfig } = nextEnv;

loadEnvConfig(process.cwd());

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in the environment.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const PASSWORD_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
const INVITE_CODE_MAX_LENGTH = 24;
const REPORT_PREFIX = 'import-user-credentials';

const COUNTRY_CONFIG = {
  kenya: {
    label: 'Kenya',
    dialCode: '254',
    regions: ['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret', 'Machakos', 'Nyeri', 'Kiambu', 'Other'],
  },
  tanzania: {
    label: 'Tanzania',
    dialCode: '255',
    regions: ['Dar es Salaam', 'Arusha', 'Dodoma', 'Mwanza', 'Mbeya', 'Zanzibar', 'Morogoro', 'Other'],
  },
  uganda: {
    label: 'Uganda',
    dialCode: '256',
    regions: ['Kampala', 'Entebbe', 'Jinja', 'Mbarara', 'Gulu', 'Mbale', 'Arua', 'Other'],
  },
  rwanda: {
    label: 'Rwanda',
    dialCode: '250',
    regions: ['Kigali', 'Huye', 'Musanze', 'Rubavu', 'Rwamagana', 'Other'],
  },
  ethiopia: {
    label: 'Ethiopia',
    dialCode: '251',
    regions: ['Addis Ababa', 'Adama', 'Bahir Dar', 'Hawassa', 'Mekelle', 'Dire Dawa', 'Jimma', 'Other'],
  },
};

const REGION_TO_COUNTRY = new Map(
  Object.entries(COUNTRY_CONFIG).flatMap(([countryKey, config]) =>
    config.regions.map((region) => [region.toLowerCase(), countryKey])
  )
);

const GAME_LABEL_MAP = new Map([
  ['ea fc 26', { gameKey: 'fc26', platform: null }],
  ['efootball 2026', { gameKey: 'efootball', platform: null }],
  ['efootball 2026 mobile', { gameKey: 'efootball', platform: 'mobile' }],
  ['call of duty: mobile', { gameKey: 'codm', platform: 'mobile' }],
  ['call of duty mobile', { gameKey: 'codm', platform: 'mobile' }],
  ['pubg mobile', { gameKey: 'pubgm', platform: 'mobile' }],
  ['free fire', { gameKey: 'freefire', platform: 'mobile' }],
  ['ludo', { gameKey: 'ludo', platform: 'mobile' }],
  ['fortnite', { gameKey: 'fortnite', platform: null }],
  ['rocket league', { gameKey: 'rocketleague', platform: null }],
  ['tekken 8', { gameKey: 'tekken8', platform: null }],
  ['mortal kombat 11', { gameKey: 'mk11', platform: null }],
]);

function printHelp() {
  console.log(`Usage:
  node ./scripts/import-registration-feed.mjs [--file path] [--report path] [--execute]

Behavior:
  - Reads a WhatsApp-style registration feed from stdin by default.
  - Dry-run by default. Pass --execute to write to Supabase.
  - Writes a CSV report with temporary credentials when running with --execute.
`);
}

function parseArgs(argv) {
  const options = {
    execute: false,
    filePath: null,
    reportPath: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--execute') {
      options.execute = true;
      continue;
    }

    if (arg === '--file') {
      options.filePath = argv[index + 1] ?? null;
      index += 1;
      continue;
    }

    if (arg === '--report') {
      options.reportPath = argv[index + 1] ?? null;
      index += 1;
      continue;
    }

    if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

async function readInput(filePath) {
  if (filePath) {
    return fs.readFileSync(path.resolve(process.cwd(), filePath), 'utf8');
  }

  if (process.stdin.isTTY) {
    throw new Error('No input provided. Pipe the registration feed into stdin or pass --file.');
  }

  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks).toString('utf8');
}

function normalizeWhitespace(value) {
  return String(value ?? '')
    .replace(/\u00A0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeEmail(value) {
  return normalizeWhitespace(value).toLowerCase();
}

function normalizeCountryKey(value) {
  const normalized = normalizeWhitespace(value).toLowerCase();

  if (!normalized) {
    return null;
  }

  return (
    Object.keys(COUNTRY_CONFIG).find((countryKey) => {
      const config = COUNTRY_CONFIG[countryKey];
      return normalized === countryKey || normalized === config.label.toLowerCase();
    }) ?? null
  );
}

function normalizeRegion(value) {
  const normalized = normalizeWhitespace(value);

  if (!normalized) {
    return 'Other';
  }

  const match = [...new Set(Object.values(COUNTRY_CONFIG).flatMap((config) => config.regions))].find(
    (region) => region.toLowerCase() === normalized.toLowerCase()
  );

  return match ?? normalized;
}

function resolveLocation(regionValue, locationValue) {
  const directRegion = normalizeRegion(regionValue);
  const location = normalizeWhitespace(locationValue);

  if (location) {
    const [countryPart, regionPart] = location.split(/\s*(?:·|Â·|\||-|:)\s*/);
    const country = normalizeCountryKey(countryPart);
    const region = normalizeRegion(regionPart);

    if (country) {
      return {
        country,
        region: COUNTRY_CONFIG[country].regions.includes(region) ? region : 'Other',
        label: `${COUNTRY_CONFIG[country].label} · ${COUNTRY_CONFIG[country].regions.includes(region) ? region : 'Other'}`,
      };
    }
  }

  const guessedCountry =
    REGION_TO_COUNTRY.get(directRegion.toLowerCase()) ??
    normalizeCountryKey(regionValue) ??
    'kenya';

  const region =
    COUNTRY_CONFIG[guessedCountry].regions.find(
      (candidate) => candidate.toLowerCase() === directRegion.toLowerCase()
    ) ?? 'Other';

  return {
    country: guessedCountry,
    region,
    label: `${COUNTRY_CONFIG[guessedCountry].label} · ${region}`,
  };
}

function normalizePhoneNumber(value, countryKey = 'kenya') {
  const digits = String(value ?? '').replace(/\D/g, '');
  const dialCode = COUNTRY_CONFIG[countryKey]?.dialCode ?? COUNTRY_CONFIG.kenya.dialCode;

  if (!digits) {
    return '';
  }

  if (digits.startsWith(dialCode) && digits.length === dialCode.length + 9) {
    return digits;
  }

  if (digits.startsWith('0') && digits.length === 10) {
    return `${dialCode}${digits.slice(1)}`;
  }

  if (digits.length === 9) {
    return `${dialCode}${digits}`;
  }

  return digits;
}

function getPhoneLookupVariants(value, countryKey = 'kenya') {
  const digits = String(value ?? '').replace(/\D/g, '');
  const normalized = normalizePhoneNumber(value, countryKey);
  const dialCode = COUNTRY_CONFIG[countryKey]?.dialCode ?? COUNTRY_CONFIG.kenya.dialCode;
  const variants = new Set();

  if (value) {
    variants.add(String(value).trim());
  }

  if (digits) {
    variants.add(digits);
  }

  if (normalized) {
    variants.add(normalized);
    variants.add(`+${normalized}`);

    if (normalized.startsWith(dialCode) && normalized.length === dialCode.length + 9) {
      variants.add(`0${normalized.slice(dialCode.length)}`);
    }
  }

  return [...variants].filter(Boolean);
}

function normalizePlan(value) {
  const normalized = normalizeWhitespace(value).toLowerCase();
  if (normalized === 'elite') {
    return 'elite';
  }

  if (normalized === 'free') {
    return 'free';
  }

  return 'pro';
}

function parseGames(value) {
  const selectedGames = [];
  const platforms = new Set();
  const unknownLabels = [];

  for (const label of normalizeWhitespace(value).split(',').map((item) => normalizeWhitespace(item))) {
    if (!label) {
      continue;
    }

    const mapped = GAME_LABEL_MAP.get(label.toLowerCase());
    if (!mapped) {
      unknownLabels.push(label);
      continue;
    }

    if (!selectedGames.includes(mapped.gameKey)) {
      selectedGames.push(mapped.gameKey);
    }

    if (mapped.platform) {
      platforms.add(mapped.platform);
    }
  }

  return {
    selectedGames,
    platforms: [...platforms],
    unknownLabels,
  };
}

function parseTimestamp(headerLine) {
  const match = headerLine.match(/^\[(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})\]/);
  if (!match) {
    throw new Error(`Could not parse timestamp from header: ${headerLine}`);
  }

  const [, day, month, year, hour, minute] = match;
  const utcMs = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour) - 3,
    Number(minute),
    0,
    0
  );

  return new Date(utcMs);
}

function addMonth(date) {
  const next = new Date(date.getTime());
  next.setUTCMonth(next.getUTCMonth() + 1);
  return next;
}

function randomString(length) {
  const bytes = crypto.randomBytes(length);
  let output = '';

  for (let index = 0; output.length < length; index += 1) {
    output += PASSWORD_ALPHABET[bytes[index % bytes.length] % PASSWORD_ALPHABET.length];
  }

  return output;
}

function generateTemporaryPassword() {
  return `Mechi-${randomString(4)}-${randomString(6)}`;
}

function slugifyInviteCode(value) {
  const normalized = normalizeWhitespace(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return (normalized || 'player').slice(0, INVITE_CODE_MAX_LENGTH);
}

function caseFold(value) {
  return normalizeWhitespace(value).toLowerCase();
}

function escapeCsv(value) {
  const normalized = String(value ?? '');
  if (/[",\n]/.test(normalized)) {
    return `"${normalized.replace(/"/g, '""')}"`;
  }
  return normalized;
}

function parseFeed(rawFeed) {
  const sections = rawFeed
    .replace(/\r\n/g, '\n')
    .split(/(?=^\[\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}\] .*New Mechi registration$)/m)
    .map((section) => section.trim())
    .filter(Boolean);

  return sections.map((section, index) => {
    const lines = section
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    const fields = new Map();

    for (const line of lines.slice(1)) {
      const fieldMatch = line.match(/^([^:]+):\s*(.*)$/);
      if (!fieldMatch) {
        continue;
      }
      fields.set(fieldMatch[1], fieldMatch[2]);
    }

    const timestamp = parseTimestamp(lines[0]);
    const username = normalizeWhitespace(fields.get('Username'));
    const email = normalizeEmail(fields.get('Email'));
    const plan = normalizePlan(fields.get('Plan'));
    const { country, region, label } = resolveLocation(fields.get('Region'), fields.get('Location'));
    const phone = normalizePhoneNumber(fields.get('Phone'), country);
    const gameInfo = parseGames(fields.get('Games'));

    if (!username || !email || !phone) {
      throw new Error(`Entry ${index + 1} is missing username, email, or phone.`);
    }

    return {
      index,
      header: lines[0],
      timestamp,
      createdAtIso: timestamp.toISOString(),
      expiresAtIso: addMonth(timestamp).toISOString(),
      originalUsername: fields.get('Username') ?? '',
      username,
      email,
      phone,
      phoneVariants: getPhoneLookupVariants(phone, country),
      country,
      region,
      locationLabel: label,
      plan,
      selectedGames: gameInfo.selectedGames,
      platforms: gameInfo.platforms,
      unknownGameLabels: gameInfo.unknownLabels,
      publicProfileUrl:
        section.match(/Open public profile \((https?:\/\/[^)]+)\)/)?.[1] ?? null,
    };
  });
}

async function resolveInviteCode(baseCode, reservedInviteCodes) {
  const base = slugifyInviteCode(baseCode);

  for (let attempt = 0; attempt < 100; attempt += 1) {
    const suffix = attempt === 0 ? '' : `-${attempt + 1}`;
    const candidate = `${base.slice(0, INVITE_CODE_MAX_LENGTH - suffix.length)}${suffix}`;

    if (reservedInviteCodes.has(candidate)) {
      continue;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('invite_code', candidate)
      .limit(1);

    if (error) {
      throw new Error(`Could not verify invite code uniqueness: ${error.message}`);
    }

    if (!data?.length) {
      reservedInviteCodes.add(candidate);
      return candidate;
    }
  }

  const fallback = `${base.slice(0, Math.max(1, INVITE_CODE_MAX_LENGTH - 7))}-${randomString(6).toLowerCase()}`;
  reservedInviteCodes.add(fallback);
  return fallback;
}

async function resolveUsername(record, reservedCaseFoldedUsernames) {
  const baseUsername = record.username;

  for (let attempt = 0; attempt < 100; attempt += 1) {
    const suffix = attempt === 0 ? '' : `-${attempt + 1}`;
    const candidate = `${baseUsername}${suffix}`;
    const folded = caseFold(candidate);

    if (reservedCaseFoldedUsernames.has(folded)) {
      continue;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, phone')
      .ilike('username', candidate)
      .limit(10);

    if (error) {
      throw new Error(`Could not verify username uniqueness: ${error.message}`);
    }

    if (!data?.length) {
      reservedCaseFoldedUsernames.add(folded);
      return candidate;
    }
  }

  throw new Error(`Could not find a unique username for ${record.username}`);
}

async function findExistingProfile(record) {
  const usernameMatch = await supabase
    .from('profiles')
    .select('id, username, phone, email')
    .ilike('username', record.username)
    .limit(10);

  if (usernameMatch.error) {
    throw new Error(`Could not search by username: ${usernameMatch.error.message}`);
  }

  const phoneMatch = await supabase
    .from('profiles')
    .select('id, username, phone, email')
    .in('phone', record.phoneVariants)
    .limit(10);

  if (phoneMatch.error) {
    throw new Error(`Could not search by phone: ${phoneMatch.error.message}`);
  }

  return {
    usernameMatches: phoneMatch.data
      ? (usernameMatch.data ?? []).filter(
          (row) => !record.phoneVariants.includes(row.phone ?? '')
        )
      : (usernameMatch.data ?? []),
    phoneMatches: phoneMatch.data ?? [],
  };
}

function buildProfileRow(record, username, inviteCode, passwordHash, temporaryPassword) {
  const notes = [];

  if (record.unknownGameLabels.length > 0) {
    notes.push(`Unknown game labels skipped: ${record.unknownGameLabels.join(', ')}`);
  }

  if (record.platforms.length === 0) {
    notes.push('No platform inferred from the feed; user should complete platform and ID details in profile settings.');
  }

  return {
    report: {
      source_username: record.originalUsername,
      username,
      email: record.email,
      phone: record.phone,
      temporary_password: temporaryPassword,
      login_note:
        'Use username or phone with the temporary password, or use magic-link / forgot-password if the email is unique.',
      games: record.selectedGames.join('|'),
      platforms: record.platforms.join('|'),
      location: record.locationLabel,
      public_profile_url: record.publicProfileUrl ?? '',
      notes: notes.join(' '),
    },
    profile: {
      username,
      phone: record.phone,
      email: record.email,
      password_hash: passwordHash,
      country: record.country,
      region: record.region,
      plan: record.plan,
      plan_since: record.plan === 'free' ? null : record.createdAtIso,
      plan_expires_at: record.plan === 'free' ? null : record.expiresAtIso,
      platforms: record.platforms,
      game_ids: {},
      selected_games: record.selectedGames,
      invite_code: inviteCode,
      whatsapp_number: record.phone,
      whatsapp_notifications: false,
      created_at: record.createdAtIso,
    },
    subscription:
      record.plan === 'free'
        ? null
        : {
            plan: record.plan,
            billing_cycle: 'monthly',
            amount_kes: 0,
            status: 'active',
            started_at: record.createdAtIso,
            expires_at: record.expiresAtIso,
            created_at: record.createdAtIso,
          },
  };
}

function buildReportPath(customPath) {
  if (customPath) {
    return path.resolve(process.cwd(), customPath);
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return path.join(process.cwd(), 'output', `${REPORT_PREFIX}-${timestamp}.csv`);
}

function writeReport(reportPath, rows) {
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });

  const headers = [
    'status',
    'source_username',
    'username',
    'email',
    'phone',
    'temporary_password',
    'login_note',
    'games',
    'platforms',
    'location',
    'public_profile_url',
    'notes',
  ];

  const lines = [
    headers.join(','),
    ...rows.map((row) => headers.map((header) => escapeCsv(row[header] ?? '')).join(',')),
  ];

  fs.writeFileSync(reportPath, lines.join('\n'));
}

async function importRecords(records, options) {
  const reportRows = [];
  const reservedInviteCodes = new Set();
  const reservedCaseFoldedUsernames = new Set();
  const summary = {
    dryRun: 0,
    imported: 0,
    skipped: 0,
    failed: 0,
  };

  for (const record of records) {
    let finalUsername = record.username;
    let temporaryPassword = '';

    try {
      const { usernameMatches, phoneMatches } = await findExistingProfile(record);

      if (phoneMatches.length > 1) {
        summary.failed += 1;
        reportRows.push({
          status: 'failed',
          source_username: record.originalUsername,
          username: record.username,
          email: record.email,
          phone: record.phone,
          temporary_password: '',
          login_note: '',
          games: record.selectedGames.join('|'),
          platforms: record.platforms.join('|'),
          location: record.locationLabel,
          public_profile_url: record.publicProfileUrl ?? '',
          notes: `Multiple existing profiles matched the phone number: ${phoneMatches.map((item) => item.username).join(' | ')}`,
        });
        continue;
      }

      if (
        phoneMatches.length === 1 &&
        usernameMatches.length > 0 &&
        usernameMatches.some((item) => item.id !== phoneMatches[0].id)
      ) {
        summary.failed += 1;
        reportRows.push({
          status: 'failed',
          source_username: record.originalUsername,
          username: record.username,
          email: record.email,
          phone: record.phone,
          temporary_password: '',
          login_note: '',
          games: record.selectedGames.join('|'),
          platforms: record.platforms.join('|'),
          location: record.locationLabel,
          public_profile_url: record.publicProfileUrl ?? '',
          notes: `Phone matched ${phoneMatches[0].username}, but username also collided with ${usernameMatches.map((item) => item.username).join(' | ')}`,
        });
        continue;
      }

      if (phoneMatches.length === 1) {
        summary.skipped += 1;
        reportRows.push({
          status: 'skipped-existing',
          source_username: record.originalUsername,
          username: phoneMatches[0].username,
          email: record.email,
          phone: record.phone,
          temporary_password: '',
          login_note: 'Profile already exists in the database.',
          games: record.selectedGames.join('|'),
          platforms: record.platforms.join('|'),
          location: record.locationLabel,
          public_profile_url: record.publicProfileUrl ?? '',
          notes: `Existing profile id ${phoneMatches[0].id}`,
        });
        continue;
      }

      finalUsername = await resolveUsername(record, reservedCaseFoldedUsernames);
      temporaryPassword = generateTemporaryPassword();
      const passwordHash = await bcrypt.hash(temporaryPassword, 12);
      const inviteCode = await resolveInviteCode(finalUsername, reservedInviteCodes);
      const { profile, subscription, report } = buildProfileRow(
        record,
        finalUsername,
        inviteCode,
        passwordHash,
        temporaryPassword
      );

      if (!options.execute) {
        summary.dryRun += 1;
        reportRows.push({
          status: 'dry-run',
          ...report,
        });
        continue;
      }

      const profileInsert = await supabase
        .from('profiles')
        .insert(profile)
        .select('id, username, email, phone')
        .single();

      if (profileInsert.error || !profileInsert.data) {
        throw new Error(profileInsert.error?.message ?? 'Profile insert failed');
      }

      if (subscription) {
        const subscriptionInsert = await supabase
          .from('subscriptions')
          .insert({
            user_id: profileInsert.data.id,
            ...subscription,
          })
          .select('id')
          .single();

        if (subscriptionInsert.error) {
          throw new Error(subscriptionInsert.error.message);
        }
      }

      summary.imported += 1;
      reportRows.push({
        status: 'imported',
        ...report,
      });
    } catch (error) {
      summary.failed += 1;
      reportRows.push({
        status: 'failed',
        source_username: record.originalUsername,
        username: finalUsername,
        email: record.email,
        phone: record.phone,
        temporary_password: temporaryPassword,
        login_note: temporaryPassword
          ? 'A temporary password was generated before the failure. Re-run or repair this profile before sharing it.'
          : '',
        games: record.selectedGames.join('|'),
        platforms: record.platforms.join('|'),
        location: record.locationLabel,
        public_profile_url: record.publicProfileUrl ?? '',
        notes: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return { summary, reportRows };
}

async function verifyImportedUsers(reportRows) {
  const importedRows = reportRows.filter((row) => row.status === 'imported');
  if (importedRows.length === 0) {
    return [];
  }

  const usernames = importedRows.map((row) => row.username);
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, email, phone, created_at')
    .in('username', usernames)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Verification query failed: ${error.message}`);
  }

  return data ?? [];
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const rawFeed = await readInput(options.filePath);
  const records = parseFeed(rawFeed);
  const reportPath = buildReportPath(options.reportPath);
  const { summary, reportRows } = await importRecords(records, options);

  if (options.execute) {
    writeReport(reportPath, reportRows);
  }

  console.log(
    JSON.stringify(
      {
        execute: options.execute,
        parsed: records.length,
        summary,
        reportPath: options.execute ? reportPath : null,
      },
      null,
      2
    )
  );

  if (options.execute) {
    const verified = await verifyImportedUsers(reportRows);
    console.log(
      JSON.stringify(
        {
          verifiedCount: verified.length,
          verifiedUsers: verified,
        },
        null,
        2
      )
    );
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
