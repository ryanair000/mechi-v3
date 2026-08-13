import type { DashboardRow } from '@/lib/player-dashboard-queries';
import { hasPlayerReport } from '@/lib/player-dashboard-queries';
import { dashboardGameLabel } from '@/lib/player-dashboard-profile';

export function mapDashboardMatches(rows: DashboardRow[], userId: string) {
  return rows.map((match) => {
    const playerOne = match.player1_id === userId;
    const opponent = (playerOne ? match.player2 : match.player1) as DashboardRow | null;
    return {
      id: match.id,
      game: match.game,
      platform: match.platform,
      status: match.status,
      opponent,
      has_reported: hasPlayerReport(match, playerOne ? 'player1' : 'player2'),
      opponent_has_reported: hasPlayerReport(
        match,
        playerOne ? 'player2' : 'player1'
      ),
      result:
        match.status !== 'completed'
          ? match.status
          : match.winner_id === userId
            ? 'win'
            : match.winner_id
              ? 'loss'
              : 'draw',
      score: playerOne
        ? [match.player1_score, match.player2_score]
        : [match.player2_score, match.player1_score],
      rating_change: playerOne ? match.rating_change_p1 : match.rating_change_p2,
      created_at: match.completed_at ?? match.created_at,
    };
  });
}

export function getDashboardMatchStates(matches: DashboardRow[]) {
  const active = matches.find(
    (match) =>
      match.status === 'pending' &&
      !match.has_reported &&
      !match.opponent_has_reported
  );
  const needsResponse = matches.find(
    (match) =>
      match.status === 'disputed' ||
      (match.status === 'pending' &&
        match.opponent_has_reported &&
        !match.has_reported)
  );
  const waiting = matches.find(
    (match) =>
      match.status === 'pending' &&
      match.has_reported &&
      !match.opponent_has_reported
  );
  return { active, needsResponse, waiting };
}

export function dashboardMatchContext(match?: DashboardRow) {
  if (!match) return null;
  const opponent = (match.opponent ?? {}) as DashboardRow;
  return {
    id: String(match.id),
    opponentName: String(opponent.username ?? 'your opponent'),
    gameLabel: dashboardGameLabel(match.game),
  };
}
