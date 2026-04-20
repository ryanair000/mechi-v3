export const CONFIRMED_PAYMENT_STATUSES = ['paid', 'free'] as const;
export const ACTIVE_TOURNAMENT_PLAYER_STATUSES = ['pending', ...CONFIRMED_PAYMENT_STATUSES] as const;

type TournamentPaymentStatusRow = {
  payment_status: string | null | undefined;
};

export function isActiveTournamentPlayerStatus(status: string | null | undefined): boolean {
  return Boolean(
    status &&
      ACTIVE_TOURNAMENT_PLAYER_STATUSES.includes(
        status as (typeof ACTIVE_TOURNAMENT_PLAYER_STATUSES)[number]
      )
  );
}

export function getTournamentPaymentMetrics(players: TournamentPaymentStatusRow[]) {
  return players.reduce(
    (metrics, player) => {
      const status = player.payment_status;
      if (isActiveTournamentPlayerStatus(status)) {
        metrics.activeCount += 1;
      }
      if (
        status &&
        CONFIRMED_PAYMENT_STATUSES.includes(
          status as (typeof CONFIRMED_PAYMENT_STATUSES)[number]
        )
      ) {
        metrics.confirmedCount += 1;
      }
      if (status === 'paid') {
        metrics.paidCount += 1;
      }
      return metrics;
    },
    { activeCount: 0, confirmedCount: 0, paidCount: 0 }
  );
}

export function getTournamentPrize(entryFee: number, paidPlayerCount: number, feeRate = 5) {
  const gross = Math.max(0, entryFee) * Math.max(0, paidPlayerCount);
  const platformFee = Math.floor((gross * Math.max(0, feeRate)) / 100);
  return {
    gross,
    platformFee,
    prizePool: Math.max(0, gross - platformFee),
  };
}

export function getTournamentPrizeSnapshot(params: {
  entryFee: number;
  paidPlayerCount: number;
  feeRate?: number | null;
  storedPrizePool?: number | null;
  storedPlatformFee?: number | null;
}) {
  const {
    entryFee,
    paidPlayerCount,
    feeRate = 5,
    storedPrizePool = 0,
    storedPlatformFee = 0,
  } = params;
  const safeStoredPrizePool = Math.max(0, Number(storedPrizePool ?? 0));
  const safeStoredPlatformFee = Math.max(0, Number(storedPlatformFee ?? 0));
  const safeFeeRate = Number(feeRate ?? 5);

  if (entryFee <= 0) {
    return {
      gross: safeStoredPrizePool,
      platformFee: safeStoredPlatformFee,
      prizePool: safeStoredPrizePool,
    };
  }

  return getTournamentPrize(entryFee, paidPlayerCount, safeFeeRate);
}
