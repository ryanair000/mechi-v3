#!/usr/bin/env node

import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';

const TOURNAMENT_SLUG = 'mechi-club-online-gaming-tournament-2026-05';
const CANVAS_WIDTH = 1800;
const CANVAS_HEIGHT = 1940;
const DEFAULT_OUTPUT_BASENAME = 'playmechi-efootball-fixture-list-live';
const BRACKET_SEED_ORDER = [1, 16, 8, 9, 4, 13, 5, 12, 2, 15, 7, 10, 3, 14, 6, 11];

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

      process.env[key] = stripWrappingQuotes(rawValue).replace(/\\n/g, '').trim();
    }
  }
}

function normalizeEnvValue(value) {
  return String(value ?? '').replace(/\\n/g, '').trim();
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatKenyanPhone(raw) {
  const digits = String(raw ?? '').replace(/\D/g, '');
  if (!digits) {
    return 'Not provided';
  }

  let normalized = digits;
  if (normalized.startsWith('0')) {
    normalized = `254${normalized.slice(1)}`;
  }

  if (normalized.startsWith('254') && normalized.length === 12) {
    return `+254 ${normalized.slice(3, 6)} ${normalized.slice(6, 9)} ${normalized.slice(9)}`;
  }

  return `+${normalized}`;
}

function formatEatDate(value) {
  return new Intl.DateTimeFormat('en-KE', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Africa/Nairobi',
  }).format(new Date(value));
}

async function querySupabase({ supabaseUrl, serviceRoleKey, table, select, params = {} }) {
  const url = new URL(`/rest/v1/${table}`, supabaseUrl);
  url.searchParams.set('select', select);

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url, {
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`${table} query failed with ${response.status}: ${body}`);
  }

  return response.json();
}

function getProfileUsername(row) {
  return row.user?.username?.trim() || row.in_game_username?.trim() || 'Player';
}

function getWhatsappNumber(row) {
  return row.whatsapp_number?.trim() || row.phone?.trim() || row.user?.phone?.trim() || '';
}

function buildPlayerSeeds(registrations) {
  return registrations
    .filter(
      (row) =>
        row.game === 'efootball' &&
        row.check_in_status === 'checked_in' &&
        row.eligibility_status !== 'disqualified'
    )
    .sort((left, right) => new Date(left.created_at).getTime() - new Date(right.created_at).getTime())
    .slice(0, 16)
    .map((row, index) => ({
      id: row.id,
      seed: index + 1,
      ign: row.in_game_username?.trim() || getProfileUsername(row),
      whatsapp: formatKenyanPhone(getWhatsappNumber(row)),
    }));
}

function seedPlayersIntoSlots(players) {
  const slots = Array.from({ length: 16 }, () => null);

  players.forEach((player, index) => {
    const bracketSlot = BRACKET_SEED_ORDER[index];
    if (bracketSlot) {
      slots[bracketSlot - 1] = player;
    }
  });

  return slots;
}

function buildFixtures(players) {
  const slots = seedPlayersIntoSlots(players);

  return Array.from({ length: 8 }, (_, index) => {
    const player1 = slots[index * 2];
    const player2 = slots[index * 2 + 1];

    return {
      label: `R16-${index + 1}`,
      player1,
      player2,
    };
  });
}

function playerRow(player, x, rowY, accent, roleLabel) {
  if (!player) {
    return `
      <text x="${x}" y="${rowY - 6}" font-size="18" font-weight="900" letter-spacing="1.8" fill="rgba(255,255,255,0.68)">${roleLabel}</text>
      <text x="${x}" y="${rowY + 26}" font-size="42" font-weight="900" fill="#ffffff">BYE</text>
      <text x="${x}" y="${rowY + 62}" font-size="24" font-weight="700" fill="#ffd98b">Auto-advance lane</text>
    `;
  }

  return `
    <text x="${x}" y="${rowY - 6}" font-size="18" font-weight="900" letter-spacing="1.8" fill="rgba(255,255,255,0.68)">${roleLabel}</text>
    <text x="${x}" y="${rowY + 26}" font-size="36" font-weight="900" fill="#ffffff">${escapeHtml(player.ign)}</text>
    <text x="${x}" y="${rowY + 62}" font-size="24" font-weight="700" fill="${accent}">Seed ${String(player.seed).padStart(2, '0')} | ${escapeHtml(player.whatsapp)}</text>
  `;
}

