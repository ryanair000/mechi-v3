import { ONLINE_TOURNAMENT_SLUG } from '@/lib/online-tournament';
import {
  buildBattleRoyaleStandings,
  type OnlineTournamentBattleRoyaleStanding,
  type OnlineTournamentFixture,
  type OnlineTournamentFixtureRound,
  type OnlineTournamentRegistrationOpsRow,
  type OnlineTournamentResultSubmission,
} from '@/lib/online-tournament-ops';

const FALLBACK_RESULTS_CREATED_AT = '2026-05-13T19:33:00.000Z';

type FallbackPlacementMap = Partial<Record<1 | 2 | 3, number>>;
type FallbackKillMap = Partial<Record<1 | 2 | 3, number>>;

type FallbackPubgmPlayer = {
  order: number;
  name: string;
  matchKills: FallbackKillMap;
  placements?: FallbackPlacementMap;
};

const FALLBACK_PUBGM_PLAYERS: FallbackPubgmPlayer[] = [
  { order: 1, name: 'HM』TOP', matchKills: { 1: 8, 2: 3, 3: 2 }, placements: { 1: 1, 2: 11, 3: 16 } },
  { order: 2, name: 'CallMeSparKi', matchKills: { 1: 3, 2: 2, 3: 2 }, placements: { 1: 2, 2: 10, 3: 3 } },
  { order: 3, name: 'BpxE͜͡thoX炎', matchKills: { 1: 2, 3: 10 }, placements: { 1: 3, 3: 1 } },
  { order: 4, name: 'onlyJAYMIE', matchKills: { 1: 1, 2: 1, 3: 1 }, placements: { 1: 4, 2: 14, 3: 14 } },
  { order: 5, name: 'TC么KÄRIYÕ', matchKills: { 1: 0, 3: 0 }, placements: { 1: 5, 3: 11 } },
  { order: 6, name: 'SB・STAR BORN', matchKills: { 1: 0, 3: 0 }, placements: { 1: 6, 3: 21 } },
  { order: 7, name: 'ROBIN亗SNIPE', matchKills: { 1: 0 }, placements: { 1: 7 } },
  { order: 8, name: 'SB・B3NTOSH', matchKills: { 1: 1, 2: 3, 3: 3 }, placements: { 1: 8, 2: 4, 3: 12 } },
  { order: 9, name: 'KHUBAYB51', matchKills: { 1: 0 }, placements: { 1: 9 } },
  { order: 10, name: '『ST』DEELAN', matchKills: { 1: 0, 3: 0 }, placements: { 1: 10, 3: 19 } },
  { order: 11, name: 'S2GZenos2v1', matchKills: { 1: 0, 2: 0, 3: 1 }, placements: { 1: 11, 2: 16, 3: 24 } },
  { order: 12, name: 'TC么VÉÑÒMG', matchKills: { 1: 0 }, placements: { 1: 12 } },
  { order: 13, name: 'TC么RËBÉL', matchKills: { 1: 0, 2: 0, 3: 0 }, placements: { 1: 13, 2: 15, 3: 17 } },
  { order: 14, name: 'RoW・ESCANOR', matchKills: { 1: 2 }, placements: { 1: 14 } },
  { order: 15, name: 'tayshotzzz', matchKills: { 1: 0 }, placements: { 1: 15 } },
  { order: 16, name: 'nellycool23', matchKills: { 1: 0, 2: 0, 3: 0 }, placements: { 1: 16, 2: 9, 3: 7 } },
  { order: 17, name: 'VB丨RAKSHA', matchKills: { 1: 0, 3: 0 }, placements: { 1: 17, 3: 20 } },
  { order: 18, name: 'GNFxPAPJ', matchKills: { 1: 0, 2: 0 }, placements: { 1: 18, 2: 12 } },
  { order: 19, name: '7TS亗MUFASA。', matchKills: { 1: 0, 3: 0 }, placements: { 1: 19, 3: 8 } },
  { order: 20, name: 'FÊÄRMËAGAIN', matchKills: { 1: 0, 3: 2 }, placements: { 1: 20, 3: 18 } },
  { order: 21, name: 'GodLike | Kaal', matchKills: { 2: 6 }, placements: { 2: 1 } },
  { order: 22, name: '『m尺』SLAYER', matchKills: { 2: 0, 3: 0 }, placements: { 2: 2, 3: 5 } },
  { order: 23, name: '『m尺』Partel', matchKills: { 2: 0 }, placements: { 2: 3 } },
  { order: 24, name: '1TE MURIFE¥', matchKills: { 2: 1 }, placements: { 2: 5 } },
  { order: 25, name: 'wHiteShadow', matchKills: { 2: 0 }, placements: { 2: 13 } },
  { order: 26, name: 'KIDURA', matchKills: { 2: 0 }, placements: { 2: 17 } },
  { order: 27, name: '1tkeBATMAN', matchKills: { 2: 0 }, placements: { 2: 18 } },
  { order: 28, name: 'AP乄NUNEZ', matchKills: { 3: 6 }, placements: { 3: 2 } },
  { order: 29, name: 'RondaShii', matchKills: { 3: 0 }, placements: { 3: 4 } },
  { order: 30, name: 'B4RR1C403', matchKills: { 3: 0 }, placements: { 3: 6 } },
  { order: 31, name: 'DenisWamanga', matchKills: { 3: 0 }, placements: { 3: 9 } },
  { order: 32, name: 'Rønøø', matchKills: { 3: 0 }, placements: { 3: 10 } },
  { order: 33, name: 'Bazengashakes', matchKills: { 3: 0 }, placements: { 3: 13 } },
  { order: 34, name: '¤y¤ragu', matchKills: { 3: 0 }, placements: { 3: 15 } },
  { order: 35, name: 'hollyjoh', matchKills: { 3: 0 }, placements: { 3: 22 } },
  { order: 36, name: 'SB・ＯＺＡＩ', matchKills: { 3: 0 }, placements: { 3: 23 } },
  { order: 37, name: 'SaVaGE', matchKills: { 3: 0 }, placements: { 3: 25 } },
];

