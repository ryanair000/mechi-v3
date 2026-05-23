#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const DEFAULT_CHAT_ID = '6806783421';
const DEFAULT_APP_URL = 'https://mechi.club';
const DEFAULT_WINDOW_HOURS = 24;
const DEFAULT_RECENT_LIMIT = 5;
const BETA_PLAYER_CAP = 100;
const WEEKEND_CUP_SLUG = 'playmechi-weekend-cup-season-1-2026-05-29';
const SEASON_2_BALLOT_SLUG = 'weekend-cup-2-pc';
const WEEKEND_CUP_GAMES = [
  { game: 'pubgm', label: 'PUBG Mobile', slots: 80, checkInCap: 80, breakEvenKes: 2750, phase2FeeKes: 75 },
  { game: 'codm', label: 'CODM', slots: 80, checkInCap: 80, breakEvenKes: 2750, phase2FeeKes: 75 },
  { game: 'efootball', label: 'eFootball', slots: 16, checkInCap: 16, breakEvenKes: 1500, phase2FeeKes: 125 },
  { game: 'freefire', label: 'Free Fire', slots: 80, checkInCap: 80, breakEvenKes: 2500, phase2FeeKes: 75 },
];
const TELEGRAM_LIMIT = 3900;

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
  for (const fileName of ['.env.local', '.env']) {
    const filePath = path.join(cwd, fileName);
    if (!fs.existsSync(filePath)) continue;

    const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;

      const separatorIndex = trimmed.indexOf('=');
      const key = trimmed.slice(0, separatorIndex).trim();
      const rawValue = trimmed.slice(separatorIndex + 1).trim();
      if (!key || process.env[key]) continue;

      process.env[key] = stripWrappingQuotes(rawValue);
    }
  }
}

function normalizeEnvValue(value) {
  return (value ?? '').replace(/\\n/g, '').trim();
}

function envFirst(keys, fallback = '') {
  for (const key of keys) {
    const value = normalizeEnvValue(process.env[key]);
    if (value) return value;
  }
  return fallback;
}

function clampInteger(value, fallback, minimum, maximum) {
  const parsed = Number.parseInt(value ?? '', 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(maximum, Math.max(minimum, parsed));
}

function parseArgs(argv) {
  const options = {
    send: false,
    json: false,
    windowHours: DEFAULT_WINDOW_HOURS,
    recentLimit: DEFAULT_RECENT_LIMIT,
    chatId: '',
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--send') {
      options.send = true;
      continue;
    }
    if (arg === '--json') {
      options.json = true;
      continue;
    }
    if (arg === '--chat-id') {
      options.chatId = String(argv[index + 1] || '').trim();
      index += 1;
      continue;
    }
    if (arg === '--window-hours') {
      options.windowHours = clampInteger(argv[index + 1], DEFAULT_WINDOW_HOURS, 1, 168);
      index += 1;
      continue;
    }
    if (arg === '--recent-limit') {
      options.recentLimit = clampInteger(argv[index + 1], DEFAULT_RECENT_LIMIT, 1, 15);
      index += 1;
      continue;
    }
  }

  return options;
}

function formatDateTime(iso) {
  if (!iso) return 'Not available';

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Not available';

  return new Intl.DateTimeFormat('en-KE', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Africa/Nairobi',
  }).format(date);
}

function formatShortDateTime(iso) {
  if (!iso) return 'n/a';

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'n/a';

  return new Intl.DateTimeFormat('en-KE', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Africa/Nairobi',
  }).format(date);
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

function inFilter(values) {
  return `in.(${values.join(',')})`;
}

async function fetchJson(url, label) {
  const response = await fetch(url, { headers: buildHeaders() });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || `Supabase ${label} query failed with ${response.status}`);
  }
  return response.json();
}

async function getCount(table, filters = {}) {
  const url = new URL(`/rest/v1/${table}`, supabaseUrl);
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
    throw new Error(body || `Supabase ${table} count query failed with ${response.status}`);
  }

  const contentRange = response.headers.get('content-range') ?? '';
  const rawCount = contentRange.split('/').pop() ?? '';
  const count = Number.parseInt(rawCount, 10);
  if (!Number.isFinite(count)) {
    throw new Error(`Supabase ${table} count returned unreadable content-range: ${contentRange}`);
  }

  return count;
}

