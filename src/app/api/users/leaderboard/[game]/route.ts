import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import {
  DEFAULT_RATING,
  GAMES,
  getCanonicalGameKey,
  getGameLossesKey,
  getGameRatingKey,
  getGameWinsKey,
} from '@/lib/config';
import { isMissingColumnError } from '@/lib/db-compat';
import { getRankDivision } from '@/lib/gamification';
import {
  ONLINE_TOURNAMENT_GAME_BY_KEY,
  ONLINE_TOURNAMENT_GAMES,
  ONLINE_TOURNAMENT_SLUG,
  isOnlineTournamentGame,
  type OnlineTournamentGameKey,
} from '@/lib/online-tournament';
import { ONLINE_TOURNAMENT_BR_MATCH_NUMBERS } from '@/lib/online-tournament-ops';
import type { GameKey } from '@/types';

type LeaderboardPlayerRow = Record<string, unknown>;
type DrawMatchRow = {
  id?: string | null;
  player1_id?: string | null;
  player2_id?: string | null;
};
type Relation<T> = T | T[] | null | undefined;
type PublicTournamentProfile = {
  avatar_url?: string | null;
  id?: string | null;
  username?: string | null;
};
type PublicTournamentRegistrationRow = {
  check_in_status?: string | null;
  checked_in_at?: string | null;
  created_at?: string | null;
  eligibility_status?: string | null;
  game?: string | null;
  id?: string | null;
  in_game_username?: string | null;
  user?: Relation<PublicTournamentProfile>;
};
type PublicTournamentSubmissionRow = {
  created_at?: string | null;
  game?: string | null;
  kills?: number | null;
  match_number?: number | null;
  placement?: number | null;
  registration_id?: string | null;
  status?: string | null;
};
type PublicTournamentFixtureRow = {
  player1_registration_id?: string | null;
  player1_score?: number | null;
  player2_registration_id?: string | null;
  player2_score?: number | null;
  round?: string | null;
  round_label?: string | null;
  status?: string | null;
  updated_at?: string | null;
  winner_registration_id?: string | null;
};
type TournamentLeaderboardEntry = {
  avatarUrl: string | null;
  checkedInAt: string | null;
  detailText: string;
  id: string;
  latestLabel: string | null;
  name: string;
  rank: number;
  score: number;
  scoreText: string;
  username: string | null;
  verifiedCount: number;
  verifiedText: string;
};
type TournamentLeaderboardGame = {
  game: OnlineTournamentGameKey;
  label: string;
  leaderboard: TournamentLeaderboardEntry[];
  players: number;
  scoreLabel: string;
  shortLabel: string;
  verifiedLabel: string;
  verifiedResults: number;
};
type VerifiedTournamentRegistrationRow = PublicTournamentRegistrationRow & {
  game: OnlineTournamentGameKey;
  id: string;
};
type BattleRoyaleLeaderboardRow = TournamentLeaderboardEntry & {
  bestSingleMatchKills: number;
  finalMatchPlacement: number | null;
  matchKills: Record<1 | 2 | 3, number>;
  submittedMatches: Set<1 | 2 | 3>;
};
type EfootballLeaderboardRow = TournamentLeaderboardEntry & {
  goalDifference: number;
  goalsAgainst: number;
  goalsFor: number;
  latestRoundWeight: number;
  matchesPlayed: number;
  wins: number;
};

function firstRelation<T>(value: Relation<T>): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function getTimeValue(value: string | null | undefined, fallback = Number.MAX_SAFE_INTEGER) {
  if (!value) return fallback;

  const time = new Date(value).getTime();
  return Number.isNaN(time) ? fallback : time;
}

function formatCount(value: number, singular: string, plural = `${singular}s`) {
  return `${value} ${value === 1 ? singular : plural}`;
}

function formatSignedNumber(value: number) {
  return value > 0 ? `+${value}` : String(value);
}

function getPlayerName(registration: PublicTournamentRegistrationRow) {
  const profile = firstRelation(registration.user);
  const inGameName = registration.in_game_username?.trim();
  const username = profile?.username?.trim();
  return inGameName || username || 'Player';
}

