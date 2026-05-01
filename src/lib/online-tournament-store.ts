import type { SupabaseClient } from '@supabase/supabase-js';
import {
  ONLINE_TOURNAMENT_SLUG,
  type OnlineTournamentGameKey,
} from '@/lib/online-tournament';
import {
  buildBattleRoyaleStandings,
  maskRoomForPlayer,
  type OnlineTournamentBattleRoyaleStanding,
  type OnlineTournamentFixture,
  type OnlineTournamentRegistrationOpsRow,
  type OnlineTournamentResultSubmission,
  type OnlineTournamentRoom,
  type OnlineTournamentDispute,
  type OnlineTournamentPayout,
} from '@/lib/online-tournament-ops';

export type OnlineTournamentSafeRegistration = {
  id: string;
  user_id: string;
  game: OnlineTournamentGameKey;
  in_game_username: string;
  username: string;
  reward_eligible: boolean;
  eligibility_status: string;
  check_in_status: string;
  created_at: string;
};

export type OnlineTournamentSafeStanding = Omit<
  OnlineTournamentBattleRoyaleStanding,
  'registration'
> & {
  registration: OnlineTournamentSafeRegistration;
};

export type OnlineTournamentSafeFixture = OnlineTournamentFixture & {
  player1: OnlineTournamentSafeRegistration | null;
  player2: OnlineTournamentSafeRegistration | null;
  winner: OnlineTournamentSafeRegistration | null;
};

export type OnlineTournamentOpsState = {
  registrations: OnlineTournamentRegistrationOpsRow[];
  rooms: OnlineTournamentRoom[];
  fixtures: OnlineTournamentFixture[];
  submissions: OnlineTournamentResultSubmission[];
  disputes: OnlineTournamentDispute[];
  payouts: OnlineTournamentPayout[];
};

export type OnlineTournamentPlayerState = {
  roster: OnlineTournamentSafeRegistration[];
  myRegistrations: OnlineTournamentRegistrationOpsRow[];
  rooms: Array<ReturnType<typeof maskRoomForPlayer>>;
  fixtures: OnlineTournamentSafeFixture[];
  standings: Partial<Record<'pubgm' | 'codm', OnlineTournamentSafeStanding[]>>;
  mySubmissions: OnlineTournamentResultSubmission[];
  disputes: OnlineTournamentDispute[];
  payouts: OnlineTournamentPayout[];
};

const REGISTRATION_SELECT =
  'id, event_slug, user_id, game, in_game_username, phone, whatsapp_number, email, instagram_username, youtube_name, followed_instagram, subscribed_youtube, available_at_8pm, accepted_rules, reward_eligible, eligibility_status, check_in_status, admin_note, created_at, updated_at, user:user_id(id, username, phone, email)';

const SUBMISSION_SELECT =
  'id, event_slug, game, registration_id, user_id, room_id, fixture_id, match_number, kills, placement, player1_score, player2_score, reported_winner_registration_id, screenshot_url, screenshot_public_id, status, admin_note, submitted_by, verified_by, verified_at, created_at, updated_at, registration:registration_id(id, in_game_username, game, user_id)';

function ensureArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

function isMissingOpsTableError(error: unknown) {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const candidate = error as {
    code?: string;
    details?: string;
    message?: string;
  };
  const text = [candidate.code, candidate.details, candidate.message]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return (
    text.includes('online_tournament_') &&
    (text.includes('42p01') ||
      text.includes('pgrst') ||
      text.includes('does not exist') ||
      text.includes('schema cache'))
  );
}

function optionalOpsArray<T>(result: { data: unknown; error: unknown }): T[] {
  if (result.error) {
    if (isMissingOpsTableError(result.error)) {
      return [];
    }

    throw result.error;
  }

  return ensureArray(result.data as T[] | null);
}

