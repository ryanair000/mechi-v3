import {
  ONLINE_TOURNAMENT_CASH_PRIZE_POOL,
  ONLINE_TOURNAMENT_ENTRY_PRICING,
  formatEatDateTime,
  formatTournamentKes,
  type OnlineTournamentGameConfig,
} from '@/lib/online-tournament';
import {
  WEEKEND_CUP_ACTIVE_PAYMENT_TIER,
  WEEKEND_CUP_PRIZE_POOL_LABEL,
  getWeekendCupPaymentTierAmount,
  getWeekendCupPaymentTierLabel,
} from '@/lib/weekend-cup';
import {
  CUSTOMER_WHATSAPP_SUPPORT_NUMBER_LABEL,
  PLAYMECHI_SOCIAL_HANDLE,
} from '@/lib/social-links';

export function getPrizePoolFromGamePrizes(game: OnlineTournamentGameConfig) {
  return [
    game.firstPrize,
    game.secondPrize,
    game.thirdPrize,
    game.fourthPrize,
    game.fifthPrize,
  ]
    .filter(Boolean)
    .join(' / ');
}

export function getGameRulesLabel(game: OnlineTournamentGameConfig) {
  return `${game.format}. ${game.matchCount}. ${game.scoring}`;
}

export function getOnlineTournamentGameFacts(game: OnlineTournamentGameConfig) {
  return [
    { label: 'Game', value: game.label },
    { label: 'Entry fee', value: ONLINE_TOURNAMENT_ENTRY_PRICING.entryFromLabel },
    {
      label: 'Prize pool',
      value: `${formatTournamentKes(ONLINE_TOURNAMENT_CASH_PRIZE_POOL)} total; ${getPrizePoolFromGamePrizes(game)}`,
    },
    { label: 'Deadline', value: formatEatDateTime(game.registrationClosesAt) },
    { label: 'Slots', value: 'Limited slots available' },
    { label: 'Check-in time', value: 'Match-day check-in before room or bracket access' },
    ...(game.mapsLabel ? [{ label: 'Maps', value: game.mapsLabel }] : []),
    { label: 'Match rules', value: getGameRulesLabel(game) },
    { label: 'Payout method', value: 'Cash prizes and game currency are reviewed by PlayMechi ops' },
    { label: 'Support contact', value: `WhatsApp ${CUSTOMER_WHATSAPP_SUPPORT_NUMBER_LABEL}` },
  ];
}

export function getWeekendCupGameFacts(game: OnlineTournamentGameConfig) {
  return [
    { label: 'Game', value: game.label },
    {
      label: 'Entry fee',
      value: `${getWeekendCupPaymentTierLabel(WEEKEND_CUP_ACTIVE_PAYMENT_TIER)} KSh ${getWeekendCupPaymentTierAmount(WEEKEND_CUP_ACTIVE_PAYMENT_TIER, game.game)}`,
    },
    { label: 'Prize pool', value: `${WEEKEND_CUP_PRIZE_POOL_LABEL}; ${getPrizePoolFromGamePrizes(game)}` },
    { label: 'Deadline', value: formatEatDateTime(game.registrationClosesAt) },
    { label: 'Slots', value: 'Limited slots available' },
    { label: 'Check-in time', value: 'Dashboard check-in opens before match time' },
    ...(game.mapsLabel ? [{ label: 'Maps', value: game.mapsLabel }] : []),
    { label: 'Match rules', value: getGameRulesLabel(game) },
    { label: 'Payout method', value: 'Paystack-verified entries; prizes handled by PlayMechi ops' },
    { label: 'Support contact', value: `WhatsApp ${CUSTOMER_WHATSAPP_SUPPORT_NUMBER_LABEL}` },
  ];
}

export function getPlayMechiSupportLabel() {
  return `WhatsApp ${CUSTOMER_WHATSAPP_SUPPORT_NUMBER_LABEL} or @${PLAYMECHI_SOCIAL_HANDLE}`;
}
