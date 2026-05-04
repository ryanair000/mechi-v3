import type { CountryKey, GameKey, PlatformDefinition, PlatformKey } from '../types';

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
    idLabel: 'In-game username',
    placeholder: 'Exact gamer tag',
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

export function getCanonicalGameKey(gameKey: GameKey): GameKey {
  return gameKey === 'efootball_mobile' ? 'efootball' : gameKey;
}

export function getGamePlatformKey(gameKey: GameKey): string {
  return `platform:${getCanonicalGameKey(gameKey)}`;
}

export function getGameIdKey(gameKey: GameKey, platform: PlatformKey): string {
  return platform === 'mobile' ? `${getCanonicalGameKey(gameKey)}:mobile` : platform;
}

export function getGameIdLabel(gameKey: GameKey, platform: PlatformKey): string {
  if (platform !== 'mobile') {
    return PLATFORMS[platform].idLabel;
  }

  switch (getCanonicalGameKey(gameKey)) {
    case 'codm':
      return 'CODM gamer tag';
    case 'efootball':
      return 'eFootball user ID';
    case 'pubgm':
      return 'PUBG Mobile username or UID';
    default:
      return PLATFORMS.mobile.idLabel;
  }
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
      return 'PUBG Mobile username or UID';
    default:
      return PLATFORMS.mobile.placeholder;
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

export function getConfiguredGameId(
  gameKey: GameKey,
  platform: PlatformKey | null | undefined,
  gameIds: Record<string, string> = {}
): string {
  if (!platform) return '';

  return gameIds[getGameIdKey(gameKey, platform)] ?? gameIds[platform] ?? '';
}