function isVerifiedCheckedInRegistration(
  registration: PublicTournamentRegistrationRow
): registration is VerifiedTournamentRegistrationRow {
  return (
    registration.eligibility_status === 'verified' &&
    registration.check_in_status === 'checked_in' &&
    typeof registration.id === 'string' &&
    Boolean(registration.id) &&
    isOnlineTournamentGame(registration.game)
  );
}

function createBaseLeaderboardEntry(
  registration: VerifiedTournamentRegistrationRow
): TournamentLeaderboardEntry {
  const profile = firstRelation(registration.user);

  return {
    avatarUrl: profile?.avatar_url ?? null,
    checkedInAt: registration.checked_in_at ?? registration.created_at ?? null,
    detailText: 'Verified check-in',
    id: registration.id,
    latestLabel: 'Verified check-in',
    name: getPlayerName(registration),
    rank: 0,
    score: 0,
    scoreText: '0',
    username: profile?.username?.trim() || null,
    verifiedCount: 0,
    verifiedText: '0',
  };
}

function getEfootballRoundWeight(round: string | null | undefined) {
  switch (round) {
    case 'round_of_16':
      return 1;
    case 'quarterfinal':
      return 2;
    case 'semifinal':
      return 3;
    case 'bronze':
      return 4;
    case 'final':
      return 5;
    default:
      return 0;
  }
}

function buildBattleRoyaleLeaderboard(params: {
  game: Extract<OnlineTournamentGameKey, 'pubgm' | 'codm'>;
  registrations: VerifiedTournamentRegistrationRow[];
  submissions: PublicTournamentSubmissionRow[];
}): TournamentLeaderboardGame {
  const config = ONLINE_TOURNAMENT_GAME_BY_KEY[params.game];
  const rows = params.registrations
    .filter((registration) => registration.game === params.game)
    .map((registration): BattleRoyaleLeaderboardRow => ({
      ...createBaseLeaderboardEntry(registration),
      bestSingleMatchKills: 0,
      finalMatchPlacement: null,
      matchKills: { 1: 0, 2: 0, 3: 0 },
      scoreText: '0 kills',
      submittedMatches: new Set<1 | 2 | 3>(),
      verifiedText: '0/3 results',
    }));

  const rowByRegistrationId = new Map(rows.map((row) => [row.id, row]));
  const verifiedSubmissions = params.submissions
    .filter(
      (submission) =>
        submission.game === params.game &&
        submission.status === 'verified' &&
        typeof submission.registration_id === 'string' &&
        Boolean(submission.registration_id) &&
        ONLINE_TOURNAMENT_BR_MATCH_NUMBERS.includes(
          submission.match_number as (typeof ONLINE_TOURNAMENT_BR_MATCH_NUMBERS)[number]
        )
    )
    .sort((left, right) => getTimeValue(left.created_at, 0) - getTimeValue(right.created_at, 0));

  for (const submission of verifiedSubmissions) {
    const registrationId = submission.registration_id as string;
    const matchNumber = submission.match_number as 1 | 2 | 3;
    const row = rowByRegistrationId.get(registrationId);
    if (!row) continue;

    row.matchKills[matchNumber] = Number(submission.kills ?? 0);
    row.submittedMatches.add(matchNumber);
    if (matchNumber === 3) {
      row.finalMatchPlacement = submission.placement ?? null;
    }
  }

  const leaderboard = rows
    .map((row) => {
      row.score = row.matchKills[1] + row.matchKills[2] + row.matchKills[3];
      row.bestSingleMatchKills = Math.max(
        row.matchKills[1],
        row.matchKills[2],
        row.matchKills[3]
      );
      row.detailText = `M1 ${row.matchKills[1]} | M2 ${row.matchKills[2]} | M3 ${row.matchKills[3]}`;
      row.scoreText = formatCount(row.score, 'kill');
      row.verifiedCount = row.submittedMatches.size;
      row.verifiedText = `${row.verifiedCount}/3 results`;
      row.latestLabel =
        row.finalMatchPlacement !== null
          ? `Final match placement #${row.finalMatchPlacement}`
          : 'Verified check-in';
      return row;
    })
    .sort((left, right) => {
      if (left.score !== right.score) {
        return right.score - left.score;
      }

      if (left.bestSingleMatchKills !== right.bestSingleMatchKills) {
        return right.bestSingleMatchKills - left.bestSingleMatchKills;
      }

      const leftFinalPlacement = left.finalMatchPlacement ?? Number.POSITIVE_INFINITY;
      const rightFinalPlacement = right.finalMatchPlacement ?? Number.POSITIVE_INFINITY;
      if (leftFinalPlacement !== rightFinalPlacement) {
        return leftFinalPlacement - rightFinalPlacement;
      }

      const checkInDelta = getTimeValue(left.checkedInAt) - getTimeValue(right.checkedInAt);
      if (checkInDelta !== 0) {
        return checkInDelta;
      }

      return left.name.localeCompare(right.name);
    })
    .map((row, index) => ({
      avatarUrl: row.avatarUrl,
      checkedInAt: row.checkedInAt,
      detailText: row.detailText,
      id: row.id,
      latestLabel: row.latestLabel,
      name: row.name,
      rank: index + 1,
      score: row.score,
      scoreText: row.scoreText,
      username: row.username,
      verifiedCount: row.verifiedCount,
      verifiedText: row.verifiedText,
    }));

  return {
    game: params.game,
    label: config.label,
    leaderboard,
    players: leaderboard.length,
    scoreLabel: 'Kills',
    shortLabel: config.shortLabel,
    verifiedLabel: 'Results',
    verifiedResults: leaderboard.reduce((total, entry) => total + entry.verifiedCount, 0),
  };
}

