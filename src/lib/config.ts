import type { Platform, Game, Tier, PlatformKey, GameKey } from '@/types';

export const PLATFORMS: Record<PlatformKey, Platform> = {
  ps: {
    label: 'PlayStation',
    idLabel: 'PSN ID',
    placeholder: 'YourPSN',
  },
  xbox: {
    label: 'Xbox',
    idLabel: 'Xbox Gamertag',
    placeholder: 'YourGamertag',
  },
  nintendo: {
    label: 'Nintendo',
    idLabel: 'Friend Code',
    placeholder: 'SW-XXXX-XXXX-XXXX',
  },
  mobile: {
    label: 'Mobile',
    idLabel: 'In-Game ID',
    placeholder: 'Username#1234',
  },
  pc: {
    label: 'PC',
    idLabel: 'Steam/Epic ID',
    placeholder: 'YourUsername',
  },
};

export const GAMES: Record<GameKey, Game> = {
  efootball: {
    label: 'eFootball 2026',
    platforms: ['ps', 'xbox', 'pc'],
    mode: '1v1',
    steamAppId: 1665460,
  },
  efootball_mobile: {
    label: 'eFootball 2026 Mobile',
    platforms: ['mobile'],
    mode: '1v1',
    steamAppId: 1665460,
  },
  fc26: {
    label: 'EA FC 26',
    platforms: ['ps', 'xbox', 'pc'],
    mode: '1v1',
    steamAppId: 2669320,
  },
  mk11: {
    label: 'Mortal Kombat 11',
    platforms: ['ps', 'xbox', 'pc', 'nintendo'],
    mode: '1v1',
    steamAppId: 976310,
  },
  nba2k26: {
    label: 'NBA 2K26',
    platforms: ['ps', 'xbox', 'pc'],
    mode: '1v1',
    steamAppId: 2338490,
  },
  tekken8: {
    label: 'Tekken 8',
    platforms: ['ps', 'xbox', 'pc'],
    mode: '1v1',
    steamAppId: 1778820,
  },
  sf6: {
    label: 'Street Fighter 6',
    platforms: ['ps', 'xbox', 'pc'],
    mode: '1v1',
    steamAppId: 1364780,
  },
  codm: {
    label: 'Call of Duty: Mobile',
    platforms: ['mobile'],
    mode: 'lobby',
    maxPlayers: 5,
  },
  pubgm: {
    label: 'PUBG Mobile',
    platforms: ['mobile'],
    mode: 'lobby',
    maxPlayers: 4,
  },
  cs2: {
    label: 'CS2',
    platforms: ['pc'],
    mode: '1v1',
    steamAppId: 730,
  },
  valorant: {
    label: 'Valorant',
    platforms: ['pc'],
    mode: '1v1',
    steamAppId: 1343400,
  },
  mariokart: {
    label: 'Mario Kart 8',
    platforms: ['nintendo'],
    mode: '1v1',
  },
  smashbros: {
    label: 'Super Smash Bros',
    platforms: ['nintendo'],
    mode: '1v1',
  },
  freefire: {
    label: 'Free Fire',
    platforms: ['mobile'],
    mode: 'lobby',
    maxPlayers: 4,
  },
  ludo: {
    label: 'Ludo',
    platforms: ['mobile'],
    mode: '1v1',
    supportsLobby: true,
    maxPlayers: 4,
  },
  rocketleague: {
    label: 'Rocket League',
    platforms: ['ps', 'xbox', 'pc'],
    mode: '1v1',
    steamAppId: 252950,
  },
};

const SCORE_REPORTED_GAMES = new Set<GameKey>(['fc26', 'efootball', 'efootball_mobile']);