export function toSafeRegistration(
  registration: OnlineTournamentRegistrationOpsRow | null | undefined
): OnlineTournamentSafeRegistration | null {
  if (!registration) return null;

  return {
    id: registration.id,
    user_id: registration.user_id,
    game: registration.game,
    in_game_username: registration.in_game_username,
    username: registration.user?.username ?? registration.in_game_username,
    reward_eligible: registration.reward_eligible,
    eligibility_status: registration.eligibility_status,
    check_in_status: registration.check_in_status,
    created_at: registration.created_at,
  };
}

export async function loadOnlineTournamentOpsState(
  supabase: SupabaseClient
): Promise<OnlineTournamentOpsState> {
  const [
    registrationsResult,
    roomsResult,
    fixturesResult,
    submissionsResult,
    disputesResult,
    payoutsResult,
  ] = await Promise.all([
    supabase
      .from('online_tournament_registrations')
      .select(REGISTRATION_SELECT)
      .eq('event_slug', ONLINE_TOURNAMENT_SLUG)
      .order('game', { ascending: true })
      .order('created_at', { ascending: true }),
    supabase
      .from('online_tournament_rooms')
      .select('*')
      .eq('event_slug', ONLINE_TOURNAMENT_SLUG)
      .order('game', { ascending: true })
      .order('match_number', { ascending: true }),
    supabase
      .from('online_tournament_fixtures')
      .select('*')
      .eq('event_slug', ONLINE_TOURNAMENT_SLUG)
      .order('round', { ascending: true })
      .order('slot', { ascending: true }),
    supabase
      .from('online_tournament_result_submissions')
      .select(SUBMISSION_SELECT)
      .eq('event_slug', ONLINE_TOURNAMENT_SLUG)
      .order('created_at', { ascending: false }),
    supabase
      .from('online_tournament_disputes')
      .select('*')
      .eq('event_slug', ONLINE_TOURNAMENT_SLUG)
      .order('created_at', { ascending: false }),
    supabase
      .from('online_tournament_payouts')
      .select('*')
      .eq('event_slug', ONLINE_TOURNAMENT_SLUG)
      .order('game', { ascending: true })
      .order('placement', { ascending: true }),
  ]);

  if (registrationsResult.error) {
    throw registrationsResult.error;
  }

  return {
    registrations: ensureArray(
      registrationsResult.data as unknown as OnlineTournamentRegistrationOpsRow[] | null
    ),
    rooms: optionalOpsArray<OnlineTournamentRoom>(roomsResult),
    fixtures: optionalOpsArray<OnlineTournamentFixture>(fixturesResult),
    submissions: optionalOpsArray<OnlineTournamentResultSubmission>(submissionsResult),
    disputes: optionalOpsArray<OnlineTournamentDispute>(disputesResult),
    payouts: optionalOpsArray<OnlineTournamentPayout>(payoutsResult),
  };
}