function buildEfootballLeaderboard(params: {
  fixtures: PublicTournamentFixtureRow[];
  registrations: VerifiedTournamentRegistrationRow[];
}): TournamentLeaderboardGame {
  const config = ONLINE_TOURNAMENT_GAME_BY_KEY.efootball;
  const rows = params.registrations
    .filter((registration) => registration.game === 'efootball')
    .map((registration): EfootballLeaderboardRow => ({
      ...createBaseLeaderboardEntry(registration),
      detailText: 'Verified check-in',
      goalDifference: 0,
      goalsAgainst: 0,
      goalsFor: 0,
      latestRoundWeight: 0,
      matchesPlayed: 0,
      scoreText: '0 wins',
      verifiedText: '0 matches',
      wins: 0,
    }));

  const rowByRegistrationId = new Map(rows.map((row) => [row.id, row]));
  const completedFixtures = params.fixtures.sort(
    (left, right) => getTimeValue(left.updated_at, 0) - getTimeValue(right.updated_at, 0)
  );

  for (const fixture of completedFixtures) {
    const player1RegistrationId = String(fixture.player1_registration_id ?? '');
    const player2RegistrationId = String(fixture.player2_registration_id ?? '');
    const player1 = rowByRegistrationId.get(player1RegistrationId);
    const player2 = rowByRegistrationId.get(player2RegistrationId);
    const player1Score = Number(fixture.player1_score ?? 0);
    const player2Score = Number(fixture.player2_score ?? 0);
    const roundWeight = getEfootballRoundWeight(fixture.round);
    const roundLabel = fixture.round_label ?? 'Completed fixture';

    if (player1) {
      player1.matchesPlayed += 1;
      player1.goalsFor += player1Score;
      player1.goalsAgainst += player2Score;
      player1.latestRoundWeight = Math.max(player1.latestRoundWeight, roundWeight);
      player1.latestLabel = roundLabel;
      if (fixture.winner_registration_id === player1RegistrationId) {
        player1.wins += 1;
      }
    }

    if (player2) {
      player2.matchesPlayed += 1;
      player2.goalsFor += player2Score;
      player2.goalsAgainst += player1Score;
      player2.latestRoundWeight = Math.max(player2.latestRoundWeight, roundWeight);
      player2.latestLabel = roundLabel;
      if (fixture.winner_registration_id === player2RegistrationId) {
        player2.wins += 1;
      }
    }
  }

  const leaderboard = rows
    .map((row) => {
      row.goalDifference = row.goalsFor - row.goalsAgainst;
      row.score = row.wins;
      row.scoreText = formatCount(row.wins, 'win');
      row.verifiedCount = row.matchesPlayed;
      row.verifiedText = formatCount(row.matchesPlayed, 'match');
      row.detailText =
        row.matchesPlayed > 0
          ? `GF ${row.goalsFor} | GA ${row.goalsAgainst} | GD ${formatSignedNumber(row.goalDifference)}`
          : 'Verified check-in';
      row.latestLabel = row.matchesPlayed > 0 ? row.latestLabel : 'Verified check-in';
      return row;
    })
    .sort((left, right) => {
      if (left.wins !== right.wins) {
        return right.wins - left.wins;
      }

      if (left.goalDifference !== right.goalDifference) {
        return right.goalDifference - left.goalDifference;
      }

      if (left.goalsFor !== right.goalsFor) {
        return right.goalsFor - left.goalsFor;
      }

      if (left.latestRoundWeight !== right.latestRoundWeight) {
        return right.latestRoundWeight - left.latestRoundWeight;
      }

      const checkInDelta = getTimeValue(left.checkedInAt) - getTimeValue(right.checkedInAt);
      if (checkInDelta !== 0) {
        return checkInDelta;
      }

      return left.name.localeCompare(right.name);
    })
    .map((row, index) => ({
      avatarUrl: row.avatarUrl,
      checkedInAt: row.checkedInAt,
      detailText: row.detailText,
      id: row.id,
      latestLabel: row.latestLabel,
      name: row.name,
      rank: index + 1,
      score: row.score,
      scoreText: row.scoreText,
      username: row.username,
      verifiedCount: row.verifiedCount,
      verifiedText: row.verifiedText,
    }));

  return {
    game: 'efootball',
    label: config.label,
    leaderboard,
    players: leaderboard.length,
    scoreLabel: 'Wins',
    shortLabel: config.shortLabel,
    verifiedLabel: 'Matches',
    verifiedResults: completedFixtures.length,
  };
}