const GAME_ARTWORK: Record<GameKey, { header: string; capsule: string }> = {
  efootball: {
    header: '/game-artwork/efootball-header.svg',
    capsule: '/game-artwork/efootball-capsule.svg',
  },
  efootball_mobile: {
    header: '/game-artwork/efootball_mobile-header.svg',
    capsule: '/game-artwork/efootball_mobile-capsule.svg',
  },
  fc26: {
    header: '/game-artwork/fc26-header.svg',
    capsule: '/game-artwork/fc26-capsule.svg',
  },
  mk11: {
    header: '/game-artwork/mk11-header.svg',
    capsule: '/game-artwork/mk11-capsule.svg',
  },
  nba2k26: {
    header: '/game-artwork/nba2k26-header.svg',
    capsule: '/game-artwork/nba2k26-capsule.svg',
  },
  tekken8: {
    header: '/game-artwork/tekken8-header.svg',
    capsule: '/game-artwork/tekken8-capsule.svg',
  },
  sf6: {
    header: '/game-artwork/sf6-header.svg',
    capsule: '/game-artwork/sf6-capsule.svg',
  },
  codm: {
    header: '/game-artwork/codm-header.svg',
    capsule: '/game-artwork/codm-capsule.svg',
  },
  pubgm: {
    header: '/game-artwork/pubgm-header.svg',
    capsule: '/game-artwork/pubgm-capsule.svg',
  },
  cs2: {
    header: '/game-artwork/cs2-header.svg',
    capsule: '/game-artwork/cs2-capsule.svg',
  },
  valorant: {
    header: '/game-artwork/valorant-header.svg',
    capsule: '/game-artwork/valorant-capsule.svg',
  },
  mariokart: {
    header: '/game-artwork/mariokart-header.svg',
    capsule: '/game-artwork/mariokart-capsule.svg',
  },
  smashbros: {
    header: '/game-artwork/smashbros-header.svg',
    capsule: '/game-artwork/smashbros-capsule.svg',
  },
  freefire: {
    header: '/game-artwork/freefire-header.svg',
    capsule: '/game-artwork/freefire-capsule.svg',
  },
  ludo: {
    header: '/game-artwork/ludo-header.svg',
    capsule: '/game-artwork/ludo-capsule.svg',
  },
  rocketleague: {
    header: '/game-artwork/rocketleague-header.svg',
    capsule: '/game-artwork/rocketleague-capsule.svg',
  },
};

export const LOBBY_MODE_OPTIONS: Partial<Record<GameKey, readonly string[]>> = {
  codm: [
    'Multiplayer Ranked',
    'Search & Destroy',
    'Hardpoint',
    'Frontline',
    'Battle Royale',
  ],
  pubgm: [
    'Classic Squad',
    'Classic Duo',
    'Classic Solo',
    'Team Deathmatch',
    'Payload',
  ],
  ludo: [
    'Classic 1v1',
    'Classic 2v2',
    'Quick Match',
  ],
};

export const LOBBY_POPULAR_MAPS: Partial<Record<GameKey, readonly string[]>> = {
  codm: ['Nuketown', 'Raid', 'Firing Range', 'Shipment', 'Standoff'],
  pubgm: ['Erangel', 'Livik', 'Miramar', 'Sanhok', 'Vikendi'],
};

export const TIERS: Tier[] = [
  { name: 'Bronze', min: 0, max: 1099, color: 'text-amber-700', bgColor: 'bg-amber-100 dark:bg-amber-900/30' },
  { name: 'Silver', min: 1100, max: 1299, color: 'text-gray-500', bgColor: 'bg-gray-100 dark:bg-gray-800' },
  { name: 'Gold', min: 1300, max: 1499, color: 'text-yellow-500', bgColor: 'bg-yellow-50 dark:bg-yellow-900/30' },
  { name: 'Platinum', min: 1500, max: 1699, color: 'text-cyan-500', bgColor: 'bg-cyan-50 dark:bg-cyan-900/30' },
  { name: 'Diamond', min: 1700, max: 1899, color: 'text-blue-500', bgColor: 'bg-blue-50 dark:bg-blue-900/30' },
  { name: 'Legend', min: 1900, max: Infinity, color: 'text-purple-500', bgColor: 'bg-purple-50 dark:bg-purple-900/30' },
];

export const REGIONS = ['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret', 'Other'];

export const DEFAULT_RATING = 1000;

export function getLobbyModeOptions(gameKey: GameKey): string[] {
  return [...(LOBBY_MODE_OPTIONS[gameKey] ?? [])];
}

export function getLobbyPopularMaps(gameKey: GameKey): string[] {
  return [...(LOBBY_POPULAR_MAPS[gameKey] ?? [])];
}

export function getDefaultLobbyMode(gameKey: GameKey): string {
  return getLobbyModeOptions(gameKey)[0] ?? GAMES[gameKey]?.mode ?? 'lobby';
}

export function getDefaultLobbyMap(gameKey: GameKey): string {
  return getLobbyPopularMaps(gameKey)[0] ?? '';
}

export function supportsLobbyMode(gameKey: GameKey): boolean {
  const game = GAMES[gameKey];
  return Boolean(game && (game.mode === 'lobby' || game.supportsLobby));
}

export function requiresMatchScoreReport(gameKey: GameKey): boolean {
  return SCORE_REPORTED_GAMES.has(gameKey);
}

export function getTier(rating: number): Tier {
  return TIERS.find((t) => rating >= t.min && rating <= t.max) ?? TIERS[0];
}

