import { GAMES, PLATFORMS, getCanonicalGameKey } from '@/lib/config';
import {
  getPlayerDashboardSnapshot,
  joinQueueForUser,
  leaveQueueForUser,
  listOpenLobbies,
  listOpenTournaments,
} from '@/lib/player-actions';
import { APP_URL } from '@/lib/urls';
import type { GameKey, PlatformKey } from '@/types';
import type { SupportUserSummary } from './support-context';

type PlayerActionName =
  | 'help'
  | 'dashboard'
  | 'find_match'
  | 'leave_queue'
  | 'list_lobbies'
  | 'list_tournaments'
  | 'playmechi_register';

type ParsedPlayerAction = {
  action: PlayerActionName;
  game: GameKey | null;
  platform: PlatformKey | null;
};

export type WhatsAppPlayerActionResult =
  | {
      handled: false;
    }
  | {
      handled: true;
      message: string;
      senderType: 'ai' | 'system';
      meta: Record<string, unknown>;
    };

const HELP_PATTERNS = [/^\s*(help|menu|commands|start)\b/i, /\bwhat can you do\b/i];
const DASHBOARD_PATTERNS = [/\bdashboard\b/i, /\bmy status\b/i, /\bsummary\b/i, /\bprofile summary\b/i];
const FIND_MATCH_PATTERNS = [
  /\bfind (me )?(a )?match\b/i,
  /\bqueue me\b/i,
  /\bjoin (the )?queue\b/i,
  /\bmatch me\b/i,
  /\bstart matchmaking\b/i,
];
const LEAVE_QUEUE_PATTERNS = [/\bleave (the )?queue\b/i, /\bcancel (my )?queue\b/i, /\bstop (the )?queue\b/i];
const LOBBY_PATTERNS = [/\blobb(y|ies)\b/i, /\bshow rooms\b/i, /\bopen rooms\b/i];
const PLAYMECHI_REGISTER_PATTERNS = [
  /\b(register|join|sign ?up|enter)\b.*\b(tournament|playmechi|pubg ?m|pubg mobile|codm|call of duty:? mobile|efootball)\b/i,
  /\b(tournament|playmechi|pubg ?m|pubg mobile|codm|call of duty:? mobile|efootball)\b.*\b(register|join|sign ?up|enter)\b/i,
  /\bi want to register\b/i,
];
const TOURNAMENT_PATTERNS = [/\btournaments?\b/i, /\bbrackets?\b/i, /\bevents?\b/i];

const GAME_ALIASES: Array<{ game: GameKey; patterns: RegExp[] }> = [
  { game: 'fc26', patterns: [/\bfc ?26\b/i, /\bea ?fc\b/i, /\bfifa\b/i] },
  { game: 'efootball', patterns: [/\befootball\b/i, /\bpes\b/i] },
  { game: 'mk11', patterns: [/\bmk ?11\b/i, /\bmortal kombat\b/i] },
  { game: 'nba2k26', patterns: [/\bnba ?2k ?26\b/i, /\b2k ?26\b/i] },
  { game: 'tekken8', patterns: [/\btekken ?8\b/i] },
  { game: 'sf6', patterns: [/\bstreet fighter ?6\b/i, /\bsf ?6\b/i] },
  { game: 'codm', patterns: [/\bcodm\b/i, /\bcall of duty:? mobile\b/i] },
  { game: 'pubgm', patterns: [/\bpubg ?m\b/i, /\bpubg mobile\b/i] },
  { game: 'cs2', patterns: [/\bcs ?2\b/i, /\bcounter[- ]?strike ?2\b/i] },
  { game: 'valorant', patterns: [/\bvalorant\b/i] },
  { game: 'mariokart', patterns: [/\bmario kart\b/i] },
  { game: 'smashbros', patterns: [/\bsmash\b/i, /\bsmash bros\b/i] },
  { game: 'freefire', patterns: [/\bfree fire\b/i] },
  { game: 'ludo', patterns: [/\bludo\b/i] },
  { game: 'rocketleague', patterns: [/\brocket league\b/i] },
  { game: 'fortnite', patterns: [/\bfortnite\b/i] },
];