async function getTournamentLeaderboard() {
  const supabase = createServiceClient();
  const [registrationsResult, submissionsResult, fixturesResult] = await Promise.all([
    supabase
      .from('online_tournament_registrations')
      .select(
        'id, game, in_game_username, eligibility_status, check_in_status, checked_in_at, created_at, user:user_id(id, username, avatar_url)'
      )
      .eq('event_slug', ONLINE_TOURNAMENT_SLUG)
      .order('created_at', { ascending: true }),
    supabase
      .from('online_tournament_result_submissions')
      .select(
        'registration_id, game, match_number, kills, placement, status, created_at'
      )
      .eq('event_slug', ONLINE_TOURNAMENT_SLUG)
      .eq('status', 'verified')
      .order('created_at', { ascending: true }),
    supabase
      .from('online_tournament_fixtures')
      .select(
        'round, round_label, player1_registration_id, player2_registration_id, player1_score, player2_score, winner_registration_id, status, updated_at'
      )
      .eq('event_slug', ONLINE_TOURNAMENT_SLUG)
      .eq('game', 'efootball')
      .eq('status', 'completed')
      .order('updated_at', { ascending: true }),
  ]);

  if (registrationsResult.error) {
    console.error('[Leaderboard] PlayMechi registration query error:', registrationsResult.error);
    return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
  }

  if (submissionsResult.error) {
    console.error('[Leaderboard] PlayMechi submission query error:', submissionsResult.error);
  }

  if (fixturesResult.error) {
    console.error('[Leaderboard] PlayMechi fixture query error:', fixturesResult.error);
  }

  const registrations = ((registrationsResult.data ?? []) as PublicTournamentRegistrationRow[]).filter(
    isVerifiedCheckedInRegistration
  );
  const submissions = (submissionsResult.data ?? []) as PublicTournamentSubmissionRow[];
  const fixtures = (fixturesResult.data ?? []) as PublicTournamentFixtureRow[];

  const leaderboards: TournamentLeaderboardGame[] = [
    buildBattleRoyaleLeaderboard({ game: 'pubgm', registrations, submissions }),
    buildBattleRoyaleLeaderboard({ game: 'codm', registrations, submissions }),
    buildEfootballLeaderboard({ fixtures, registrations }),
  ];

  return NextResponse.json({
    leaderboards,
    source: 'playmechi',
    summary: {
      games: ONLINE_TOURNAMENT_GAMES.length,
      players: leaderboards.reduce((total, leaderboard) => total + leaderboard.players, 0),
      verifiedResults: leaderboards.reduce(
        (total, leaderboard) => total + leaderboard.verifiedResults,
        0
      ),
    },
  });
}

