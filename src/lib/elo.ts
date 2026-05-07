import type { EloResult } from '@/types';
import { getTier } from './config';

const K_FACTOR = 32;

export function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

export function calculateElo(winnerRating: number, loserRating: number): EloResult {
  const expectedWinner = expectedScore(winnerRating, loserRating);
  const expectedLoser = expectedScore(loserRating, winnerRating);

  const changeWinner = Math.round(K_FACTOR * (1 - expectedWinner));
  const changeLoser = Math.round(K_FACTOR * (0 - expectedLoser));

  return {
    newRatingWinner: Math.max(0, winnerRating + changeWinner),
    newRatingLoser: Math.max(0, loserRating + changeLoser),
    changeWinner,
    changeLoser,
  };
}

export { getTier };

export function formatRatingChange(change: number): string {
  if (change > 0) return `+${change}`;
  return `${change}`;
}

export function getRatingForGame(
  profile: Record<string, unknown>,
  game: string
): number {
  const key = `rating_${game}`;
  return (profile[key] as number) ?? 1000;
}
