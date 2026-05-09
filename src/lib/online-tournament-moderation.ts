import type { SupabaseClient } from '@supabase/supabase-js';
import {
  buildBattleRoyaleStandings,
  isBattleRoyaleTournamentGame,
  type OnlineTournamentBattleRoyaleStanding,
} from '@/lib/online-tournament-ops';
import { type OnlineTournamentGameKey } from '@/lib/online-tournament';
import {
  loadOnlineTournamentOpsState,
  type OnlineTournamentOpsState,
} from '@/lib/online-tournament-store';

export type OnlineTournamentOpsDashboardState = OnlineTournamentOpsState & {
  standings: Record<'pubgm' | 'codm', OnlineTournamentBattleRoyaleStanding[]>;
};

export async function buildOnlineTournamentOpsDashboardState(
  supabase: SupabaseClient
): Promise<OnlineTournamentOpsDashboardState> {
  const state = await loadOnlineTournamentOpsState(supabase);

  return {
    ...state,
    standings: {
      pubgm: buildBattleRoyaleStandings({
        game: 'pubgm',
        registrations: state.registrations,
        submissions: state.submissions,
      }),
      codm: buildBattleRoyaleStandings({
        game: 'codm',
        registrations: state.registrations,
        submissions: state.submissions,
      }),
    },
  };
}

export function filterOnlineTournamentDashboardStateByGame(
  state: OnlineTournamentOpsDashboardState,
  game: OnlineTournamentGameKey
): OnlineTournamentOpsDashboardState {
  return {
    registrations: state.registrations.filter((registration) => registration.game === game),
    rooms: isBattleRoyaleTournamentGame(game)
      ? state.rooms.filter((room) => room.game === game)
      : [],
    fixtures: game === 'efootball' ? state.fixtures : [],
    submissions: state.submissions.filter((submission) => submission.game === game),
    disputes: state.disputes.filter((dispute) => dispute.game === game),
    payouts: state.payouts.filter((payout) => payout.game === game),
    standings: {
      pubgm: game === 'pubgm' ? state.standings.pubgm : [],
      codm: game === 'codm' ? state.standings.codm : [],
    },
  };
}