type FallbackEfootballFixtureSeed = {
  round: OnlineTournamentFixtureRound;
  roundLabel: string;
  slot: number;
  player1: string | null;
  player2: string | null;
  player1Score: number | null;
  player2Score: number | null;
  winner: string | null;
  status: OnlineTournamentFixture['status'];
};

const FALLBACK_EFOOTBALL_FIXTURES: FallbackEfootballFixtureSeed[] = [
  {
    round: 'round_of_16',
    roundLabel: 'Round of 16',
    slot: 0,
    player1: 'Samuuo11',
    player2: 'COBY_CR7',
    player1Score: 4,
    player2Score: 1,
    winner: 'Samuuo11',
    status: 'completed',
  },
  {
    round: 'round_of_16',
    roundLabel: 'Round of 16',
    slot: 1,
    player1: 'TASH_KID',
    player2: 'ASDH-559-563-850',
    player1Score: 0,
    player2Score: 3,
    winner: 'ASDH-559-563-850',
    status: 'completed',
  },
  {
    round: 'round_of_16',
    roundLabel: 'Round of 16',
    slot: 2,
    player1: 'n3xphase',
    player2: null,
    player1Score: null,
    player2Score: null,
    winner: 'n3xphase',
    status: 'bye',
  },
  {
    round: 'round_of_16',
    roundLabel: 'Round of 16',
    slot: 3,
    player1: 'GaddyTheGamer',
    player2: null,
    player1Score: null,
    player2Score: null,
    winner: 'GaddyTheGamer',
    status: 'bye',
  },
  {
    round: 'round_of_16',
    roundLabel: 'Round of 16',
    slot: 4,
    player1: 'KID_PICKER',
    player2: null,
    player1Score: null,
    player2Score: null,
    winner: 'KID_PICKER',
    status: 'bye',
  },
  {
    round: 'round_of_16',
    roundLabel: 'Round of 16',
    slot: 5,
    player1: 'sammykratos',
    player2: 'BClout-XVII',
    player1Score: 0,
    player2Score: 1,
    winner: 'BClout-XVII',
    status: 'completed',
  },
  {
    round: 'round_of_16',
    roundLabel: 'Round of 16',
    slot: 6,
    player1: 'Foxxy22_',
    player2: null,
    player1Score: null,
    player2Score: null,
    winner: 'Foxxy22_',
    status: 'bye',
  },
  {
    round: 'round_of_16',
    roundLabel: 'Round of 16',
    slot: 7,
    player1: 'Oloh-Messi',
    player2: null,
    player1Score: null,
    player2Score: null,
    winner: 'Oloh-Messi',
    status: 'bye',
  },
  {
    round: 'quarterfinal',
    roundLabel: 'Quarterfinal',
    slot: 0,
    player1: 'Samuuo11',
    player2: 'ASDH-559-563-850',
    player1Score: 6,
    player2Score: 1,
    winner: 'Samuuo11',
    status: 'completed',
  },
  {
    round: 'quarterfinal',
    roundLabel: 'Quarterfinal',
    slot: 1,
    player1: 'n3xphase',
    player2: 'GaddyTheGamer',
    player1Score: 7,
    player2Score: 2,
    winner: 'n3xphase',
    status: 'completed',
  },
  {
    round: 'quarterfinal',
    roundLabel: 'Quarterfinal',
    slot: 2,
    player1: 'KID_PICKER',
    player2: 'BClout-XVII',
    player1Score: 3,
    player2Score: 6,
    winner: 'BClout-XVII',
    status: 'completed',
  },
  {
    round: 'quarterfinal',
    roundLabel: 'Quarterfinal',
    slot: 3,
    player1: 'Foxxy22_',
    player2: 'Oloh-Messi',
    player1Score: 1,
    player2Score: 12,
    winner: 'Oloh-Messi',
    status: 'completed',
  },
  {
    round: 'semifinal',
    roundLabel: 'Semifinal',
    slot: 0,
    player1: 'Samuuo11',
    player2: 'n3xphase',
    player1Score: 9,
    player2Score: 1,
    winner: 'Samuuo11',
    status: 'completed',
  },
  {
    round: 'semifinal',
    roundLabel: 'Semifinal',
    slot: 1,
    player1: 'BClout-XVII',
    player2: 'Oloh-Messi',
    player1Score: 4,
    player2Score: 1,
    winner: 'BClout-XVII',
    status: 'completed',
  },
  {
    round: 'final',
    roundLabel: 'Final',
    slot: 0,
    player1: 'Samuuo11',
    player2: 'BClout-XVII',
    player1Score: 8,
    player2Score: 2,
    winner: 'Samuuo11',
    status: 'completed',
  },
];

