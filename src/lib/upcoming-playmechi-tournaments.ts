import {
  WEEKEND_CUP_ENTRY_PRICING,
  WEEKEND_CUP_EVENT_DATES,
  WEEKEND_CUP_GAMES,
  WEEKEND_CUP_PRIZE_POOL_LABEL,
  WEEKEND_CUP_PUBLIC_PATH,
  WEEKEND_CUP_SLUG,
  WEEKEND_CUP_STREAM_LABEL,
  WEEKEND_CUP_TITLE,
  WEEKEND_CUP_TOTAL_SLOTS,
} from '@/lib/weekend-cup';

export type UpcomingPlayMechiTournamentGame = {
  key: 'pubgm' | 'codm' | 'efootball' | 'mystery' | 'freefire';
  label: string;
  dateLabel: string;
  slots: number;
  prizes: string[];
};

export type UpcomingPlayMechiTournament = {
  id: string;
  slug: string;
  publicPath: string;
  title: string;
  datesLabel: string;
  heroLabel: string;
  prizePoolLabel: string;
  pricingLabel: string;
  confirmationLabel: string;
  streamLabel: string;
  totalSlotsLabel: string;
  games: UpcomingPlayMechiTournamentGame[];
};

export const WEEKEND_CUP_ROUTE_ENABLED = true;

export const UPCOMING_PLAYMECHI_TOURNAMENTS: UpcomingPlayMechiTournament[] = [
  {
    id: 'playmechi-weekend-cup-season-1',
    slug: WEEKEND_CUP_SLUG,
    publicPath: WEEKEND_CUP_PUBLIC_PATH,
    title: WEEKEND_CUP_TITLE,
    datesLabel: WEEKEND_CUP_EVENT_DATES,
    heroLabel: '3 Games. 3 Days. Season 1 starts 29 May.',
    prizePoolLabel: WEEKEND_CUP_PRIZE_POOL_LABEL,
    pricingLabel: `${WEEKEND_CUP_ENTRY_PRICING.entryFromLabel}. ${WEEKEND_CUP_ENTRY_PRICING.pricingLineLabel}.`,
    confirmationLabel: WEEKEND_CUP_ENTRY_PRICING.earlyBirdPolicyLabel,
    streamLabel: WEEKEND_CUP_STREAM_LABEL,
    totalSlotsLabel: `${WEEKEND_CUP_TOTAL_SLOTS} total target slots`,
    games: WEEKEND_CUP_GAMES.map((game) => ({
      key: game.game,
      label: game.label,
      dateLabel: game.dateLabel,
      slots: game.slots,
      prizes: [game.firstPrize, game.secondPrize, game.thirdPrize, game.fourthPrize, game.fifthPrize].filter(
        (prize): prize is string => Boolean(prize)
      ),
    })),
  },
];

export const PRIMARY_UPCOMING_PLAYMECHI_TOURNAMENT =
  UPCOMING_PLAYMECHI_TOURNAMENTS[0] ?? null;
