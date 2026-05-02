#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const BETA_PLAYER_CAP = 100;
const DEFAULT_RECENT_LIMIT = 5;
const DEFAULT_WINDOW_HOURS = 24;
const ONLINE_TOURNAMENT_SLUG = 'mechi-club-online-gaming-tournament-2026-05';
const ONLINE_TOURNAMENT_GAMES = [
  { game: 'pubgm', label: 'PUBG Mobile', slots: 100 },
  { game: 'codm', label: 'Call of Duty Mobile', slots: 100 },
  { game: 'efootball', label: 'eFootball', slots: 16, registrationClosed: true },
];
const ONLINE_TOURNAMENT_TOTAL_SLOTS = ONLINE_TOURNAMENT_GAMES.reduce(
  (total, game) => total + game.slots,
  0
);

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
    json: false,
    limit: DEFAULT_RECENT_LIMIT,
    windowHours: DEFAULT_WINDOW_HOURS,
    summaryOnly: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--json') {
      options.json = true;
      continue;
    }

    if (arg === '--summary-only') {
      options.summaryOnly = true;
      continue;
    }

    if (arg === '--limit') {
      options.limit = clampInteger(argv[index + 1], DEFAULT_RECENT_LIMIT, 1, 20);
      index += 1;
      continue;
    }

    if (arg === '--window-hours') {
      options.windowHours = clampInteger(argv[index + 1], DEFAULT_WINDOW_HOURS, 1, 168);
      index += 1;
      continue;
    }
  }

  return options;
}

function formatDateTime(iso) {
  if (!iso) {
    return null;
  }

  return new Intl.DateTimeFormat('en-KE', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Africa/Nairobi',
  }).format(new Date(iso));
}

function formatSummary(summary, options) {
  const lines = [
    `Verified at: ${summary.verifiedAtEat}`,
    `Registered players: ${summary.registeredPlayers}/${summary.betaPlayerCap} (${summary.spotsLeft} spots left)`,
    `New users in last ${summary.windowHours}h: ${summary.newUsersInWindow}`,
    `New users in last 7d: ${summary.newUsers7d}`,
  ];

  if (summary.onlineTournament.storageReady) {
    lines.push(
      `PlayMechi tournament entries: ${summary.onlineTournament.registered}/${summary.onlineTournament.slots} (${summary.onlineTournament.spotsLeft} slots left)`
    );
    summary.onlineTournament.games.forEach((game) => {
      lines.push(
        `- ${game.label}: ${game.registered}/${game.slots} (${game.spotsLeft} left, ${game.verified} verified, ${game.pending} pending)`
      );
    });
  } else {
    lines.push(
      `PlayMechi tournament entries: storage unavailable (${summary.onlineTournament.error})`
    );
  }

  if (summary.latestRegistration) {
    lines.push(
      `Latest registration: ${summary.latestRegistration.username} | ${summary.latestRegistration.plan} | ${summary.latestRegistration.locationLabel} | ${summary.latestRegistration.createdAtEat}`
    );
  } else {
    lines.push('Latest registration: none found');
  }

  if (!options.summaryOnly && summary.recentRegistrations.length > 0) {
    lines.push('Recent registrations:');
    summary.recentRegistrations.forEach((registration, index) => {
      lines.push(
        `${index + 1}. ${registration.username} | ${registration.plan} | ${registration.locationLabel} | ${registration.createdAtEat}`
      );
    });
  }

  return lines.join('\n');
}

function buildHeaders(includeCount = false) {
  const headers = {
    apikey: supabaseServiceRoleKey,
    Authorization: `Bearer ${supabaseServiceRoleKey}`,
  };

  if (includeCount) {
    headers.Prefer = 'count=exact';
  }

  return headers;
}

async function getCount(filters = {}) {
  const url = new URL('/rest/v1/profiles', supabaseUrl);
  url.searchParams.set('select', 'id');

  for (const [key, value] of Object.entries(filters)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url, {
    method: 'HEAD',
    headers: buildHeaders(true),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || `Supabase count query failed with ${response.status}`);
  }

  const contentRange = response.headers.get('content-range') ?? '';
  const rawCount = contentRange.split('/').pop() ?? '';
  const count = Number.parseInt(rawCount, 10);

  if (!Number.isFinite(count)) {
    throw new Error(`Supabase count query returned an unreadable content-range header: ${contentRange}`);
  }

  return count;
}

async function getRecentRegistrations(limit) {
  const url = new URL('/rest/v1/profiles', supabaseUrl);
  url.searchParams.set('select', 'username,country,region,plan,created_at');
  url.searchParams.set('order', 'created_at.desc');
  url.searchParams.set('limit', String(limit));

  const response = await fetch(url, {
    headers: buildHeaders(false),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || `Supabase recent registrations query failed with ${response.status}`);
  }

  return response.json();
}

