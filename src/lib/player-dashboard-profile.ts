import {
  GAMES,
  getConfiguredPlatformForGame,
  getGameIdValue,
  normalizeGameIdKeys,
  normalizeSelectedGameKeys,
} from '@/lib/config';
import type { DashboardRow } from '@/lib/player-dashboard-queries';
import type { GameKey, PlatformKey } from '@/types';

export function dashboardGameLabel(value: unknown) {
  const key = String(value ?? '') as GameKey;
  return GAMES[key]?.label ?? String(value ?? 'Game').replaceAll('_', ' ');
}

export function buildDashboardProfileSetup(profile: DashboardRow) {
  const selectedGames = normalizeSelectedGameKeys(
    Array.isArray(profile.selected_games) ? profile.selected_games.map(String) : []
  );
  const gameIds = normalizeGameIdKeys(
    profile.game_ids && typeof profile.game_ids === 'object'
      ? (profile.game_ids as Record<string, string>)
      : {}
  );
  const platforms = Array.isArray(profile.platforms)
    ? (profile.platforms.map(String) as PlatformKey[])
    : [];
  const incompleteGames = selectedGames.filter((game) => {
    const platform = getConfiguredPlatformForGame(game, gameIds, platforms);
    return !platform || !getGameIdValue(gameIds, game, platform).trim();
  });
  const incompleteGame = incompleteGames[0];
  const blocker =
    selectedGames.length === 0
      ? {
          label: 'Choose a game to start playing',
          description:
            'Add at least one game and the player name or ID opponents will need.',
        }
      : incompleteGame
        ? {
            label: `Finish ${dashboardGameLabel(incompleteGame)} setup`,
            description: `Add the ${dashboardGameLabel(incompleteGame)} player name or ID opponents will need.`,
          }
        : null;

  return {
    selectedGames,
    blocker,
    response: {
      complete: !blocker,
      selected_game_count: selectedGames.length,
      configured_game_count: selectedGames.length - incompleteGames.length,
      blocker,
    },
  };
}