function buildSyntheticRegistration(params: {
  game: 'pubgm';
  name: string;
  order: number;
}): OnlineTournamentRegistrationOpsRow {
  const minuteOffset = String(params.order).padStart(2, '0');
  return {
    id: `fallback-${params.game}-${params.order}`,
    event_slug: ONLINE_TOURNAMENT_SLUG,
    user_id: `fallback-user-${params.game}-${params.order}`,
    game: params.game,
    in_game_username: params.name,
    game_uid: null,
    phone: null,
    whatsapp_number: null,
    device_model: null,
    device_serial_last6: null,
    tournament_lobby_number: 1,
    tournament_lobby_slot: params.order,
    tournament_lobby_assigned_at: FALLBACK_RESULTS_CREATED_AT,
    email: null,
    instagram_username: null,
    youtube_name: null,
    followed_instagram: false,
    subscribed_youtube: false,
    available_at_8pm: true,
    accepted_rules: true,
    reward_eligible: false,
    eligibility_status: 'verified',
    check_in_status: 'checked_in',
    entry_fee_kes: 0,
    payment_tier: 'early_bird',
    payment_status: 'paid',
    payment_reference: null,
    payment_confirmed_at: FALLBACK_RESULTS_CREATED_AT,
    payment_confirmed_by: null,
    payment_note: null,
    checked_in_at: `2026-05-08T17:${minuteOffset}:00.000Z`,
    admin_note: 'Fallback PlayMechi PUBG results',
    created_at: `2026-05-08T16:${minuteOffset}:00.000Z`,
    updated_at: FALLBACK_RESULTS_CREATED_AT,
    user: {
      id: `fallback-user-${params.game}-${params.order}`,
      username: params.name,
      phone: null,
      email: null,
      role: 'user',
      is_banned: false,
    },
  };
}