async function getOnlineTournamentSummary() {
  const url = new URL('/rest/v1/online_tournament_registrations', supabaseUrl);
  url.searchParams.set(
    'select',
    'game,eligibility_status,reward_eligible,check_in_status,created_at'
  );
  url.searchParams.set('event_slug', `eq.${ONLINE_TOURNAMENT_SLUG}`);
  url.searchParams.set('order', 'created_at.asc');

  const response = await fetch(url, {
    headers: buildHeaders(false),
  });

  if (!response.ok) {
    const body = await response.text();
    let errorMessage = body || `Supabase online tournament query failed with ${response.status}`;

    try {
      const parsed = JSON.parse(body);
      errorMessage = parsed.message || errorMessage;
    } catch {
      // Keep the raw response text when Supabase does not return JSON.
    }

    const games = ONLINE_TOURNAMENT_GAMES.map((game) => ({
      ...game,
      registered: 0,
      verified: 0,
      pending: 0,
      spotsLeft: game.registrationClosed ? 0 : game.slots,
    }));

    return {
      storageReady: false,
      slug: ONLINE_TOURNAMENT_SLUG,
      slots: ONLINE_TOURNAMENT_TOTAL_SLOTS,
      registered: 0,
      spotsLeft: games.reduce((total, game) => total + game.spotsLeft, 0),
      error: errorMessage,
      games,
    };
  }

  const rows = await response.json();
  const games = ONLINE_TOURNAMENT_GAMES.map((game) => {
    const gameRows = rows.filter(
      (row) => row.game === game.game && row.eligibility_status !== 'disqualified'
    );

    return {
      ...game,
      registered: gameRows.length,
      verified: gameRows.filter((row) => row.eligibility_status === 'verified').length,
      pending: gameRows.filter((row) => row.eligibility_status === 'pending').length,
      spotsLeft: game.registrationClosed ? 0 : Math.max(0, game.slots - gameRows.length),
    };
  });
  const registered = games.reduce((total, game) => total + game.registered, 0);
  const spotsLeft = games.reduce((total, game) => total + game.spotsLeft, 0);

  return {
    storageReady: true,
    slug: ONLINE_TOURNAMENT_SLUG,
    slots: ONLINE_TOURNAMENT_TOTAL_SLOTS,
    registered,
    spotsLeft,
    games,
  };
}

const options = parseArgs(process.argv.slice(2));
loadEnvFromWorkspace(process.cwd());
const supabaseUrl = normalizeEnvValue(process.env.NEXT_PUBLIC_SUPABASE_URL);
const supabaseServiceRoleKey = normalizeEnvValue(process.env.SUPABASE_SERVICE_ROLE_KEY);

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error(
    'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Load them via the host environment or workspace .env.local before running this helper.'
  );
  process.exit(1);
}

const sinceWindow = new Date(Date.now() - options.windowHours * 60 * 60 * 1000).toISOString();
const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

let totalProfiles;
let bannedProfiles;
let newUsersInWindow;
let newUsers7d;
let recentRegistrationsRaw;
let onlineTournament;

try {
  [
    totalProfiles,
    bannedProfiles,
    newUsersInWindow,
    newUsers7d,
    recentRegistrationsRaw,
    onlineTournament,
  ] =
    await Promise.all([
      getCount(),
      getCount({ is_banned: 'eq.true' }),
      getCount({ created_at: `gte.${sinceWindow}` }),
      getCount({ created_at: `gte.${since7d}` }),
      getRecentRegistrations(options.limit),
      getOnlineTournamentSummary(),
    ]);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

const registeredPlayers = Math.max(0, totalProfiles - bannedProfiles);
const spotsLeft = Math.max(0, BETA_PLAYER_CAP - registeredPlayers);
const recentRegistrations = (recentRegistrationsRaw ?? []).map((registration) => {
  const country = registration.country?.trim() || null;
  const region = registration.region?.trim() || null;
  const locationLabel =
    country && region ? `${country} / ${region}` : country ?? region ?? 'Location not set';

  return {
    username: registration.username,
    plan: registration.plan ?? 'free',
    country,
    region,
    locationLabel,
    createdAtIso: registration.created_at,
    createdAtEat: formatDateTime(registration.created_at),
  };
});

const latestRegistration = recentRegistrations[0] ?? null;
const verifiedAtIso = new Date().toISOString();

const summary = {
  verifiedAtIso,
  verifiedAtEat: formatDateTime(verifiedAtIso),
  betaPlayerCap: BETA_PLAYER_CAP,
  totalProfiles,
  bannedProfiles,
  registeredPlayers,
  spotsLeft,
  windowHours: options.windowHours,
  newUsersInWindow,
  newUsers7d,
  onlineTournament,
  latestRegistration,
  recentRegistrations,
};

if (options.json) {
  console.log(JSON.stringify(summary, null, 2));
} else {
  console.log(formatSummary(summary, options));
}