const PLATFORM_ALIASES: Array<{ platform: PlatformKey; patterns: RegExp[] }> = [
  { platform: 'ps', patterns: [/\bps\b/i, /\bps4\b/i, /\bps5\b/i, /\bplaystation\b/i] },
  { platform: 'xbox', patterns: [/\bxbox\b/i] },
  { platform: 'pc', patterns: [/\bpc\b/i, /\bcomputer\b/i, /\bsteam\b/i] },
  { platform: 'mobile', patterns: [/\bmobile\b/i, /\bphone\b/i, /\bandroid\b/i, /\bios\b/i] },
  { platform: 'nintendo', patterns: [/\bnintendo\b/i, /\bswitch\b/i] },
];

function matchesAny(text: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(text));
}

function parseGame(text: string) {
  for (const alias of GAME_ALIASES) {
    if (matchesAny(text, alias.patterns)) {
      return getCanonicalGameKey(alias.game);
    }
  }

  return null;
}

function parsePlatform(text: string) {
  for (const alias of PLATFORM_ALIASES) {
    if (matchesAny(text, alias.patterns)) {
      return alias.platform;
    }
  }

  return null;
}

function parsePlayerAction(body: string): ParsedPlayerAction | null {
  const normalized = body.trim();
  if (!normalized) {
    return null;
  }

  const game = parseGame(normalized);
  const platform = parsePlatform(normalized);

  if (matchesAny(normalized, HELP_PATTERNS)) {
    return { action: 'help', game, platform };
  }

  if (matchesAny(normalized, LEAVE_QUEUE_PATTERNS)) {
    return { action: 'leave_queue', game, platform };
  }

  if (matchesAny(normalized, FIND_MATCH_PATTERNS)) {
    return { action: 'find_match', game, platform };
  }

  if (matchesAny(normalized, LOBBY_PATTERNS)) {
    return { action: 'list_lobbies', game, platform };
  }

  if (matchesAny(normalized, PLAYMECHI_REGISTER_PATTERNS)) {
    return { action: 'playmechi_register', game, platform };
  }

  if (matchesAny(normalized, TOURNAMENT_PATTERNS)) {
    return { action: 'list_tournaments', game, platform };
  }

  if (matchesAny(normalized, DASHBOARD_PATTERNS)) {
    return { action: 'dashboard', game, platform };
  }

  return null;
}

function joinLabels(gameKeys: GameKey[]) {
  return gameKeys.map((game) => GAMES[game]?.label ?? game).join(', ');
}

function formatGameLabel(game: GameKey) {
  return GAMES[game]?.label ?? game;
}

function formatPlatformLabel(platform: PlatformKey | null | undefined) {
  if (!platform) {
    return 'your saved platform';
  }

  return PLATFORMS[platform]?.label ?? platform;
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return 'Time not locked yet';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Time not locked yet';
  }

  return new Intl.DateTimeFormat('en-KE', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Africa/Nairobi',
  }).format(date);
}

function formatHelpMessage() {
  return [
    'Mechi is live here too.',
    '',
    'Try any of these:',
    '• dashboard',
    '• find match fc26',
    '• find match mk11 xbox',
    '• leave queue',
    '• lobbies codm',
    '• tournaments fc26',
    '',
    `Main app: ${APP_URL}/dashboard`,
  ].join('\n');
}

function requireLinkedAccountMessage() {
  return [
    'I need this WhatsApp number linked to a Mechi account before I can run player actions for you.',
    '',
    `Log in on ${APP_URL}, make sure this number is on your profile, then text me again.`,
  ].join('\n');
}

function formatPlayMechiRegistrationMessage(game: GameKey | null) {
  const gameLabel = game ? formatGameLabel(game) : 'PUBG Mobile, CODM, or eFootball';

  return [
    'Yes. Register for the free PlayMechi Online Gaming Tournament here:',
    `${APP_URL}/playmechi/register`,
    '',
    `Pick ${gameLabel}, confirm your game tag, then join the WhatsApp group shown after registration.`,
    'Matches start at 8:00 PM EAT from 8 May.',
  ].join('\n');
}