async function getProfileSummary(options) {
  const sinceWindow = new Date(Date.now() - options.windowHours * 60 * 60 * 1000).toISOString();
  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const recentUrl = new URL('/rest/v1/profiles', supabaseUrl);
  recentUrl.searchParams.set('select', 'username,country,region,plan,created_at');
  recentUrl.searchParams.set('order', 'created_at.desc');
  recentUrl.searchParams.set('limit', String(options.recentLimit));

  const [totalProfiles, bannedProfiles, newUsersInWindow, newUsers7d, recentRaw] =
    await Promise.all([
      getCount('profiles'),
      getCount('profiles', { is_banned: 'eq.true' }),
      getCount('profiles', { created_at: `gte.${sinceWindow}` }),
      getCount('profiles', { created_at: `gte.${since7d}` }),
      fetchJson(recentUrl, 'recent profiles'),
    ]);

  const recent = (recentRaw ?? []).map((profile) => {
    const country = String(profile.country || '').trim();
    const region = String(profile.region || '').trim();
    return {
      username: profile.username || 'unknown',
      plan: profile.plan || 'free',
      locationLabel: country && region ? `${country}/${region}` : country || region || 'location n/a',
      createdAtIso: profile.created_at,
      createdAtEat: formatShortDateTime(profile.created_at),
    };
  });

  const registeredPlayers = Math.max(0, totalProfiles - bannedProfiles);
  return {
    totalProfiles,
    bannedProfiles,
    registeredPlayers,
    betaPlayerCap: BETA_PLAYER_CAP,
    betaSpotsLeft: Math.max(0, BETA_PLAYER_CAP - registeredPlayers),
    windowHours: options.windowHours,
    newUsersInWindow,
    newUsers7d,
    latestRegistration: recent[0] ?? null,
    recent,
  };
}

async function getWeekendCupSummary() {
  const url = new URL('/rest/v1/online_tournament_registrations', supabaseUrl);
  url.searchParams.set(
    'select',
    'game,payment_status,entry_fee_kes,eligibility_status,check_in_status,created_at'
  );
  url.searchParams.set('event_slug', `eq.${WEEKEND_CUP_SLUG}`);
  url.searchParams.set('order', 'created_at.desc');

  const rows = await fetchJson(url, 'Weekend Cup registrations');
  const byGame = Object.fromEntries(
    WEEKEND_CUP_GAMES.map((game) => [
      game.game,
      {
        ...game,
        registered: 0,
        confirmed: 0,
        pendingPayment: 0,
        checkedIn: 0,
        revenueKes: 0,
        breakEvenKes: game.breakEvenKes,
        phase2FeeKes: game.phase2FeeKes,
        breakEvenShortfallKes: game.breakEvenKes,
        breakEvenNeededPayments: Math.ceil(game.breakEvenKes / game.phase2FeeKes),
        spotsLeft: game.slots,
        checkInSpotsLeft: game.checkInCap,
      },
    ])
  );

  for (const row of rows ?? []) {
    if (row.eligibility_status === 'disqualified') continue;
    const game = byGame[row.game];
    if (!game) continue;

    game.registered += 1;
    if (row.payment_status === 'paid') {
      game.confirmed += 1;
      game.revenueKes += Number(row.entry_fee_kes ?? 0);
    }
    if (row.payment_status === 'pending_payment' || row.payment_status === 'manual_review') {
      game.pendingPayment += 1;
    }
    if (row.payment_status === 'paid' && row.check_in_status === 'checked_in') {
      game.checkedIn += 1;
    }
  }

  for (const game of Object.values(byGame)) {
    game.spotsLeft = Math.max(0, game.slots - game.confirmed);
    game.checkInSpotsLeft = Math.max(0, game.checkInCap - game.checkedIn);
    game.breakEvenShortfallKes = Math.max(0, game.breakEvenKes - game.revenueKes);
    game.breakEvenNeededPayments = Math.ceil(game.breakEvenShortfallKes / Math.max(1, game.phase2FeeKes));
  }

  const games = WEEKEND_CUP_GAMES.map((game) => byGame[game.game]);
  return {
    registered: games.reduce((total, game) => total + game.registered, 0),
    confirmed: games.reduce((total, game) => total + game.confirmed, 0),
    pendingPayment: games.reduce((total, game) => total + game.pendingPayment, 0),
    checkedIn: games.reduce((total, game) => total + game.checkedIn, 0),
    spotsLeft: games.reduce((total, game) => total + game.spotsLeft, 0),
    latestAtEat: rows?.[0]?.created_at ? formatShortDateTime(rows[0].created_at) : null,
    games,
  };
}

