import type { OnlineTournamentGameKey } from '@/lib/online-tournament';

export type ModeratorTournamentKey =
  | 'playmechi_codm'
  | 'playmechi_pubgm'
  | 'playmechi_efootball';

export type ModeratorTournamentOption = {
  game: OnlineTournamentGameKey;
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
];

export const DEFAULT_MODERATOR_TOURNAMENT_KEY: ModeratorTournamentKey = 'playmechi_codm';

export function isModeratorTournamentKey(value: unknown): value is ModeratorTournamentKey {
  return MODERATOR_TOURNAMENTS.some((tournament) => tournament.key === value);
}

export function getModeratorTournamentByKey(key: ModeratorTournamentKey) {
  return MODERATOR_TOURNAMENTS.find((tournament) => tournament.key === key) ?? MODERATOR_TOURNAMENTS[0];
}
