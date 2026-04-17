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
    platforms: ['ps', 'xbox', 'pc', 'mobile'],
    mode: '1v1',
    steamAppId: 1665460,
  },
  efootball_mobile: {
    label: 'eFootball 2026',
    platforms: ['mobile'],
    mode: '1v1',
    steamAppId: 1665460,
    hidden: true,
    canonicalGame: 'efootball',
  },
  fc26: {
    label: 'EA FC 26',
    platforms: ['ps', 'xbox', 'pc'],
    mode: '1v1',
    steamAppId: 3405690,
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
    steamAppId: 3472040,
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
  fortnite: {
    label: 'Fortnite',
    platforms: ['ps', 'xbox', 'pc', 'nintendo'],
    mode: 'lobby',
    maxPlayers: 4,
  },
  rocketleague: {
    label: 'Rocket League',
    platforms: ['ps', 'xbox', 'pc'],
    mode: '1v1',
    steamAppId: 252950,
  },
};

const SCORE_REPORTED_GAMES = new Set<GameKey>(['fc26', 'efootball']);

const GAME_ARTWORK: Partial<Record<GameKey, { header: string; capsule: string }>> = {
  efootball: {
    header: '/game-artwork/efootball-header.webp',
    capsule: '/game-artwork/efootball-capsule.webp',
  },
  efootball_mobile: {
    header: '/game-artwork/efootball-header.webp',
    capsule: '/game-artwork/efootball-capsule.webp',
  },
  fc26: {
    header: '/game-artwork/fc26-header.webp',
    capsule: '/game-artwork/fc26-capsule.webp',
  },
  mk11: {
    header: '/game-artwork/mk11-header.webp',
    capsule: '/game-artwork/mk11-capsule.webp',
  },
  nba2k26: {
    header: '/game-artwork/nba2k26-header.webp',
    capsule: '/game-artwork/nba2k26-capsule.webp',
  },
  tekken8: {
    header: '/game-artwork/tekken8-header.webp',
    capsule: '/game-artwork/tekken8-capsule.webp',
  },
  sf6: {
    header: '/game-artwork/sf6-header.webp',
    capsule: '/game-artwork/sf6-capsule.webp',
  },
  codm: {
    header: '/game-artwork/codm-header.webp',
    capsule: '/game-artwork/codm-capsule.webp',
  },
  pubgm: {
    header: '/game-artwork/pubgm-header.webp',
    capsule: '/game-artwork/pubgm-capsule.webp',
  },
  cs2: {
    header: '/game-artwork/cs2-header.webp',
    capsule: '/game-artwork/cs2-capsule.webp',
  },
  valorant: {
    header: '/game-artwork/valorant-header.webp',
    capsule: '/game-artwork/valorant-capsule.webp',
  },
  mariokart: {
    header: '/game-artwork/mariokart-header.webp',
    capsule: '/game-artwork/mariokart-capsule.webp',
  },
  smashbros: {
    header: '/game-artwork/smashbros-header.webp',
    capsule: '/game-artwork/smashbros-capsule.webp',
  },
  freefire: {
    header: '/game-artwork/freefire-header.webp',
    capsule: '/game-artwork/freefire-capsule.webp',
  },
  ludo: {
    header: '/game-artwork/ludo-header.webp',
    capsule: '/game-artwork/ludo-capsule.webp',
  },
  rocketleague: {
    header: '/game-artwork/rocketleague-header.webp',
    capsule: '/game-artwork/rocketleague-capsule.webp',
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
  fortnite: [
    'Battle Royale',
    'Zero Build',
    'Reload',
    'Creative',
    'Box Fights',
  ],
};

export const LOBBY_POPULAR_MAPS: Partial<Record<GameKey, readonly string[]>> = {
  codm: ['Nuketown', 'Raid', 'Firing Range', 'Shipment', 'Standoff'],
  pubgm: ['Erangel', 'Livik', 'Miramar', 'Sanhok', 'Vikendi'],
  fortnite: ['Battle Royale Island', 'Reload', 'The Pit', 'Zone Wars'],
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
  const canonicalGameKey = getCanonicalGameKey(gameKey);
  return [...(LOBBY_MODE_OPTIONS[canonicalGameKey] ?? [])];
}

export function getLobbyPopularMaps(gameKey: GameKey): string[] {
  const canonicalGameKey = getCanonicalGameKey(gameKey);
  return [...(LOBBY_POPULAR_MAPS[canonicalGameKey] ?? [])];
}

export function getDefaultLobbyMode(gameKey: GameKey): string {
  const canonicalGameKey = getCanonicalGameKey(gameKey);
  return getLobbyModeOptions(canonicalGameKey)[0] ?? GAMES[canonicalGameKey]?.mode ?? 'lobby';
}

export function getDefaultLobbyMap(gameKey: GameKey): string {
  return getLobbyPopularMaps(getCanonicalGameKey(gameKey))[0] ?? '';
}

export function supportsLobbyMode(gameKey: GameKey): boolean {
  const game = GAMES[getCanonicalGameKey(gameKey)];
  return Boolean(game && (game.mode === 'lobby' || game.supportsLobby));
}

export function requiresMatchScoreReport(gameKey: GameKey): boolean {
  return SCORE_REPORTED_GAMES.has(getCanonicalGameKey(gameKey));
}

export function getTier(rating: number): Tier {
  return TIERS.find((t) => rating >= t.min && rating <= t.max) ?? TIERS[0];
}

export function getGameImage(gameKey: GameKey): string | null {
  return GAME_ARTWORK[getCanonicalGameKey(gameKey)]?.header ?? null;
}

export function getGameCapsuleImage(gameKey: GameKey): string | null {
  return GAME_ARTWORK[getCanonicalGameKey(gameKey)]?.capsule ?? null;
}

export function getGameRatingKey(game: GameKey): string {
  return `rating_${getCanonicalGameKey(game)}`;
}

export function getGameWinsKey(game: GameKey): string {
  return `wins_${getCanonicalGameKey(game)}`;
}

export function getGameLossesKey(game: GameKey): string {
  return `losses_${getCanonicalGameKey(game)}`;
}

export function getCanonicalGameKey(gameKey: GameKey): GameKey {
  return GAMES[gameKey]?.canonicalGame ?? gameKey;
}

export function getValidCanonicalGameKey(gameKey: string): GameKey | null {
  if (!Object.prototype.hasOwnProperty.call(GAMES, gameKey)) {
    return null;
  }

  return getCanonicalGameKey(gameKey as GameKey);
}

export function getSelectableGameKeys(): GameKey[] {
  return (Object.keys(GAMES) as GameKey[]).filter(
    (gameKey) => !GAMES[gameKey].hidden && getCanonicalGameKey(gameKey) === gameKey
  );
}

export function normalizeSelectedGameKeys(values: readonly unknown[] = []): GameKey[] {
  const games: GameKey[] = [];

  for (const value of values) {
    if (typeof value !== 'string') continue;

    const game = getValidCanonicalGameKey(value);
    if (game && !games.includes(game)) {
      games.push(game);
    }
  }

  return games;
}

export function getGamesForPlatforms(platforms: PlatformKey[]): GameKey[] {
  return getSelectableGameKeys().filter((gameKey) => {
    const game = GAMES[gameKey];
    return game.platforms.some((p) => platforms.includes(p));
  });
}

export function getGamePlatformKey(gameKey: GameKey): string {
  return `platform:${getCanonicalGameKey(gameKey)}`;
}

export function getGameIdKey(gameKey: GameKey, platform: PlatformKey): string {
  return platform === 'mobile' ? `${getCanonicalGameKey(gameKey)}:mobile` : platform;
}

export function getGameIdLabel(gameKey: GameKey, platform: PlatformKey): string {
  if (platform === 'mobile') {
    const canonicalGameKey = getCanonicalGameKey(gameKey);
    const label = GAMES[canonicalGameKey]?.label ?? 'Mobile game';
    return canonicalGameKey === 'efootball' ? `${label} Mobile ID` : `${label} ID`;
  }

  return PLATFORMS[platform]?.idLabel ?? 'Platform ID';
}

export function getGameIdPlaceholder(gameKey: GameKey, platform: PlatformKey): string {
  if (platform !== 'mobile') {
    return PLATFORMS[platform]?.placeholder ?? 'Your ID';
  }

  switch (getCanonicalGameKey(gameKey)) {
    case 'codm':
      return 'CODM username or UID';
    case 'efootball':
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
  return GAMES[getCanonicalGameKey(gameKey)]?.platforms.includes(platform) ?? false;
}

export function normalizeGameIdKeys(gameIds: Record<string, string> = {}): Record<string, string> {
  const nextGameIds = { ...gameIds };

  if (nextGameIds['efootball_mobile:mobile'] && !nextGameIds['efootball:mobile']) {
    nextGameIds['efootball:mobile'] = nextGameIds['efootball_mobile:mobile'];
  }
  if (nextGameIds['platform:efootball_mobile'] && !nextGameIds['platform:efootball']) {
    nextGameIds['platform:efootball'] = nextGameIds['platform:efootball_mobile'];
  }

  delete nextGameIds['efootball_mobile:mobile'];
  delete nextGameIds['platform:efootball_mobile'];

  return nextGameIds;
}

export function getConfiguredPlatformForGame(
  gameKey: GameKey,
  gameIds: Record<string, string> = {},
  platforms: PlatformKey[] = []
): PlatformKey | null {
  const canonicalGameKey = getCanonicalGameKey(gameKey);
  const game = GAMES[canonicalGameKey];
  if (!game) return null;

  const canonicalGameIds = normalizeGameIdKeys(gameIds);
  const configuredPlatform = canonicalGameIds[getGamePlatformKey(canonicalGameKey)] as
    | PlatformKey
    | undefined;
  if (configuredPlatform && game.platforms.includes(configuredPlatform)) {
    return configuredPlatform;
  }

  const legacyGame = GAMES[gameKey];
  if (legacyGame?.canonicalGame && legacyGame.platforms.length === 1) {
    const [onlyPlatform] = legacyGame.platforms;
    return onlyPlatform;
  }

  if (game.platforms.length === 1) {
    const [onlyPlatform] = game.platforms;
    return onlyPlatform;
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
  const canonicalGameKey = getCanonicalGameKey(gameKey);
  const canonicalGameIds = normalizeGameIdKeys(gameIds);

  return (
    canonicalGameIds[getGameIdKey(canonicalGameKey, platform)] ??
    gameIds[getGameIdKey(gameKey, platform)] ??
    gameIds[platform] ??
    ''
  );
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