async function getSeason2VoteSummary() {
  const ballotUrl = new URL('/rest/v1/weekend_cup_ballots', supabaseUrl);
  ballotUrl.searchParams.set('select', 'id,title,slug,status');
  ballotUrl.searchParams.set('slug', `eq.${SEASON_2_BALLOT_SLUG}`);
  ballotUrl.searchParams.set('limit', '1');

  const [ballot] = await fetchJson(ballotUrl, 'Season 2 ballot');
  if (!ballot?.id) {
    return {
      title: 'Season 2 Weekend Cup games',
      totalVotes: 0,
      options: [],
      error: 'ballot not found',
    };
  }

  const optionsUrl = new URL('/rest/v1/weekend_cup_ballot_options', supabaseUrl);
  optionsUrl.searchParams.set('select', 'id,label,slug,is_official');
  optionsUrl.searchParams.set('ballot_id', `eq.${ballot.id}`);
  optionsUrl.searchParams.set('order', 'created_at.asc');

  const votesUrl = new URL('/rest/v1/weekend_cup_ballot_votes', supabaseUrl);
  votesUrl.searchParams.set('select', 'ballot_option_id');
  votesUrl.searchParams.set('ballot_id', `eq.${ballot.id}`);

  const [options, votes] = await Promise.all([
    fetchJson(optionsUrl, 'Season 2 ballot options'),
    fetchJson(votesUrl, 'Season 2 ballot votes'),
  ]);

  const countByOption = new Map();
  for (const vote of votes ?? []) {
    countByOption.set(vote.ballot_option_id, (countByOption.get(vote.ballot_option_id) ?? 0) + 1);
  }

  const summarizedOptions = (options ?? [])
    .map((option) => ({
      label: option.label || option.slug || 'Untitled',
      votes: countByOption.get(option.id) ?? 0,
      official: Boolean(option.is_official),
    }))
    .sort((a, b) => b.votes - a.votes || a.label.localeCompare(b.label));

  return {
    title: ballot.title || 'Season 2 Weekend Cup games',
    status: ballot.status || 'unknown',
    totalVotes: votes?.length ?? 0,
    options: summarizedOptions,
  };
}

async function getTournamentSummary() {
  const tournamentsUrl = new URL('/rest/v1/tournaments', supabaseUrl);
  tournamentsUrl.searchParams.set(
    'select',
    'id,slug,title,game,platform,entry_fee,prize_pool,size,status,scheduled_for,created_at'
  );
  tournamentsUrl.searchParams.set('status', inFilter(['open', 'active']));
  tournamentsUrl.searchParams.set('order', 'scheduled_for.asc.nullslast,created_at.desc');
  tournamentsUrl.searchParams.set('limit', '8');
  tournamentsUrl.searchParams.append('title', 'not.ilike.*e2e*');
  tournamentsUrl.searchParams.append('slug', 'not.ilike.*e2e*');

  const tournaments = await fetchJson(tournamentsUrl, 'open tournaments');
  const ids = (tournaments ?? []).map((tournament) => tournament.id).filter(Boolean);
  let playerCounts = {};

  if (ids.length > 0) {
    const playersUrl = new URL('/rest/v1/tournament_players', supabaseUrl);
    playersUrl.searchParams.set('select', 'tournament_id,payment_status');
    playersUrl.searchParams.set('tournament_id', inFilter(ids));
    playersUrl.searchParams.set('payment_status', inFilter(['paid', 'free']));
    const players = await fetchJson(playersUrl, 'tournament players');
    playerCounts = (players ?? []).reduce((counts, player) => {
      if (player.tournament_id) {
        counts[player.tournament_id] = (counts[player.tournament_id] ?? 0) + 1;
      }
      return counts;
    }, {});
  }

  return {
    open: (tournaments ?? []).filter((tournament) => tournament.status === 'open').length,
    active: (tournaments ?? []).filter((tournament) => tournament.status === 'active').length,
    tournaments: (tournaments ?? []).map((tournament) => ({
      title: tournament.title || 'Untitled tournament',
      game: tournament.game || 'game n/a',
      platform: tournament.platform || null,
      status: tournament.status || 'unknown',
      playerCount: playerCounts[tournament.id] ?? 0,
      size: Number(tournament.size ?? 0),
      scheduledForEat: formatShortDateTime(tournament.scheduled_for),
    })),
  };
}

