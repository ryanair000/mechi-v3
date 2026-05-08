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
  getOnlineTournamentLobbySize,
} from '@/lib/online-tournament-ops';

export type OnlineTournamentSafeRegistration = {
  id: string;
  user_id: string;
  game: OnlineTournamentGameKey;
  in_game_username: string;
  game_uid: string | null;
  username: string;
  reward_eligible: boolean;
  eligibility_status: string;
  check_in_status: string;
  device_model: string | null;
  device_serial_last6: string | null;
  whatsapp_number: string | null;
  tournament_lobby_number: number | null;
  tournament_lobby_slot: number | null;
  tournament_lobby_assigned_at: string | null;
  checked_in_at: string | null;
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
  'id, event_slug, user_id, game, in_game_username, game_uid, phone, whatsapp_number, device_model, device_serial_last6, tournament_lobby_number, tournament_lobby_slot, tournament_lobby_assigned_at, email, instagram_username, youtube_name, followed_instagram, subscribed_youtube, available_at_8pm, accepted_rules, reward_eligible, eligibility_status, check_in_status, checked_in_at, admin_note, created_at, updated_at, user:user_id(id, username, phone, email, role, is_banned)';

const SUBMISSION_SELECT =
  'id, event_slug, game, registration_id, user_id, room_id, fixture_id, match_number, kills, placement, player1_score, player2_score, reported_winner_registration_id, screenshot_url, screenshot_public_id, ocr_status, ocr_text, ocr_confidence, ocr_kills, ocr_placement, ocr_error, ocr_scanned_at, status, admin_note, submitted_by, verified_by, verified_at, created_at, updated_at, registration:registration_id(id, in_game_username, game, user_id)';

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
    game_uid: registration.game_uid,
    username: registration.user?.username ?? registration.in_game_username,
    reward_eligible: registration.reward_eligible,
    eligibility_status: registration.eligibility_status,
    check_in_status: registration.check_in_status,
    device_model: registration.device_model,
    device_serial_last6: registration.device_serial_last6,
    whatsapp_number: registration.whatsapp_number,
    tournament_lobby_number: registration.tournament_lobby_number,
    tournament_lobby_slot: registration.tournament_lobby_slot,
    tournament_lobby_assigned_at: registration.tournament_lobby_assigned_at,
    checked_in_at: registration.checked_in_at,
    created_at: registration.created_at,
  };
}

type LobbyAssignmentRegistration = Pick<
  OnlineTournamentRegistrationOpsRow,
  | 'id'
  | 'event_slug'
  | 'user_id'
  | 'game'
  | 'in_game_username'
  | 'game_uid'
  | 'device_model'
  | 'whatsapp_number'
  | 'device_serial_last6'
  | 'check_in_status'
  | 'eligibility_status'
  | 'tournament_lobby_number'
  | 'tournament_lobby_slot'
  | 'tournament_lobby_assigned_at'
>;

type LobbySlotRow = Pick<
  OnlineTournamentRegistrationOpsRow,
  'tournament_lobby_number' | 'tournament_lobby_slot'
>;

function isUniqueViolation(error: unknown) {
  return Boolean(
    error &&
      typeof error === 'object' &&
      (error as { code?: string }).code === '23505'
  );
}

function hasTournamentCheckInIdentity(
  registration: Pick<
    OnlineTournamentRegistrationOpsRow,
    'in_game_username' | 'game_uid' | 'device_model' | 'whatsapp_number'
  >
) {
  return Boolean(
    registration.in_game_username?.trim() &&
      registration.game_uid?.trim() &&
      registration.device_model?.trim() &&
      registration.whatsapp_number?.trim()
  );
}

function getNextLobbySlot(rows: LobbySlotRow[], lobbySize: number) {
  const usedSlots = new Set(
    rows
      .filter((row) => row.tournament_lobby_number && row.tournament_lobby_slot)
      .map((row) => `${row.tournament_lobby_number}:${row.tournament_lobby_slot}`)
  );
  const maxLobby = Math.max(1, Math.ceil((usedSlots.size + 1) / lobbySize) + 1);

  for (let lobbyNumber = 1; lobbyNumber <= maxLobby; lobbyNumber += 1) {
    for (let slot = 1; slot <= lobbySize; slot += 1) {
      if (!usedSlots.has(`${lobbyNumber}:${slot}`)) {
        return { lobbyNumber, slot };
      }
    }
  }

  return { lobbyNumber: maxLobby + 1, slot: 1 };
}

