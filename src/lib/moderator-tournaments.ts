export type ModeratorTournamentGameKey = 'pubgm' | 'codm' | 'efootball';

export type ModeratorTournamentKey =
  | 'playmechi_codm'
  | 'playmechi_pubgm'
  | 'playmechi_efootball'
  | 'days_esports_tz_efootball';

export type ModeratorTournamentOption = {
  game: ModeratorTournamentGameKey;
  key: ModeratorTournamentKey;
  label: string;
  shortLabel: string;
};

export const MODERATOR_TOURNAMENTS: ModeratorTournamentOption[] = [
  {
    game: 'codm',
    key: 'playmechi_codm',
    label: 'PlayMechi CODM',
    shortLabel: 'CODM',
  },
  {
    game: 'pubgm',
    key: 'playmechi_pubgm',
    label: 'PlayMechi PUBG',
    shortLabel: 'PUBG',
  },
  {
    game: 'efootball',
    key: 'playmechi_efootball',
    label: 'PlayMechi eFootball',
    shortLabel: 'eFootball',
  },
  {
    game: 'efootball',
    key: 'days_esports_tz_efootball',
    label: 'Days Esports Tanzania',
    shortLabel: 'TZ eFootball',
  },
];

export const DEFAULT_MODERATOR_TOURNAMENT_KEY: ModeratorTournamentKey = 'playmechi_codm';

export function isModeratorTournamentKey(value: unknown): value is ModeratorTournamentKey {
  return MODERATOR_TOURNAMENTS.some((tournament) => tournament.key === value);
}

export function readModeratorTournamentKeyFromGameIds(
  value: unknown
): ModeratorTournamentKey | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const rawKey = (value as Record<string, unknown>).moderator_tournament_key;
  return isModeratorTournamentKey(rawKey) ? rawKey : null;
}

export function getModeratorTournamentByKey(key: ModeratorTournamentKey) {
  return MODERATOR_TOURNAMENTS.find((tournament) => tournament.key === key) ?? MODERATOR_TOURNAMENTS[0];
}

export function getModeratorTournamentFromGameIds(value: unknown) {
  const key = readModeratorTournamentKeyFromGameIds(value);
  return key ? getModeratorTournamentByKey(key) : null;
}