function getLeaderboardLookupGames(game: GameKey): GameKey[] {
  const canonicalGame = getCanonicalGameKey(game);

  return (Object.keys(GAMES) as GameKey[]).filter(
    (candidate) => getCanonicalGameKey(candidate) === canonicalGame
  );
}

function dedupePlayers(players: LeaderboardPlayerRow[]): LeaderboardPlayerRow[] {
  const playersById = new Map<string, LeaderboardPlayerRow>();

  for (const player of players) {
    const id = String(player.id ?? '');
    if (!id || playersById.has(id)) continue;
    playersById.set(id, player);
  }

  return Array.from(playersById.values());
}

function resolveLeaderboardMetrics(
  player: LeaderboardPlayerRow,
  ratingKey: string,
  winsKey: string,
  lossesKey: string,
  legacyMetrics?: LeaderboardPlayerRow
) {
  const rating = (player[ratingKey] as number | undefined) ?? DEFAULT_RATING;
  const wins = (player[winsKey] as number | undefined) ?? 0;
  const losses = (player[lossesKey] as number | undefined) ?? 0;
  const hasCanonicalHistory = rating !== DEFAULT_RATING || wins > 0 || losses > 0;

  if (!legacyMetrics || hasCanonicalHistory) {
    return { rating, wins, losses };
  }

  const legacyRating =
    (legacyMetrics.rating_efootball_mobile as number | undefined) ?? DEFAULT_RATING;
  const legacyWins =
    (legacyMetrics.wins_efootball_mobile as number | undefined) ?? 0;
  const legacyLosses =
    (legacyMetrics.losses_efootball_mobile as number | undefined) ?? 0;
  const hasLegacyHistory =
    legacyRating !== DEFAULT_RATING || legacyWins > 0 || legacyLosses > 0;

  return hasLegacyHistory
    ? { rating: legacyRating, wins: legacyWins, losses: legacyLosses }
    : { rating, wins, losses };
}

function addDrawRowsToCounts(
  rows: DrawMatchRow[] | null | undefined,
  drawCounts: Map<string, number>,
  playerIds: Set<string>,
  seenMatchIds: Set<string>
) {
  for (const row of rows ?? []) {
    const matchId = String(row.id ?? '');
    if (!matchId || seenMatchIds.has(matchId)) continue;
    seenMatchIds.add(matchId);

    const player1Id = String(row.player1_id ?? '');
    const player2Id = String(row.player2_id ?? '');

    if (playerIds.has(player1Id)) {
      drawCounts.set(player1Id, (drawCounts.get(player1Id) ?? 0) + 1);
    }

    if (playerIds.has(player2Id)) {
      drawCounts.set(player2Id, (drawCounts.get(player2Id) ?? 0) + 1);
    }
  }
}