export async function assignOnlineTournamentLobbySlot(params: {
  supabase: SupabaseClient;
  registrationId: string;
  eventSlug: string;
  userId?: string;
  game: OnlineTournamentGameKey;
}) {
  const { supabase, registrationId, eventSlug, userId, game } = params;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    let currentQuery = supabase
      .from('online_tournament_registrations')
      .select(
        'id, event_slug, user_id, game, in_game_username, game_uid, device_model, whatsapp_number, device_serial_last6, eligibility_status, check_in_status, tournament_lobby_number, tournament_lobby_slot, tournament_lobby_assigned_at'
      )
      .eq('id', registrationId)
      .eq('event_slug', eventSlug)
      .eq('game', game);

    if (userId) {
      currentQuery = currentQuery.eq('user_id', userId);
    }

    const { data: currentRaw, error: currentError } = await currentQuery.maybeSingle();
    if (currentError) {
      throw currentError;
    }

    const current = currentRaw as LobbyAssignmentRegistration | null;
    if (
      !current ||
      current.check_in_status !== 'checked_in' ||
      current.eligibility_status === 'disqualified' ||
      !hasTournamentCheckInIdentity(current)
    ) {
      return current;
    }

    if (current.tournament_lobby_number && current.tournament_lobby_slot) {
      return current;
    }

    const { data: assignedRowsRaw, error: assignedRowsError } = await supabase
      .from('online_tournament_registrations')
      .select('tournament_lobby_number, tournament_lobby_slot')
      .eq('event_slug', eventSlug)
      .eq('game', game)
      .eq('check_in_status', 'checked_in')
      .neq('eligibility_status', 'disqualified')
      .neq('game_uid', '')
      .neq('device_model', '')
      .neq('whatsapp_number', '')
      .not('tournament_lobby_number', 'is', null)
      .not('tournament_lobby_slot', 'is', null)
      .order('tournament_lobby_number', { ascending: true })
      .order('tournament_lobby_slot', { ascending: true });

    if (assignedRowsError) {
      throw assignedRowsError;
    }

    const { lobbyNumber, slot } = getNextLobbySlot(
      (assignedRowsRaw ?? []) as LobbySlotRow[],
      getOnlineTournamentLobbySize(game)
    );
    const now = new Date().toISOString();
    const { data: updatedRaw, error: updateError } = await supabase
      .from('online_tournament_registrations')
      .update({
        tournament_lobby_number: lobbyNumber,
        tournament_lobby_slot: slot,
        tournament_lobby_assigned_at: now,
        updated_at: now,
      })
      .eq('id', registrationId)
      .eq('event_slug', eventSlug)
      .eq('game', game)
      .eq('check_in_status', 'checked_in')
      .is('tournament_lobby_number', null)
      .is('tournament_lobby_slot', null)
      .select(
        'id, event_slug, user_id, game, eligibility_status, check_in_status, tournament_lobby_number, tournament_lobby_slot, tournament_lobby_assigned_at'
      )
      .maybeSingle();

    if (updateError) {
      if (isUniqueViolation(updateError)) {
        continue;
      }

      throw updateError;
    }

    const updated = updatedRaw as LobbyAssignmentRegistration | null;
    if (updated) {
      return updated;
    }
  }

  throw new Error('Could not assign tournament lobby slot');
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
    .filter(
      (registration) =>
        registration.check_in_status === 'checked_in' &&
        registration.eligibility_status !== 'disqualified'
    )
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
          game_uid: standing.registration.game_uid,
          username: standing.registration.in_game_username,
          reward_eligible: false,
          eligibility_status: standing.registration.eligibility_status,
          check_in_status: standing.registration.check_in_status,
          device_model: standing.registration.device_model,
          device_serial_last6: standing.registration.device_serial_last6,
          whatsapp_number: standing.registration.whatsapp_number,
          tournament_lobby_number: standing.registration.tournament_lobby_number,
          tournament_lobby_slot: standing.registration.tournament_lobby_slot,
          tournament_lobby_assigned_at: standing.registration.tournament_lobby_assigned_at,
          checked_in_at: standing.registration.checked_in_at,
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