function formatDashboardMessage(snapshot: NonNullable<Awaited<ReturnType<typeof getPlayerDashboardSnapshot>>>) {
  const { profile, queueEntry, activeMatch } = snapshot;
  const lines = [
    `*${profile.username}*`,
    `Plan: ${profile.plan.toUpperCase()} | Level ${profile.level} | ${profile.mp} MP | Streak ${profile.win_streak}`,
  ];

  if (profile.bestGame) {
    lines.push(`Top game: ${formatGameLabel(profile.bestGame.game)} (${profile.bestGame.rating} rating)`);
  }

  if (profile.selectedGames.length > 0) {
    lines.push(`Games: ${joinLabels(profile.selectedGames)}`);
  }

  if (activeMatch) {
    lines.push(`Live match: ${formatGameLabel(activeMatch.game)} ready now`);
    lines.push(`${APP_URL}/match/${activeMatch.id}`);
  } else if (queueEntry?.status === 'waiting') {
    lines.push(`Queue: ${formatGameLabel(queueEntry.game)} on ${formatPlatformLabel(queueEntry.platform)}`);
    lines.push(`${APP_URL}/queue?game=${queueEntry.game}${queueEntry.platform ? `&platform=${queueEntry.platform}` : ''}`);
  } else {
    lines.push('Queue: no live queue right now');
  }

  lines.push('', 'Quick moves: find match fc26 | lobbies codm | tournaments fc26');
  return lines.join('\n');
}

function formatFindMatchMessage(result: Awaited<ReturnType<typeof joinQueueForUser>>) {
  switch (result.status) {
    case 'matched':
      return [
        `Match found fast on ${formatGameLabel(result.game)}.`,
        '',
        `Jump in now: ${APP_URL}/match/${result.match.id}`,
      ].join('\n');
    case 'active_match':
      return [
        `You already have a live ${formatGameLabel(result.game)} match.`,
        '',
        `Open it here: ${APP_URL}/match/${result.match.id}`,
      ].join('\n');
    case 'joined':
      return [
        `You’re in the ${formatGameLabel(result.game)} queue on ${formatPlatformLabel(result.platform)}.`,
        'Stay close. I’ll ping you here when a match lands.',
        '',
        `${APP_URL}/queue?game=${result.game}${result.platform ? `&platform=${result.platform}` : ''}`,
      ].join('\n');
    case 'already_in_queue':
      return [
        `You’re already queued for ${formatGameLabel(result.game)} on ${formatPlatformLabel(result.platform)}.`,
        '',
        `${APP_URL}/queue?game=${result.game}${result.platform ? `&platform=${result.platform}` : ''}`,
      ].join('\n');
    case 'requires_game':
      return result.availableGames?.length
        ? `Tell me the title too.\n\nTry: ${result.availableGames
            .slice(0, 3)
            .map((game) => `find match ${game}`)
            .join(' | ')}`
        : 'Tell me the title too.\n\nTry: find match fc26';
    case 'wrong_mode':
      return result.game
        ? `${formatGameLabel(result.game)} uses lobbies, not ranked queue.\n\nTry: lobbies ${result.game}`
        : 'That title uses lobbies, not ranked queue.';
    case 'game_not_selected':
      return result.game
        ? `${formatGameLabel(result.game)} is not on your profile yet.\n\nSet it up here: ${APP_URL}/profile`
        : 'That game is not on your profile yet.';
    case 'missing_platform':
      return result.game
        ? `Set your platform for ${formatGameLabel(result.game)} first, then text me again.\n\n${APP_URL}/profile`
        : `Set your platform first, then text me again.\n\n${APP_URL}/profile`;
    case 'limit_reached':
      return `You’ve hit today’s match cap on ${result.plan.toUpperCase()}.\n\nUpgrade lane: ${APP_URL}/pricing`;
    case 'profile_missing':
      return requireLinkedAccountMessage();
    case 'invalid_game':
    case 'failed':
    default:
      return result.message;
  }
}

function formatLeaveQueueMessage(result: Awaited<ReturnType<typeof leaveQueueForUser>>) {
  if (result.status === 'left') {
    return 'Queue cancelled. You’re out of the matchmaking lane for now.';
  }

  return 'You’re not in a live queue right now.';
}

function formatLobbyMessage(result: Awaited<ReturnType<typeof listOpenLobbies>>) {
  if (result.status !== 'ok') {
    return result.message;
  }

  if (result.lobbies.length === 0) {
    if (result.filterGame) {
      return `No open ${formatGameLabel(result.filterGame)} lobbies right now.`;
    }

    return 'No open lobbies are live right now.';
  }

  const lines = ['*Open lobbies*', ''];

  for (const [index, lobby] of result.lobbies.slice(0, 4).entries()) {
    lines.push(
      `${index + 1}. ${lobby.title}`,
      `${formatGameLabel(lobby.game)} • ${lobby.mode} • ${lobby.member_count}/${lobby.max_players}`,
      `${lobby.map_name ? `${lobby.map_name} • ` : ''}${formatDateTime(lobby.scheduled_for)}`,
      `${APP_URL}/lobbies/${lobby.id}`,
      ''
    );
  }

  return lines.join('\n').trim();
}

