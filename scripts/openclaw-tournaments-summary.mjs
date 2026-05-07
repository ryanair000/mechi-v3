#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const DEFAULT_LIMIT = 8;
const DEFAULT_APP_URL = 'https://mechi.club';
const CONFIRMED_PAYMENT_STATUSES = ['paid', 'free'];
const E2E_FIXTURE_PATTERN = /(^|[^a-z0-9])e2e([^a-z0-9]|$)/i;

const GAME_LABELS = {
  fc26: 'EA FC 26',
  efootball: 'eFootball 2026',
  mk11: 'Mortal Kombat 11',
  nba2k26: 'NBA 2K26',
  tekken8: 'Tekken 8',
  sf6: 'Street Fighter 6',
  codm: 'Call of Duty: Mobile',
  pubgm: 'PUBG Mobile',
  cs2: 'CS2',
  valorant: 'Valorant',
  mariokart: 'Mario Kart 8',
  smashbros: 'Super Smash Bros',
  freefire: 'Free Fire',
  ludo: 'Ludo',
  rocketleague: 'Rocket League',
  fortnite: 'Fortnite',
};

const PLATFORM_LABELS = {
  ps: 'PlayStation',
  xbox: 'Xbox',
  pc: 'PC',
  mobile: 'Mobile',
  nintendo: 'Nintendo Switch',
};

function normalizeUrl(value) {
  return String(value || '').replace(/\/+$/, '');
}

function getAppUrl() {
  return normalizeUrl(
    process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXT_PUBLIC_BASE_URL ||
      DEFAULT_APP_URL
  );
}

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

function parseCsv(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function parseArgs(argv) {
  const options = {
    json: false,
    limit: DEFAULT_LIMIT,
    summaryOnly: false,
    statuses: ['open', 'active'],
    game: null,
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
      options.limit = clampInteger(argv[index + 1], DEFAULT_LIMIT, 1, 25);
      index += 1;
      continue;
    }

    if (arg === '--game') {
      options.game = String(argv[index + 1] || '').trim().toLowerCase() || null;
      index += 1;
      continue;
    }

    if (arg === '--statuses') {
      const parsed = parseCsv(argv[index + 1]).filter((status) =>
        ['open', 'full', 'active', 'completed', 'cancelled'].includes(status)
      );
      options.statuses = parsed.length ? parsed : options.statuses;
      index += 1;
      continue;
    }

    if (arg === '--open-only') {
      options.statuses = ['open'];
      continue;
    }

    if (arg === '--active-only') {
      options.statuses = ['active'];
      continue;
    }
  }

  return options;
}

function buildHeaders() {
  return {
    apikey: supabaseServiceRoleKey,
    Authorization: `Bearer ${supabaseServiceRoleKey}`,
  };
}

function inFilter(values) {
  return `in.(${values.join(',')})`;
}

function formatDateTime(iso) {
  if (!iso) {
    return 'Time not locked yet';
  }

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return 'Time not locked yet';
  }

  return new Intl.DateTimeFormat('en-KE', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Africa/Nairobi',
  }).format(date);
}

function isE2ETournamentFixture(record) {
  return E2E_FIXTURE_PATTERN.test(String(record?.title || '')) ||
    E2E_FIXTURE_PATTERN.test(String(record?.slug || ''));
}

function shouldHideE2EFixtures() {
  return process.env.NODE_ENV !== 'test';
}

function formatGame(game) {
  return GAME_LABELS[game] || game || 'Unknown game';
}

function formatPlatform(platform) {
  return platform ? PLATFORM_LABELS[platform] || platform : null;
}

function toNumber(value) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function fetchJson(url, label) {
  const response = await fetch(url, { headers: buildHeaders() });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || `Supabase ${label} query failed with ${response.status}`);
  }

  return response.json();
}

async function getTournaments(options) {
  const url = new URL('/rest/v1/tournaments', supabaseUrl);
  url.searchParams.set(
    'select',
    'id,slug,title,game,platform,entry_fee,prize_pool,size,status,region,scheduled_for,created_at'
  );
  url.searchParams.set('status', inFilter(options.statuses));
  url.searchParams.set('order', 'scheduled_for.asc.nullslast,created_at.desc');
  url.searchParams.set('limit', String(options.limit));

  if (options.game) {
    url.searchParams.set('game', `eq.${options.game}`);
  }

  if (shouldHideE2EFixtures()) {
    url.searchParams.append('title', 'not.ilike.*e2e*');
    url.searchParams.append('slug', 'not.ilike.*e2e*');
  }

  return fetchJson(url, 'tournaments');
}