function buildSyntheticSubmission(params: {
  registrationId: string;
  matchNumber: 1 | 2 | 3;
  kills: number;
  placement: number | null;
  order: number;
}): OnlineTournamentResultSubmission {
  return {
    id: `fallback-pubgm-match-${params.matchNumber}-${params.order}`,
    event_slug: ONLINE_TOURNAMENT_SLUG,
    game: 'pubgm',
    registration_id: params.registrationId,
    user_id: `fallback-user-pubgm-${params.order}`,
    room_id: null,
    fixture_id: null,
    match_number: params.matchNumber,
    kills: params.kills,
    placement: params.placement,
    player1_score: null,
    player2_score: null,
    reported_winner_registration_id: null,
    screenshot_url: null,
    screenshot_public_id: null,
    ocr_status: null,
    ocr_text: null,
    ocr_confidence: null,
    ocr_kills: null,
    ocr_placement: null,
    ocr_error: null,
    ocr_scanned_at: null,
    status: 'verified',
    admin_note: 'Fallback PlayMechi PUBG results',
    submitted_by: null,
    verified_by: null,
    verified_at: FALLBACK_RESULTS_CREATED_AT,
    created_at: `2026-05-${String(8 + params.matchNumber - 1).padStart(2, '0')}T19:${String(
      params.order
    ).padStart(2, '0')}:00.000Z`,
    updated_at: FALLBACK_RESULTS_CREATED_AT,
    registration: {
      id: params.registrationId,
      in_game_username: '',
      game: 'pubgm',
      user_id: `fallback-user-pubgm-${params.order}`,
    },
  };
}

function normalizeRegistrationName(value: string | null | undefined) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function resolveRegistrationId(
  registrations: OnlineTournamentRegistrationOpsRow[],
  candidateName: string
) {
  const normalizedCandidate = normalizeRegistrationName(candidateName);
  const matches = registrations.filter(
    (registration) =>
      registration.game === 'efootball' &&
      normalizeRegistrationName(registration.in_game_username) === normalizedCandidate
  );

  const preferred = matches.find((registration) => registration.check_in_status === 'checked_in');
  return preferred?.id ?? matches[0]?.id ?? null;
}

export function hasFallbackPubgmLeaderboard(submissions: OnlineTournamentResultSubmission[]) {
  return !submissions.some(
    (submission) => submission.game === 'pubgm' && submission.status === 'verified'
  );
}

export function buildFallbackPubgmStandings(): OnlineTournamentBattleRoyaleStanding[] {
  const registrations = FALLBACK_PUBGM_PLAYERS.map((player) =>
    buildSyntheticRegistration({
      game: 'pubgm',
      name: player.name,
      order: player.order,
    })
  );
  const registrationByOrder = new Map(registrations.map((registration, index) => [index + 1, registration]));
  const submissions: OnlineTournamentResultSubmission[] = [];

  for (const player of FALLBACK_PUBGM_PLAYERS) {
    const registration = registrationByOrder.get(player.order);
    if (!registration) {
      continue;
    }

    for (const matchNumber of [1, 2, 3] as const) {
      const kills = player.matchKills[matchNumber];
      const placement = player.placements?.[matchNumber] ?? null;
      if (kills === undefined && placement === null) {
        continue;
      }

      submissions.push(
        buildSyntheticSubmission({
          registrationId: registration.id,
          matchNumber,
          kills: kills ?? 0,
          placement,
          order: player.order,
        })
      );
    }
  }

  return buildBattleRoyaleStandings({
    game: 'pubgm',
    registrations,
    submissions,
  });
}

export function buildFallbackEfootballFixtures(
  registrations: OnlineTournamentRegistrationOpsRow[]
): OnlineTournamentFixture[] {
  return FALLBACK_EFOOTBALL_FIXTURES.map((fixture) => ({
    id: `fallback-efootball-${fixture.round}-${fixture.slot + 1}`,
    event_slug: ONLINE_TOURNAMENT_SLUG,
    game: 'efootball',
    round: fixture.round,
    round_label: fixture.roundLabel,
    slot: fixture.slot,
    player1_registration_id: fixture.player1
      ? resolveRegistrationId(registrations, fixture.player1)
      : null,
    player2_registration_id: fixture.player2
      ? resolveRegistrationId(registrations, fixture.player2)
      : null,
    player1_score: fixture.player1Score,
    player2_score: fixture.player2Score,
    winner_registration_id: fixture.winner
      ? resolveRegistrationId(registrations, fixture.winner)
      : null,
    status: fixture.status,
    screenshot_url: null,
    screenshot_public_id: null,
    admin_note: 'Fallback PlayMechi eFootball bracket',
    created_at: FALLBACK_RESULTS_CREATED_AT,
    updated_at: FALLBACK_RESULTS_CREATED_AT,
  }));
}