export function getGameImage(gameKey: GameKey): string | null {
  return GAME_ARTWORK[gameKey]?.header ?? null;
}

export function getGameCapsuleImage(gameKey: GameKey): string | null {
  return GAME_ARTWORK[gameKey]?.capsule ?? null;
}

export function getGameRatingKey(game: GameKey): string {
  return `rating_${game}`;
}

export function getGameWinsKey(game: GameKey): string {
  return `wins_${game}`;
}

export function getGameLossesKey(game: GameKey): string {
  return `losses_${game}`;
}

export function getGamesForPlatforms(platforms: PlatformKey[]): GameKey[] {
  return (Object.keys(GAMES) as GameKey[]).filter((gameKey) => {
    const game = GAMES[gameKey];
    return game.platforms.some((p) => platforms.includes(p));
  });
}

export function getGamePlatformKey(gameKey: GameKey): string {
  return `platform:${gameKey}`;
}

export function getGameIdKey(gameKey: GameKey, platform: PlatformKey): string {
  return platform === 'mobile' ? `${gameKey}:mobile` : platform;
}

export function getGameIdLabel(gameKey: GameKey, platform: PlatformKey): string {
  if (platform === 'mobile') {
    return `${GAMES[gameKey]?.label ?? 'Mobile game'} ID`;
  }

  return PLATFORMS[platform]?.idLabel ?? 'Platform ID';
}

export function getGameIdPlaceholder(gameKey: GameKey, platform: PlatformKey): string {
  if (platform !== 'mobile') {
    return PLATFORMS[platform]?.placeholder ?? 'Your ID';
  }

  switch (gameKey) {
    case 'codm':
      return 'CODM username or UID';
    case 'efootball_mobile':
      return 'eFootball user ID';
    case 'pubgm':
      return 'PUBG Mobile UID';
    case 'freefire':
      return 'Free Fire UID';
    case 'ludo':
      return 'Ludo player name or room ID';
    default:
      return 'In-game ID';
  }
}

export function isValidGamePlatform(gameKey: GameKey, platform: PlatformKey): boolean {
  return GAMES[gameKey]?.platforms.includes(platform) ?? false;
}

export function getConfiguredPlatformForGame(
  gameKey: GameKey,
  gameIds: Record<string, string> = {},
  platforms: PlatformKey[] = []
): PlatformKey | null {
  const game = GAMES[gameKey];
  if (!game) return null;

  const configuredPlatform = gameIds[getGamePlatformKey(gameKey)] as PlatformKey | undefined;
  if (
    configuredPlatform &&
    game.platforms.includes(configuredPlatform) &&
    (platforms.length === 0 || platforms.includes(configuredPlatform))
  ) {
    return configuredPlatform;
  }

  if (game.platforms.length === 1) {
    const [onlyPlatform] = game.platforms;
    if (platforms.length === 0 || platforms.includes(onlyPlatform)) {
      return onlyPlatform;
    }
  }

  return platforms.find((platform) => game.platforms.includes(platform)) ?? null;
}

export function getPlatformsForGameSetup(
  selectedGames: GameKey[],
  gameIds: Record<string, string> = {},
  fallbackPlatforms: PlatformKey[] = []
): PlatformKey[] {
  const platforms = new Set<PlatformKey>();

  selectedGames.forEach((gameKey) => {
    const platform = getConfiguredPlatformForGame(gameKey, gameIds, fallbackPlatforms);
    if (platform) {
      platforms.add(platform);
    }
  });

  return Array.from(platforms);
}

export function getGameIdValue(
  gameIds: Record<string, string>,
  gameKey: GameKey,
  platform: PlatformKey
): string {
  return gameIds[getGameIdKey(gameKey, platform)] ?? gameIds[platform] ?? '';
}

export function getPlatformAddUrl(platform: PlatformKey, platformId: string): string | null {
  switch (platform) {
    case 'ps':
      return `https://psnprofiles.com/${encodeURIComponent(platformId)}`;
    case 'xbox':
      return `https://account.xbox.com/en-us/profile?gamertag=${encodeURIComponent(platformId)}`;
    case 'nintendo':
      return null;
    case 'pc':
      return `https://steamcommunity.com/id/${encodeURIComponent(platformId)}`;
    case 'mobile':
      return null;
    default:
      return null;
  }
}

export function getPlatformLabel(platform: PlatformKey): string {
  return PLATFORMS[platform]?.label ?? platform;
}

export function getMatchingPlatform(
  userPlatforms: PlatformKey[],
  gamePlatforms: PlatformKey[]
): PlatformKey | null {
  return userPlatforms.find((p) => gamePlatforms.includes(p)) ?? null;
}