function formatTournamentMessage(result: Awaited<ReturnType<typeof listOpenTournaments>>) {
  if (result.status !== 'ok') {
    return result.message;
  }

  if (result.tournaments.length === 0) {
    if (result.filterGame) {
      return `No open ${formatGameLabel(result.filterGame)} tournaments right now.`;
    }

    return 'No open tournaments are live right now.';
  }

  const lines = ['*Open tournaments*', ''];

  for (const [index, tournament] of result.tournaments.slice(0, 4).entries()) {
    lines.push(
      `${index + 1}. ${tournament.title}`,
      `${formatGameLabel(tournament.game)} • ${tournament.player_count}/${tournament.size} players`,
      `Entry: ${tournament.entry_fee > 0 ? `KES ${tournament.entry_fee}` : 'Free'}${tournament.platform ? ` • ${formatPlatformLabel(tournament.platform)}` : ''}`,
      `${APP_URL}/t/${tournament.slug}`,
      ''
    );
  }

  return lines.join('\n').trim();
}

export async function executeWhatsAppPlayerAction(params: {
  body: string | null | undefined;
  user: SupportUserSummary | null;
}): Promise<WhatsAppPlayerActionResult> {
  const parsed = parsePlayerAction(String(params.body ?? ''));
  if (!parsed) {
    return { handled: false };
  }

  if (parsed.action === 'help') {
    return {
      handled: true,
      message: formatHelpMessage(),
      senderType: 'ai',
      meta: { source: 'whatsapp_action', action: parsed.action },
    };
  }

  if (parsed.action === 'list_lobbies') {
    const result = await listOpenLobbies({
      userId: params.user?.id ?? null,
      game: parsed.game,
    });

    return {
      handled: true,
      message: formatLobbyMessage(result),
      senderType: 'ai',
      meta: {
        source: 'whatsapp_action',
        action: parsed.action,
        game: parsed.game,
      },
    };
  }

  if (parsed.action === 'list_tournaments') {
    const result = await listOpenTournaments({
      userId: params.user?.id ?? null,
      game: parsed.game,
    });

    return {
      handled: true,
      message: formatTournamentMessage(result),
      senderType: 'ai',
      meta: {
        source: 'whatsapp_action',
        action: parsed.action,
        game: parsed.game,
      },
    };
  }

  if (parsed.action === 'playmechi_register') {
    return {
      handled: true,
      message: formatPlayMechiRegistrationMessage(parsed.game),
      senderType: 'ai',
      meta: {
        source: 'whatsapp_action',
        action: parsed.action,
        game: parsed.game,
      },
    };
  }

  if (!params.user?.id) {
    return {
      handled: true,
      message: requireLinkedAccountMessage(),
      senderType: 'system',
      meta: {
        source: 'whatsapp_action',
        action: parsed.action,
        requires_linked_user: true,
      },
    };
  }

  if (parsed.action === 'dashboard') {
    const snapshot = await getPlayerDashboardSnapshot(params.user.id);
    return {
      handled: true,
      message: snapshot ? formatDashboardMessage(snapshot) : requireLinkedAccountMessage(),
      senderType: snapshot ? 'ai' : 'system',
      meta: {
        source: 'whatsapp_action',
        action: parsed.action,
      },
    };
  }

  if (parsed.action === 'find_match') {
    const result = await joinQueueForUser({
      userId: params.user.id,
      game: parsed.game,
      platform: parsed.platform,
    });

    return {
      handled: true,
      message: formatFindMatchMessage(result),
      senderType: 'ai',
      meta: {
        source: 'whatsapp_action',
        action: parsed.action,
        game: parsed.game,
        platform: parsed.platform,
        result: result.status,
      },
    };
  }

  if (parsed.action === 'leave_queue') {
    const result = await leaveQueueForUser(params.user.id);
    return {
      handled: true,
      message: formatLeaveQueueMessage(result),
      senderType: 'ai',
      meta: {
        source: 'whatsapp_action',
        action: parsed.action,
        result: result.status,
      },
    };
  }

  return { handled: false };
}
