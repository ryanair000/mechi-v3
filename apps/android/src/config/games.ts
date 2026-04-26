import type {
  CountryKey,
  GameDefinition,
  GameKey,
  PlatformDefinition,
  PlatformKey,
} from '../types';

export const PLATFORMS: Record<PlatformKey, PlatformDefinition> = {
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
    idLabel: 'In-game ID',
    placeholder: 'Username#1234',
  },
  pc: {
    label: 'PC',
    idLabel: 'Steam/Epic ID',
    placeholder: 'YourUsername',
  },
};

export const COUNTRIES: Record<CountryKey, { label: string; regions: string[] }> = {
  kenya: {
    label: 'Kenya',
    regions: ['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret', 'Machakos', 'Nyeri', 'Other'],
  },
  tanzania: {
    label: 'Tanzania',
    regions: ['Dar es Salaam', 'Arusha', 'Dodoma', 'Mwanza', 'Mbeya', 'Zanzibar', 'Morogoro', 'Other'],
  },
  uganda: {
    label: 'Uganda',
    regions: ['Kampala', 'Entebbe', 'Jinja', 'Mbarara', 'Gulu', 'Mbale', 'Arua', 'Other'],
  },
  rwanda: {
    label: 'Rwanda',
    regions: ['Kigali', 'Huye', 'Musanze', 'Rubavu', 'Rwamagana', 'Other'],
  },
  ethiopia: {
    label: 'Ethiopia',
    regions: ['Addis Ababa', 'Adama', 'Bahir Dar', 'Hawassa', 'Mekelle', 'Dire Dawa', 'Jimma', 'Other'],
  },
};

const RAW_GAMES: Record<GameKey, Omit<GameDefinition, 'key'>> = {
  efootball: {
    label: 'eFootball 2026',
    platforms: ['ps', 'xbox', 'pc', 'mobile'],
    mode: '1v1',
  },
  efootball_mobile: {
    label: 'eFootball 2026',
    platforms: ['mobile'],
    mode: '1v1',
    hidden: true,
    canonicalGame: 'efootball',
  },
  fc26: {
    label: 'EA FC 26',
    platforms: ['ps', 'xbox', 'pc'],
    mode: '1v1',
  },
  mk11: {
    label: 'Mortal Kombat 11',
    platforms: ['ps', 'xbox', 'pc', 'nintendo'],
    mode: '1v1',
  },
  nba2k26: {
    label: 'NBA 2K26',
    platforms: ['ps', 'xbox', 'pc'],
    mode: '1v1',
  },
  tekken8: {
    label: 'Tekken 8',
    platforms: ['ps', 'xbox', 'pc'],
    mode: '1v1',
  },
  sf6: {
    label: 'Street Fighter 6',
    platforms: ['ps', 'xbox', 'pc'],
    mode: '1v1',
  },
  codm: {
    label: 'Call of Duty: Mobile',
    platforms: ['mobile'],
    mode: 'lobby',
    maxPlayers: 5,
    hasLobbyScore: true,
  },
  pubgm: {
    label: 'PUBG Mobile',
    platforms: ['mobile'],
    mode: 'lobby',
    maxPlayers: 4,
    hasLobbyScore: true,
  },
  cs2: {
    label: 'CS2',
    platforms: ['pc'],
    mode: '1v1',
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
    hasLobbyScore: true,
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
    hasLobbyScore: true,
  },
  rocketleague: {
    label: 'Rocket League',
    platforms: ['ps', 'xbox', 'pc'],
    mode: '1v1',
  },
};

export const GAMES = Object.fromEntries(
  Object.entries(RAW_GAMES).map(([key, game]) => [key, { key, ...game }])
) as Record<GameKey, GameDefinition>;

export const LOBBY_MODE_OPTIONS: Partial<Record<GameKey, string[]>> = {
  codm: ['Multiplayer Ranked', 'Search & Destroy', 'Hardpoint', 'Frontline', 'Battle Royale'],
  pubgm: ['Classic Squad', 'Classic Duo', 'Classic Solo', 'Team Deathmatch', 'Payload'],
  ludo: ['Classic 1v1', 'Classic 2v2', 'Quick Match'],
  fortnite: ['Battle Royale', 'Zero Build', 'Reload', 'Creative', 'Box Fights'],
};