async function getPlayerCounts(tournamentIds) {
  if (tournamentIds.length === 0) {
    return {};
  }

  const url = new URL('/rest/v1/tournament_players', supabaseUrl);
  url.searchParams.set('select', 'tournament_id,payment_status');
  url.searchParams.set('tournament_id', inFilter(tournamentIds));
  url.searchParams.set('payment_status', inFilter(CONFIRMED_PAYMENT_STATUSES));

  const players = await fetchJson(url, 'tournament players');

  return players.reduce((counts, player) => {
    if (player?.tournament_id) {
      counts[player.tournament_id] = (counts[player.tournament_id] || 0) + 1;
    }
    return counts;
  }, {});
}

function summarizeTournament(row, playerCounts) {
  const entryFee = toNumber(row.entry_fee);
  const prizePool = toNumber(row.prize_pool);
  const platformLabel = formatPlatform(row.platform);

  return {
    id: row.id,
    title: row.title || 'Untitled tournament',
    slug: row.slug,
    url: row.slug ? `${getAppUrl()}/t/${row.slug}` : `${getAppUrl()}/tournaments`,
    game: row.game,
    gameLabel: formatGame(row.game),
    platform: row.platform || null,
    platformLabel,
    entryFee,
    entryFeeLabel: entryFee > 0 ? `KES ${entryFee}` : 'Free',
    prizePool,
    prizePoolLabel: prizePool > 0 ? `KES ${prizePool}` : 'Not announced',
    size: toNumber(row.size),
    playerCount: playerCounts[row.id] || 0,
    status: row.status || 'unknown',
    region: row.region || null,
    scheduledForIso: row.scheduled_for || null,
    scheduledForEat: formatDateTime(row.scheduled_for),
    createdAtIso: row.created_at || null,
  };
}

function formatSummary(summary, options) {
  const lines = [
    `Verified at: ${summary.verifiedAtEat}`,
    `Open registration tournaments: ${summary.counts.open}`,
    `Active/in-progress tournaments: ${summary.counts.active}`,
  ];

  if (summary.tournaments.length === 0) {
    lines.push('No open or active tournaments found right now.');
    return lines.join('\n');
  }

  if (options.summaryOnly) {
    const first = summary.tournaments[0];
    lines.push(
      `Next/first: ${first.title} | ${first.gameLabel} | ${first.status} | ${first.playerCount}/${first.size} players | ${first.entryFeeLabel}`
    );
    return lines.join('\n');
  }

  lines.push('Tournaments:');
  summary.tournaments.forEach((tournament, index) => {
    const platform = tournament.platformLabel ? ` | ${tournament.platformLabel}` : '';
    lines.push(
      `${index + 1}. ${tournament.title} | ${tournament.gameLabel}${platform} | ${tournament.status} | ${tournament.playerCount}/${tournament.size} players | Entry ${tournament.entryFeeLabel} | Start ${tournament.scheduledForEat} | ${tournament.url}`
    );
  });

  return lines.join('\n');
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

let tournamentsRaw;
let playerCounts;

try {
  tournamentsRaw = await getTournaments(options);
  const visibleTournaments = shouldHideE2EFixtures()
    ? tournamentsRaw.filter((tournament) => !isE2ETournamentFixture(tournament))
    : tournamentsRaw;
  playerCounts = await getPlayerCounts(visibleTournaments.map((tournament) => tournament.id));
  tournamentsRaw = visibleTournaments;
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

const tournaments = tournamentsRaw.map((tournament) => summarizeTournament(tournament, playerCounts));
const verifiedAtIso = new Date().toISOString();

const summary = {
  verifiedAtIso,
  verifiedAtEat: formatDateTime(verifiedAtIso),
  statuses: options.statuses,
  filterGame: options.game,
  counts: {
    open: tournaments.filter((tournament) => tournament.status === 'open').length,
    active: tournaments.filter((tournament) => tournament.status === 'active').length,
    total: tournaments.length,
  },
  tournaments,
};

if (options.json) {
  console.log(JSON.stringify(summary, null, 2));
} else {
  console.log(formatSummary(summary, options));
}