async function getDrawCounts(
  supabase: ReturnType<typeof createServiceClient>,
  playerIds: string[],
  games: GameKey[]
) {
  const drawCounts = new Map<string, number>();

  if (playerIds.length === 0 || games.length === 0) {
    return drawCounts;
  }

  const drawSelect = 'id, player1_id, player2_id';
  const [player1DrawsResult, player2DrawsResult] = await Promise.all([
    supabase
      .from('matches')
      .select(drawSelect)
      .eq('status', 'completed')
      .is('winner_id', null)
      .in('game', games)
      .in('player1_id', playerIds),
    supabase
      .from('matches')
      .select(drawSelect)
      .eq('status', 'completed')
      .is('winner_id', null)
      .in('game', games)
      .in('player2_id', playerIds),
  ]);

  if (player1DrawsResult.error || player2DrawsResult.error) {
    console.error('[Leaderboard] Draw count query error:', player1DrawsResult.error ?? player2DrawsResult.error);
    return drawCounts;
  }

  const playerIdSet = new Set(playerIds);
  const seenMatchIds = new Set<string>();
  addDrawRowsToCounts(player1DrawsResult.data as DrawMatchRow[] | null, drawCounts, playerIdSet, seenMatchIds);
  addDrawRowsToCounts(player2DrawsResult.data as DrawMatchRow[] | null, drawCounts, playerIdSet, seenMatchIds);

  return drawCounts;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ game: string }> }
) {
  const { game: requestedGame } = await params;

  if (requestedGame === 'tournaments') {
    return getTournamentLeaderboard();
  }

  if (!requestedGame || !GAMES[requestedGame as GameKey]) {
    return NextResponse.json({ error: 'Invalid game' }, { status: 400 });
  }

  const game = getCanonicalGameKey(requestedGame as GameKey);

  try {
    const supabase = createServiceClient();
    const ratingKey = getGameRatingKey(game);
    const winsKey = getGameWinsKey(game);
    const lossesKey = getGameLossesKey(game);
    const lookupGames = getLeaderboardLookupGames(game);
    const metricSelect = [
      'id',
      'username',
      'region',
      'selected_games',
      'platforms',
      'game_ids',
      'level',
      ratingKey,
      winsKey,
      lossesKey,
    ].join(', ');
    const fallbackSelect =
      'id, username, region, selected_games, platforms, game_ids, level';

    let fallbackToDefaults = false;
    const collectedPlayers: LeaderboardPlayerRow[] = [];

    for (const lookupGame of lookupGames) {
      const initialResult = await supabase
        .from('profiles')
        .select(metricSelect)
        .contains('selected_games', [lookupGame])
        .limit(100);

      if (
        initialResult.error &&
        (isMissingColumnError(initialResult.error, `profiles.${ratingKey}`) ||
          isMissingColumnError(initialResult.error, `profiles.${winsKey}`) ||
          isMissingColumnError(initialResult.error, `profiles.${lossesKey}`))
      ) {
        fallbackToDefaults = true;
        break;
      }

      if (initialResult.error) {
        console.error('[Leaderboard] Query error:', initialResult.error);
        return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
      }

      collectedPlayers.push(
        ...(((initialResult.data as unknown as LeaderboardPlayerRow[] | null) ?? []))
      );
    }

    if (fallbackToDefaults) {
      collectedPlayers.length = 0;

      for (const lookupGame of lookupGames) {
        const fallbackResult = await supabase
          .from('profiles')
          .select(fallbackSelect)
          .contains('selected_games', [lookupGame])
          .limit(100);

        if (fallbackResult.error) {
          console.error('[Leaderboard] Query error:', fallbackResult.error);
          return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
        }

        collectedPlayers.push(
          ...(((fallbackResult.data as unknown as LeaderboardPlayerRow[] | null) ?? []))
        );
      }
    }

    const candidatePlayers = dedupePlayers(collectedPlayers);
    const candidatePlayerIds = candidatePlayers
      .map((player) => String(player.id ?? ''))
      .filter(Boolean);
    const drawCountsById = await getDrawCounts(supabase, candidatePlayerIds, lookupGames);
    const legacyMetricsById = new Map<string, LeaderboardPlayerRow>();

    if (!fallbackToDefaults && game === 'efootball' && candidatePlayers.length > 0) {
      const legacyMetricsResult = await supabase
        .from('profiles')
        .select('id, rating_efootball_mobile, wins_efootball_mobile, losses_efootball_mobile')
        .in(
          'id',
          candidatePlayers
            .map((player) => String(player.id ?? ''))
            .filter(Boolean)
        );

      if (
        legacyMetricsResult.error &&
        (isMissingColumnError(legacyMetricsResult.error, 'profiles.rating_efootball_mobile') ||
          isMissingColumnError(legacyMetricsResult.error, 'profiles.wins_efootball_mobile') ||
          isMissingColumnError(legacyMetricsResult.error, 'profiles.losses_efootball_mobile'))
      ) {
        // Older schemas may already have dropped the legacy mobile fields.
      } else if (legacyMetricsResult.error) {
        console.error('[Leaderboard] Legacy metric query error:', legacyMetricsResult.error);
        return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
      } else {
        for (const row of (legacyMetricsResult.data as unknown as LeaderboardPlayerRow[] | null) ?? []) {
          const id = String(row.id ?? '');
          if (id) {
            legacyMetricsById.set(id, row);
          }
        }
      }
    }

    const getPlayerMetrics = (player: LeaderboardPlayerRow) =>
      fallbackToDefaults
        ? { rating: DEFAULT_RATING, wins: 0, losses: 0 }
        : resolveLeaderboardMetrics(
            player,
            ratingKey,
            winsKey,
            lossesKey,
            legacyMetricsById.get(String(player.id ?? ''))
          );

    const players = fallbackToDefaults
      ? candidatePlayers
      : candidatePlayers.filter((player) => {
          const metrics = getPlayerMetrics(player);
          const draws = drawCountsById.get(String(player.id ?? '')) ?? 0;
          return metrics.wins + metrics.losses + draws > 0;
        });

    const topPlayers = players
      .sort((a, b) => {
        if (fallbackToDefaults) {
          return String(a.username ?? '').localeCompare(String(b.username ?? ''));
        }

        const metricsA = getPlayerMetrics(a);
        const metricsB = getPlayerMetrics(b);
        const ratingDelta = metricsB.rating - metricsA.rating;
        if (ratingDelta !== 0) {
          return ratingDelta;
        }

        const matchDelta =
          metricsB.wins +
          metricsB.losses +
          (drawCountsById.get(String(b.id ?? '')) ?? 0) -
          (metricsA.wins + metricsA.losses + (drawCountsById.get(String(a.id ?? '')) ?? 0));
        if (matchDelta !== 0) {
          return matchDelta;
        }

        return String(a.username ?? '').localeCompare(String(b.username ?? ''));
      })
      .slice(0, 50);

    const tournamentWinsById = new Map<string, number>();
    const playerIds = topPlayers
      .map((player) => String(player.id ?? ''))
      .filter(Boolean);

    if (playerIds.length > 0) {
      const tournamentWinsResult = await supabase
        .from('tournaments')
        .select('winner_id')
        .eq('status', 'completed')
        .in('winner_id', playerIds)
        .in('game', lookupGames);

      if (tournamentWinsResult.error) {
        console.error('[Leaderboard] Tournament wins query error:', tournamentWinsResult.error);
      } else {
        for (const tournament of
          (tournamentWinsResult.data as Array<{ winner_id?: string | null }> | null) ?? []) {
          const winnerId = tournament.winner_id;

          if (!winnerId) continue;
          tournamentWinsById.set(winnerId, (tournamentWinsById.get(winnerId) ?? 0) + 1);
        }
      }
    }

    const leaderboard = topPlayers.map((p, index) => {
      const metrics = getPlayerMetrics(p);
      const playerId = String(p.id ?? '');
      const draws = drawCountsById.get(playerId) ?? 0;

      return {
        rank: index + 1,
        id: p.id,
        username: p.username,
        region: typeof p.region === 'string' ? p.region : null,
        platforms: (p.platforms as unknown[] | undefined) ?? [],
        game_ids: (p.game_ids as Record<string, string> | undefined) ?? {},
        rating: metrics.rating,
        division: getRankDivision(metrics.rating).label,
        level: (p.level as number | undefined) ?? 1,
        wins: metrics.wins,
        losses: metrics.losses,
        draws,
        matchesPlayed: metrics.wins + metrics.losses + draws,
        tournamentsWon: tournamentWinsById.get(playerId) ?? 0,
      };
    });

    return NextResponse.json({ leaderboard, game });
  } catch (err) {
    console.error('[Leaderboard] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