export const LOBBY_MAP_OPTIONS: Partial<Record<GameKey, string[]>> = {
  codm: ['Nuketown', 'Raid', 'Firing Range', 'Shipment', 'Standoff'],
  pubgm: ['Erangel', 'Livik', 'Miramar', 'Sanhok', 'Vikendi'],
  fortnite: ['Battle Royale Island', 'Reload', 'The Pit', 'Zone Wars'],
};

const SCORE_REPORTED_GAMES = new Set<GameKey>(['fc26', 'efootball', 'nba2k26']);

export function getCanonicalGameKey(gameKey: GameKey): GameKey {
  return GAMES[gameKey]?.canonicalGame ?? gameKey;
}

export function getSelectableGames(): GameDefinition[] {
  return (Object.keys(GAMES) as GameKey[])
    .map((key) => GAMES[key])
    .filter((game) => !game.hidden && getCanonicalGameKey(game.key) === game.key);
}

export function getGame(gameKey: GameKey): GameDefinition {
  return GAMES[getCanonicalGameKey(gameKey)];
}

export function supportsLobbyMode(gameKey: GameKey): boolean {
  const game = getGame(gameKey);
  return game.mode === 'lobby' || Boolean(game.supportsLobby);
}

export function requiresScoreReport(gameKey: GameKey): boolean {
  return SCORE_REPORTED_GAMES.has(getCanonicalGameKey(gameKey));
}

export function getGamePlatformKey(gameKey: GameKey): string {
  return `platform:${getCanonicalGameKey(gameKey)}`;
}

export function getGameIdKey(gameKey: GameKey, platform: PlatformKey): string {
  return platform === 'mobile' ? `${getCanonicalGameKey(gameKey)}:mobile` : platform;
}

export function getGameIdLabel(gameKey: GameKey, platform: PlatformKey): string {
  if (platform === 'mobile') {
    return `${getGame(gameKey).label} ID`;
  }

  return PLATFORMS[platform].idLabel;
}

export function getGameIdPlaceholder(gameKey: GameKey, platform: PlatformKey): string {
  if (platform !== 'mobile') {
    return PLATFORMS[platform].placeholder;
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
    default:
      return 'In-game ID';
  }
}

export function buildGameSetup(gameKey: GameKey, platform: PlatformKey, gameId: string) {
  const canonicalGame = getCanonicalGameKey(gameKey);

  return {
    selected_games: [canonicalGame],
    platforms: [platform],
    game_ids: {
      [getGamePlatformKey(canonicalGame)]: platform,
      [getGameIdKey(canonicalGame, platform)]: gameId.trim(),
    },
  };
}

export function getConfiguredPlatform(
  gameKey: GameKey,
  gameIds: Record<string, string> = {},
  platforms: PlatformKey[] = []
): PlatformKey | null {
  const canonicalGame = getCanonicalGameKey(gameKey);
  const configuredPlatform = gameIds[getGamePlatformKey(canonicalGame)] as PlatformKey | undefined;
  if (configuredPlatform && getGame(canonicalGame).platforms.includes(configuredPlatform)) {
    return configuredPlatform;
  }

  const [onlyPlatform] = getGame(canonicalGame).platforms;
  if (getGame(canonicalGame).platforms.length === 1) {
    return onlyPlatform ?? null;
  }

  return platforms.find((platform) => getGame(canonicalGame).platforms.includes(platform)) ?? null;
}

export function getConfiguredGameId(
  gameKey: GameKey,
  platform: PlatformKey | null | undefined,
  gameIds: Record<string, string> = {}
): string {
  if (!platform) return '';

  return gameIds[getGameIdKey(gameKey, platform)] ?? gameIds[platform] ?? '';
}

export function getDefaultLobbyMode(gameKey: GameKey): string {
  return LOBBY_MODE_OPTIONS[getCanonicalGameKey(gameKey)]?.[0] ?? getGame(gameKey).mode;
}

export function getDefaultLobbyMap(gameKey: GameKey): string {
  return LOBBY_MAP_OPTIONS[getCanonicalGameKey(gameKey)]?.[0] ?? '';
}
