export type ModeratorTournamentGameKey = 'pubgm' | 'codm' | 'efootball' | 'freefire';

export type ModeratorTournamentKey =
  | 'playmechi_codm'
  | 'playmechi_pubgm'
  | 'playmechi_efootball'
  | 'playmechi_freefire'
  | 'weekendcup_pubgm'
  | 'weekendcup_codm'
  | 'weekendcup_efootball'
  | 'weekendcup_freefire'
  | 'days_esports_tz_efootball'
  | 'weka_mawe_efootball';

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
    game: 'freefire',
    key: 'playmechi_freefire',
    label: 'PlayMechi Free Fire',
    shortLabel: 'Free Fire',
  },
  {
    game: 'pubgm',
    key: 'weekendcup_pubgm',
    label: 'Weekend Cup PUBG',
    shortLabel: 'WC PUBG',
  },
  {
    game: 'codm',
    key: 'weekendcup_codm',
    label: 'Weekend Cup CODM',
    shortLabel: 'WC CODM',
  },
  {
    game: 'efootball',
    key: 'weekendcup_efootball',
    label: 'Weekend Cup eFootball',
    shortLabel: 'WC eFootball',
  },
  {
    game: 'freefire',
    key: 'weekendcup_freefire',
    label: 'Weekend Cup Free Fire',
    shortLabel: 'WC Free Fire',
  },
  {
    game: 'efootball',
    key: 'days_esports_tz_efootball',
    label: 'Days Esports Tanzania',
    shortLabel: 'TZ eFootball',
  },
  {
    game: 'efootball',
    key: 'weka_mawe_efootball',
    label: 'Weka Mawe eFootball',
    shortLabel: 'Weka Mawe',
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