function formatReport(report) {
  const lines = [
    'MECHI DAILY REPORT',
    `10:00 PM EAT | ${report.verifiedAtEat}`,
    '',
    'Players',
    `- Registered: ${report.profiles.registeredPlayers}/${report.profiles.betaPlayerCap} (${report.profiles.betaSpotsLeft} beta spots left)`,
    `- New users: ${report.profiles.newUsersInWindow} in ${report.profiles.windowHours}h, ${report.profiles.newUsers7d} in 7d`,
  ];

  if (report.profiles.latestRegistration) {
    lines.push(
      `- Latest: ${report.profiles.latestRegistration.username} (${report.profiles.latestRegistration.plan}, ${report.profiles.latestRegistration.createdAtEat})`
    );
  }

  lines.push(
    '',
    'Weekend Cup S1',
    `- Registrations: ${report.weekendCup.registered} total, ${report.weekendCup.confirmed} paid, ${report.weekendCup.pendingPayment} pending`,
    `- Confirmed spots left: ${report.weekendCup.spotsLeft}`,
    '- Break-even needed at Phase 2 price:',
  );
  for (const game of report.weekendCup.games) {
    lines.push(
      `  ${game.label}: ${game.breakEvenNeededPayments} more paid (short KSh ${game.breakEvenShortfallKes.toLocaleString('en-KE')})`
    );
  }
  if (report.weekendCup.latestAtEat) {
    lines.push(`- Latest entry: ${report.weekendCup.latestAtEat}`);
  }
  for (const game of report.weekendCup.games) {
    lines.push(
      `- ${game.label}: ${game.confirmed}/${game.slots} paid, ${game.pendingPayment} pending, ${game.registered} total`
    );
  }

  lines.push('', 'Season 2 Weekend Cup Vote');
  if (report.season2Vote.error) {
    lines.push(`- ${report.season2Vote.error}`);
  } else {
    lines.push(`- Total votes: ${report.season2Vote.totalVotes}`);
    const topOptions = report.season2Vote.options.slice(0, 5);
    if (topOptions.length === 0) {
      lines.push('- No vote options found');
    } else {
      topOptions.forEach((option, index) => {
        lines.push(`${index + 1}. ${option.label}: ${option.votes}`);
      });
    }
  }

  lines.push(
    '',
    'Open/Active Tournaments',
    `- Open: ${report.tournaments.open}, active: ${report.tournaments.active}`
  );
  if (report.tournaments.tournaments.length === 0) {
    lines.push('- None found');
  } else {
    report.tournaments.tournaments.slice(0, 4).forEach((tournament, index) => {
      const platform = tournament.platform ? `/${tournament.platform}` : '';
      lines.push(
        `${index + 1}. ${tournament.title}: ${tournament.status}, ${tournament.game}${platform}, ${tournament.playerCount}/${tournament.size}, ${tournament.scheduledForEat}`
      );
    });
  }

  lines.push('', `Links: ${appUrl}/weekendcup | ${appUrl}/admin`);

  const text = lines.join('\n');
  if (text.length <= TELEGRAM_LIMIT) return text;
  return `${text.slice(0, TELEGRAM_LIMIT - 40).trimEnd()}\n\n[truncated]`;
}

async function sendTelegramMessage(text, options) {
  const token = envFirst(['TELEGRAM_BOT_TOKEN', 'OPENCLAW_TELEGRAM_BOT_TOKEN']);
  const chatId =
    options.chatId ||
    envFirst(['MECHI_DAILY_REPORT_CHAT_ID', 'TELEGRAM_BOSS_CHAT_ID', 'MECHI_SOCIAL_NOTIFY_CHAT_ID'], DEFAULT_CHAT_ID);

  if (!token) {
    throw new Error('Missing TELEGRAM_BOT_TOKEN or OPENCLAW_TELEGRAM_BOT_TOKEN');
  }

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      disable_web_page_preview: true,
    }),
  });

  const body = await response.text();
  if (!response.ok) {
    throw new Error(body || `Telegram sendMessage failed with ${response.status}`);
  }

  return JSON.parse(body);
}

async function buildReport(options) {
  const verifiedAtIso = new Date().toISOString();
  const [profiles, weekendCup, season2Vote, tournaments] = await Promise.all([
    getProfileSummary(options),
    getWeekendCupSummary(),
    getSeason2VoteSummary(),
    getTournamentSummary(),
  ]);

  return {
    verifiedAtIso,
    verifiedAtEat: formatDateTime(verifiedAtIso),
    profiles,
    weekendCup,
    season2Vote,
    tournaments,
  };
}

const options = parseArgs(process.argv.slice(2));
loadEnvFromWorkspace(process.cwd());

const supabaseUrl = normalizeEnvValue(process.env.NEXT_PUBLIC_SUPABASE_URL);
const supabaseServiceRoleKey = normalizeEnvValue(process.env.SUPABASE_SERVICE_ROLE_KEY);
const appUrl = envFirst(['NEXT_PUBLIC_APP_URL', 'NEXT_PUBLIC_BASE_URL'], DEFAULT_APP_URL).replace(/\/+$/, '');

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error(
    'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Load them via the host environment or workspace .env.local before running this helper.'
  );
  process.exit(1);
}

try {
  const report = await buildReport(options);
  const text = formatReport(report);

  if (options.json) {
    console.log(JSON.stringify({ ok: true, report, text }, null, 2));
  } else {
    console.log(text);
  }

  if (options.send) {
    const telegram = await sendTelegramMessage(text, options);
    if (!options.json) {
      console.log(`\nTelegram sent: message_id=${telegram.result?.message_id ?? 'unknown'}`);
    }
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