function renderFixtureCard(fixture, x, y, width) {
  const innerWidth = width - 40;
  return `
    <g>
      <rect x="${x}" y="${y}" width="${width}" height="320" rx="28" fill="rgba(8, 22, 40, 0.92)" stroke="rgba(96, 198, 255, 0.18)" stroke-width="2" />
      <rect x="${x + 20}" y="${y + 18}" width="170" height="42" rx="20" fill="rgba(57, 193, 255, 0.18)" />
      <text x="${x + 50}" y="${y + 47}" font-size="28" font-weight="900" letter-spacing="1.4" fill="#dff6ff">${fixture.label}</text>

      <rect x="${x + 20}" y="${y + 82}" width="${innerWidth}" height="92" rx="20" fill="rgba(12, 37, 62, 0.95)" />
      ${playerRow(fixture.player1, x + 42, y + 122, '#7ad9ff', 'PLAYER')}

      <rect x="${x + 20}" y="${y + 194}" width="${innerWidth}" height="92" rx="20" fill="rgba(22, 28, 40, 0.95)" />
      ${playerRow(fixture.player2, x + 42, y + 234, '#ffd98b', 'OPPONENT')}
    </g>
  `;
}

function buildSvg({ fixtures, totals, verifiedAtEat, fixturesTablePresent }) {
  const leftX = 54;
  const rightX = 922;
  const cardWidth = 824;
  const rowYs = [270, 612, 954, 1296];

  const fixtureCards = fixtures
    .map((fixture, index) => {
      const columnX = index < 4 ? leftX : rightX;
      const y = rowYs[index % 4];
      return renderFixtureCard(fixture, columnX, y, cardWidth);
    })
    .join('');

  const footerNote = fixturesTablePresent
    ? 'Live fixtures table exists, but this export is showing the readable seeded list version.'
    : 'No live online_tournament_fixtures table was detected, so this is a seeded fixture preview from checked-in players.';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" viewBox="0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}" style="font-family: 'Segoe UI', 'Trebuchet MS', Arial, sans-serif;" text-rendering="geometricPrecision">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#091321" />
        <stop offset="60%" stop-color="#0d1d33" />
        <stop offset="100%" stop-color="#07101c" />
      </linearGradient>
      <linearGradient id="glow" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="rgba(63, 194, 255, 0.28)" />
        <stop offset="100%" stop-color="rgba(255, 211, 92, 0.12)" />
      </linearGradient>
      <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
        <path d="M 48 0 L 0 0 0 48" fill="none" stroke="rgba(255,255,255,0.035)" stroke-width="1" />
      </pattern>
    </defs>

    <rect width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" fill="url(#bg)" />
    <rect width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" fill="url(#grid)" />
    <circle cx="1510" cy="260" r="320" fill="rgba(255, 212, 92, 0.10)" />
    <circle cx="260" cy="2300" r="380" fill="rgba(63, 194, 255, 0.10)" />
    <rect x="26" y="26" width="${CANVAS_WIDTH - 52}" height="${CANVAS_HEIGHT - 52}" rx="36" fill="none" stroke="rgba(132, 202, 255, 0.18)" stroke-width="2" />

    <text x="900" y="98" text-anchor="middle" font-size="84" font-weight="900" font-family="Georgia, Cambria, serif" fill="#f8fbff">PLAYMECHI FIXTURE LIST</text>
    <text x="900" y="146" text-anchor="middle" font-size="34" font-weight="800" fill="#81ceff">eFootball | Large-print operator view</text>
    <text x="900" y="192" text-anchor="middle" font-size="30" font-weight="800" fill="#f0f7ff">Live Supabase snapshot | ${escapeHtml(verifiedAtEat)}</text>
    <text x="900" y="230" text-anchor="middle" font-size="28" font-weight="700" fill="#dbeafe">${totals.totalRegistrations} registered | ${totals.checkedIn} checked in | ${totals.pending} not checked in</text>

    ${fixtureCards}

    <g>
      <rect x="54" y="1654" width="1692" height="180" rx="28" fill="rgba(5, 11, 20, 0.92)" stroke="rgba(96, 198, 255, 0.12)" stroke-width="2" />
      <text x="92" y="1716" font-size="28" font-weight="900" fill="#f8fbff">DATABASE NOTE</text>
      <text x="92" y="1762" font-size="24" font-weight="700" fill="#8fd6ff">Source: public.online_tournament_registrations</text>
      <text x="92" y="1806" font-size="24" font-weight="700" fill="#dbeafe">${escapeHtml(footerNote)}</text>
    </g>
  </svg>`;
}

async function main() {
  loadEnvFromWorkspace(process.cwd());

  const supabaseUrl = normalizeEnvValue(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const serviceRoleKey = normalizeEnvValue(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }

  const registrations = await querySupabase({
    supabaseUrl,
    serviceRoleKey,
    table: 'online_tournament_registrations',
    select:
      'id,user_id,game,in_game_username,phone,whatsapp_number,check_in_status,eligibility_status,created_at,user:user_id(username,phone,email)',
    params: {
      event_slug: `eq.${TOURNAMENT_SLUG}`,
      game: 'eq.efootball',
      order: 'created_at.asc',
    },
  });

  let fixturesTablePresent = true;
  try {
    await querySupabase({
      supabaseUrl,
      serviceRoleKey,
      table: 'online_tournament_fixtures',
      select: 'id',
      params: {
        event_slug: `eq.${TOURNAMENT_SLUG}`,
        game: 'eq.efootball',
        limit: '1',
      },
    });
  } catch {
    fixturesTablePresent = false;
  }

  const players = buildPlayerSeeds(registrations);
  if (players.length === 0) {
    throw new Error('No checked-in eFootball players were found in the live database.');
  }

  const fixtures = buildFixtures(players);
  const totals = {
    totalRegistrations: registrations.length,
    checkedIn: players.length,
    pending: Math.max(0, registrations.length - players.length),
  };
  const verifiedAtEat = formatEatDate(new Date().toISOString());
  const svg = buildSvg({ fixtures, totals, verifiedAtEat, fixturesTablePresent });

  const outputDir = path.join(os.homedir(), 'Downloads');
  const htmlPath = path.join(outputDir, `${DEFAULT_OUTPUT_BASENAME}.html`);
  const pngPath = path.join(outputDir, `${DEFAULT_OUTPUT_BASENAME}.png`);

  await fsp.mkdir(outputDir, { recursive: true });
  await fsp.writeFile(
    htmlPath,
    `<!doctype html><html><head><meta charset="utf-8" /><title>PlayMechi Fixture List</title><style>html,body{margin:0;background:#091321;}svg{display:block;}</style></head><body>${svg}</body></html>`,
    'utf8'
  );

  const { chromium } = await import('playwright');
  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage({
      viewport: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT },
      deviceScaleFactor: 1,
    });
    await page.setContent(
      `<!doctype html><html><head><meta charset="utf-8" /><title>PlayMechi Fixture List</title><style>html,body{margin:0;background:#091321;}svg{display:block;}</style></head><body>${svg}</body></html>`,
      { waitUntil: 'load' }
    );
    await page.screenshot({
      path: pngPath,
      type: 'png',
      omitBackground: false,
    });
  } finally {
    await browser.close();
  }

  console.log(
    JSON.stringify(
      {
        pngPath,
        htmlPath,
        checkedInPlayers: players.length,
        totalRegistrations: registrations.length,
        verifiedAtEat,
        fixturesTablePresent,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error?.stack ?? String(error));
  process.exit(1);
});