export function buildPlayerTournamentState(params: {
  state: OnlineTournamentOpsState;
  userId: string;
}): OnlineTournamentPlayerState {
  const { state, userId } = params;
  const roster = state.registrations
    .map(toSafeRegistration)
    .filter((registration): registration is OnlineTournamentSafeRegistration =>
      Boolean(registration)
    );
  const registrationById = new Map(
    state.registrations.map((registration) => [registration.id, registration])
  );
  const myRegistrations = state.registrations.filter(
    (registration) => registration.user_id === userId
  );
  const myRegistrationIds = new Set(myRegistrations.map((registration) => registration.id));
  const standings: Partial<Record<'pubgm' | 'codm', OnlineTournamentSafeStanding[]>> = {};

  for (const game of ['pubgm', 'codm'] as const) {
    standings[game] = buildBattleRoyaleStandings({
      game,
      registrations: state.registrations,
      submissions: state.submissions,
    }).map((standing) => ({
      ...standing,
      registration:
        toSafeRegistration(standing.registration) ??
        ({
          id: standing.registration.id,
          user_id: standing.registration.user_id,
          game: standing.registration.game,
          in_game_username: standing.registration.in_game_username,
          username: standing.registration.in_game_username,
          reward_eligible: false,
          eligibility_status: standing.registration.eligibility_status,
          check_in_status: standing.registration.check_in_status,
          created_at: standing.registration.created_at,
        } satisfies OnlineTournamentSafeRegistration),
    }));
  }

  const fixtures = state.fixtures.map((fixture) => ({
    ...fixture,
    player1: toSafeRegistration(registrationById.get(fixture.player1_registration_id ?? '')),
    player2: toSafeRegistration(registrationById.get(fixture.player2_registration_id ?? '')),
    winner: toSafeRegistration(registrationById.get(fixture.winner_registration_id ?? '')),
  }));

  return {
    roster,
    myRegistrations,
    rooms: state.rooms.map((room) => maskRoomForPlayer(room)),
    fixtures,
    standings,
    mySubmissions: state.submissions.filter(
      (submission) =>
        submission.user_id === userId ||
        (submission.registration_id
          ? myRegistrationIds.has(submission.registration_id)
          : false)
    ),
    disputes: state.disputes.filter((dispute) => {
      if (dispute.fixture_id) {
        const fixture = state.fixtures.find((item) => item.id === dispute.fixture_id);
        return Boolean(
          fixture?.player1_registration_id &&
            myRegistrationIds.has(fixture.player1_registration_id)
        ) ||
          Boolean(
            fixture?.player2_registration_id &&
              myRegistrationIds.has(fixture.player2_registration_id)
          );
      }

      if (!dispute.result_submission_id) return false;
      const submission = state.submissions.find(
        (item) => item.id === dispute.result_submission_id
      );
      return Boolean(
        submission?.registration_id && myRegistrationIds.has(submission.registration_id)
      );
    }),
    payouts: state.payouts.filter(
      (payout) => payout.registration_id && myRegistrationIds.has(payout.registration_id)
    ),
  };
}

export function getVisibleGameFromSearch(
  value: string | null,
  fallback: OnlineTournamentGameKey = 'pubgm'
): OnlineTournamentGameKey {
  if (value && Object.prototype.hasOwnProperty.call({ pubgm: true, codm: true, efootball: true }, value)) {
    return value as OnlineTournamentGameKey;
  }

  return fallback;
}

export function getFixtureRoundSortValue(round: string) {
  const order = {
    round_of_16: 1,
    quarterfinal: 2,
    semifinal: 3,
    final: 4,
    bronze: 5,
  } as Record<string, number>;

  return order[round] ?? 99;
}

export function sortFixtures(fixtures: OnlineTournamentSafeFixture[]) {
  return [...fixtures].sort((left, right) => {
    const roundDiff = getFixtureRoundSortValue(left.round) - getFixtureRoundSortValue(right.round);
    if (roundDiff !== 0) return roundDiff;
    return left.slot - right.slot;
  });
}

export function getNextEfootballPosition(
  fixture: Pick<OnlineTournamentFixture, 'round' | 'slot'>
): { round: 'quarterfinal' | 'semifinal' | 'final'; slot: number; side: 'player1_registration_id' | 'player2_registration_id' } | null {
  if (fixture.round === 'round_of_16') {
    return {
      round: 'quarterfinal',
      slot: Math.floor(fixture.slot / 2),
      side: fixture.slot % 2 === 0 ? 'player1_registration_id' : 'player2_registration_id',
    };
  }

  if (fixture.round === 'quarterfinal') {
    return {
      round: 'semifinal',
      slot: Math.floor(fixture.slot / 2),
      side: fixture.slot % 2 === 0 ? 'player1_registration_id' : 'player2_registration_id',
    };
  }

  if (fixture.round === 'semifinal') {
    return {
      round: 'final',
      slot: 0,
      side: fixture.slot % 2 === 0 ? 'player1_registration_id' : 'player2_registration_id',
    };
  }

  return null;
}

export function getBronzeEfootballPosition(
  fixture: Pick<OnlineTournamentFixture, 'round' | 'slot'>
): { slot: number; side: 'player1_registration_id' | 'player2_registration_id' } | null {
  if (fixture.round !== 'semifinal') {
    return null;
  }

  return {
    slot: 0,
    side: fixture.slot % 2 === 0 ? 'player1_registration_id' : 'player2_registration_id',
  };
}
