import { NextRequest, NextResponse } from 'next/server';
import { hasModeratorAccess, requireActiveAccessProfile } from '@/lib/access';
import { writeAuditLog } from '@/lib/audit';
import {
  ONLINE_TOURNAMENT_SLUG,
  isOnlineTournamentGame,
} from '@/lib/online-tournament';
import {
  ONLINE_TOURNAMENT_EFOOTBALL_ROUNDS,
  buildBattleRoyaleStandings,
  isBattleRoyaleTournamentGame,
  type OnlineTournamentFixture,
  type OnlineTournamentFixtureRound,
  type OnlineTournamentFixtureStatus,
  type OnlineTournamentRegistrationOpsRow,
  type OnlineTournamentResultStatus,
  type OnlineTournamentRoomStatus,
} from '@/lib/online-tournament-ops';
import {
  getBronzeEfootballPosition,
  getNextEfootballPosition,
  loadOnlineTournamentOpsState,
} from '@/lib/online-tournament-store';
import { getClientIp } from '@/lib/rateLimit';
import { createServiceClient } from '@/lib/supabase';

const ROOM_STATUSES: OnlineTournamentRoomStatus[] = [
  'draft',
  'released',
  'locked',
  'completed',
  'cancelled',
];
const RESULT_STATUSES: OnlineTournamentResultStatus[] = [
  'pending',
  'verified',
  'rejected',
  'disputed',
];
const PAYOUT_STATUSES = ['pending', 'approved', 'paid', 'failed', 'ineligible'] as const;

type EfootballSeedRow = {
  event_slug: string;
  game: 'efootball';
  round: OnlineTournamentFixtureRound;
  round_label: string;
  slot: number;
  player1_registration_id: string | null;
  player2_registration_id: string | null;
  winner_registration_id?: string | null;
  status: OnlineTournamentFixtureStatus;
};

function cleanText(value: unknown, maxLength = 300) {
  return String(value ?? '').trim().replace(/\s+/g, ' ').slice(0, maxLength);
}

function cleanOptionalText(value: unknown, maxLength = 300) {
  const text = cleanText(value, maxLength);
  return text || null;
}

function readNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.round(value);
  const text = String(value ?? '').trim();
  if (!/^\d+$/.test(text)) return null;
  return Number(text);
}

function isRoomStatus(value: unknown): value is OnlineTournamentRoomStatus {
  return typeof value === 'string' && ROOM_STATUSES.includes(value as OnlineTournamentRoomStatus);
}

function isResultStatus(value: unknown): value is OnlineTournamentResultStatus {
  return typeof value === 'string' && RESULT_STATUSES.includes(value as OnlineTournamentResultStatus);
}

async function getAdminState() {
  const supabase = createServiceClient();
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

async function markFixtureReadyIfFilled(fixtureId: string) {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from('online_tournament_fixtures')
    .select('id, player1_registration_id, player2_registration_id, status')
    .eq('id', fixtureId)
    .maybeSingle();

  const fixture = data as
    | {
        id: string;
        player1_registration_id: string | null;
        player2_registration_id: string | null;
        status: OnlineTournamentFixtureStatus;
      }
    | null;

  if (
    fixture?.player1_registration_id &&
    fixture.player2_registration_id &&
    fixture.status === 'pending'
  ) {
    await supabase
      .from('online_tournament_fixtures')
      .update({ status: 'ready', updated_at: new Date().toISOString() })
      .eq('id', fixtureId);
  }
}

async function advanceEfootballFixture(params: {
  fixture: OnlineTournamentFixture;
  winnerRegistrationId: string;
}) {
  const { fixture, winnerRegistrationId } = params;
  const loserRegistrationId =
    fixture.player1_registration_id === winnerRegistrationId
      ? fixture.player2_registration_id
      : fixture.player1_registration_id;
  const supabase = createServiceClient();
  const nextPosition = getNextEfootballPosition(fixture);

  if (nextPosition) {
    const { data: nextFixture } = await supabase
      .from('online_tournament_fixtures')
      .update({
        [nextPosition.side]: winnerRegistrationId,
        updated_at: new Date().toISOString(),
      })
      .eq('event_slug', ONLINE_TOURNAMENT_SLUG)
      .eq('game', 'efootball')
      .eq('round', nextPosition.round)
      .eq('slot', nextPosition.slot)
      .select('id')
      .maybeSingle();

    const nextFixtureId = (nextFixture as { id?: string } | null)?.id;
    if (nextFixtureId) {
      await markFixtureReadyIfFilled(nextFixtureId);
    }
  }

  const bronzePosition = getBronzeEfootballPosition(fixture);
  if (bronzePosition && loserRegistrationId) {
    const { data: bronzeFixture } = await supabase
      .from('online_tournament_fixtures')
      .update({
        [bronzePosition.side]: loserRegistrationId,
        updated_at: new Date().toISOString(),
      })
      .eq('event_slug', ONLINE_TOURNAMENT_SLUG)
      .eq('game', 'efootball')
      .eq('round', 'bronze')
      .eq('slot', bronzePosition.slot)
      .select('id')
      .maybeSingle();

    const bronzeFixtureId = (bronzeFixture as { id?: string } | null)?.id;
    if (bronzeFixtureId) {
      await markFixtureReadyIfFilled(bronzeFixtureId);
    }
  }
}

async function applyFixtureResult(params: {
  fixtureId: string;
  player1Score: number;
  player2Score: number;
  winnerRegistrationId?: string | null;
  screenshotUrl?: string | null;
  screenshotPublicId?: string | null;
  adminNote?: string | null;
}) {
  if (params.player1Score === params.player2Score) {
    return { ok: false, error: 'eFootball fixtures need a winner' };
  }

  const supabase = createServiceClient();
  const { data: fixtureRaw, error: fixtureError } = await supabase
    .from('online_tournament_fixtures')
    .select('*')
    .eq('id', params.fixtureId)
    .eq('event_slug', ONLINE_TOURNAMENT_SLUG)
    .maybeSingle();

  const fixture = fixtureRaw as OnlineTournamentFixture | null;
  if (fixtureError || !fixture) {
    return { ok: false, error: 'Fixture not found' };
  }

  const winnerRegistrationId =
    params.winnerRegistrationId ??
    (params.player1Score > params.player2Score
      ? fixture.player1_registration_id
      : fixture.player2_registration_id);

  if (
    !winnerRegistrationId ||
    ![fixture.player1_registration_id, fixture.player2_registration_id].includes(
      winnerRegistrationId
    )
  ) {
    return { ok: false, error: 'Winner must be in the fixture' };
  }

  const { error: updateError } = await supabase
    .from('online_tournament_fixtures')
    .update({
      player1_score: params.player1Score,
      player2_score: params.player2Score,
      winner_registration_id: winnerRegistrationId,
      status: 'completed',
      screenshot_url: params.screenshotUrl ?? fixture.screenshot_url,
      screenshot_public_id: params.screenshotPublicId ?? fixture.screenshot_public_id,
      admin_note: params.adminNote ?? fixture.admin_note,
      updated_at: new Date().toISOString(),
    })
    .eq('id', fixture.id);

  if (updateError) {
    return { ok: false, error: 'Could not update fixture' };
  }

  await advanceEfootballFixture({ fixture, winnerRegistrationId });
  return { ok: true };
}

async function seedEfootballFixtures(registrations: OnlineTournamentRegistrationOpsRow[]) {
  const supabase = createServiceClient();
  const { count: completedCount } = await supabase
    .from('online_tournament_fixtures')
    .select('id', { count: 'exact', head: true })
    .eq('event_slug', ONLINE_TOURNAMENT_SLUG)
    .eq('game', 'efootball')
    .eq('status', 'completed');

  if ((completedCount ?? 0) > 0) {
    return { ok: false, error: 'Completed eFootball fixtures already exist' };
  }

  const players = registrations
    .filter(
      (registration) =>
        registration.game === 'efootball' &&
        registration.eligibility_status !== 'disqualified'
    )
    .sort((left, right) => {
      const leftCheckedIn = left.check_in_status === 'checked_in' ? 0 : 1;
      const rightCheckedIn = right.check_in_status === 'checked_in' ? 0 : 1;
      if (leftCheckedIn !== rightCheckedIn) return leftCheckedIn - rightCheckedIn;
      return new Date(left.created_at).getTime() - new Date(right.created_at).getTime();
    })
    .slice(0, 16);

  await supabase
    .from('online_tournament_fixtures')
    .delete()
    .eq('event_slug', ONLINE_TOURNAMENT_SLUG)
    .eq('game', 'efootball');

  const rows: EfootballSeedRow[] = ONLINE_TOURNAMENT_EFOOTBALL_ROUNDS.flatMap((round) =>
    Array.from({ length: round.slots }).map((_, slot) => {
      const player1 = round.round === 'round_of_16' ? players[slot * 2] : null;
      const player2 = round.round === 'round_of_16' ? players[slot * 2 + 1] : null;

      return {
        event_slug: ONLINE_TOURNAMENT_SLUG,
        game: 'efootball',
        round: round.round,
        round_label: round.label,
        slot,
        player1_registration_id: player1?.id ?? null,
        player2_registration_id: player2?.id ?? null,
        status: player1 && player2 ? 'ready' : 'pending',
      };
    })
  );

  const getSeedRow = (round: OnlineTournamentFixtureRound, slot: number) =>
    rows.find((row) => row.round === round && row.slot === slot);

  for (const row of rows) {
    const filledPlayers = [
      row.player1_registration_id,
      row.player2_registration_id,
    ].filter((value): value is string => Boolean(value));

    if (filledPlayers.length === 2) {
      row.status = row.status === 'pending' ? 'ready' : row.status;
      continue;
    }

    if (filledPlayers.length !== 1) {
      continue;
    }

    row.status = 'bye';
    row.winner_registration_id = filledPlayers[0];

    const nextPosition = getNextEfootballPosition(row);
    if (!nextPosition) {
      continue;
    }

    const nextRow = getSeedRow(nextPosition.round, nextPosition.slot);
    if (nextRow) {
      nextRow[nextPosition.side] = filledPlayers[0];
    }
  }

  const { error } = await supabase.from('online_tournament_fixtures').insert(rows);
  if (error) {
    return { ok: false, error: 'Could not seed eFootball fixtures' };
  }

  return { ok: true };
}

export async function GET(request: NextRequest) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) {
    return access.response;
  }

  if (!hasModeratorAccess(access.profile)) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  try {
    return NextResponse.json(await getAdminState());
  } catch (error) {
    console.error('[AdminOnlineTournamentOps GET] Error:', error);
    return NextResponse.json({ error: 'Could not load tournament ops' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) {
    return access.response;
  }

  if (!hasModeratorAccess(access.profile)) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const action = cleanText(body.action, 60);
    const supabase = createServiceClient();

    if (action === 'upsert_room') {
      const game = cleanText(body.game, 20);
      const matchNumber = readNumber(body.match_number);
      const status = isRoomStatus(body.status) ? body.status : 'draft';

      if (!isOnlineTournamentGame(game) || !isBattleRoyaleTournamentGame(game)) {
        return NextResponse.json({ error: 'Pick PUBG or CODM' }, { status: 400 });
      }

      if (!matchNumber || matchNumber < 1 || matchNumber > 3) {
        return NextResponse.json({ error: 'Match number must be 1, 2, or 3' }, { status: 400 });
      }

      const { error } = await supabase.from('online_tournament_rooms').upsert(
        {
          event_slug: ONLINE_TOURNAMENT_SLUG,
          game,
          match_number: matchNumber,
          title: cleanOptionalText(body.title, 120),
          map_name: cleanOptionalText(body.map_name, 80),
          room_id: cleanOptionalText(body.room_id, 80),
          room_password: cleanOptionalText(body.room_password, 80),
          instructions: cleanOptionalText(body.instructions, 800),
          starts_at: cleanOptionalText(body.starts_at, 80),
          release_at: cleanOptionalText(body.release_at, 80),
          status,
          updated_by: access.profile.id,
          created_by: access.profile.id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'event_slug,game,match_number' }
      );

      if (error) {
        return NextResponse.json({ error: 'Could not save room' }, { status: 500 });
      }

      await writeAuditLog({
        adminId: access.profile.id,
        action: 'system_note',
        targetType: 'tournament',
        details: { action, game, matchNumber, status },
        ipAddress: getClientIp(request),
      });

      return NextResponse.json(await getAdminState());
    }

    if (action === 'seed_efootball') {
      const state = await loadOnlineTournamentOpsState(supabase);
      const seeded = await seedEfootballFixtures(state.registrations);
      if (!seeded.ok) {
        return NextResponse.json({ error: seeded.error }, { status: 400 });
      }

      await writeAuditLog({
        adminId: access.profile.id,
        action: 'system_note',
        targetType: 'tournament',
        details: { action },
        ipAddress: getClientIp(request),
      });

      return NextResponse.json(await getAdminState());
    }

    if (action === 'set_result_status') {
      const submissionId = cleanText(body.submission_id, 80);
      const status = body.status;
      if (!submissionId || !isResultStatus(status)) {
        return NextResponse.json({ error: 'Submission and status are required' }, { status: 400 });
      }

      const { data: submissionRaw, error: submissionError } = await supabase
        .from('online_tournament_result_submissions')
        .update({
          status,
          admin_note: cleanOptionalText(body.admin_note, 500),
          verified_by: status === 'verified' ? access.profile.id : null,
          verified_at: status === 'verified' ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', submissionId)
        .eq('event_slug', ONLINE_TOURNAMENT_SLUG)
        .select('*')
        .maybeSingle();

      const submission = submissionRaw as
        | {
            id: string;
            fixture_id: string | null;
            player1_score: number | null;
            player2_score: number | null;
            reported_winner_registration_id: string | null;
            screenshot_url: string | null;
            screenshot_public_id: string | null;
            admin_note: string | null;
          }
        | null;

      if (submissionError || !submission) {
        return NextResponse.json({ error: 'Could not update submission' }, { status: 500 });
      }

      if (
        status === 'verified' &&
        submission.fixture_id &&
        submission.player1_score !== null &&
        submission.player2_score !== null
      ) {
        const applied = await applyFixtureResult({
          fixtureId: submission.fixture_id,
          player1Score: submission.player1_score,
          player2Score: submission.player2_score,
          winnerRegistrationId: submission.reported_winner_registration_id,
          screenshotUrl: submission.screenshot_url,
          screenshotPublicId: submission.screenshot_public_id,
          adminNote: submission.admin_note,
        });

        if (!applied.ok) {
          return NextResponse.json({ error: applied.error }, { status: 400 });
        }
      }

      await writeAuditLog({
        adminId: access.profile.id,
        action: 'system_note',
        targetType: 'tournament',
        targetId: submissionId,
        details: { action, status },
        ipAddress: getClientIp(request),
      });

      return NextResponse.json(await getAdminState());
    }

    if (action === 'record_fixture_result') {
      const fixtureId = cleanText(body.fixture_id, 80);
      const player1Score = readNumber(body.player1_score);
      const player2Score = readNumber(body.player2_score);
      const winnerRegistrationId = cleanOptionalText(body.winner_registration_id, 80);

      if (!fixtureId || player1Score === null || player2Score === null) {
        return NextResponse.json({ error: 'Fixture and scoreline are required' }, { status: 400 });
      }

      const applied = await applyFixtureResult({
        fixtureId,
        player1Score,
        player2Score,
        winnerRegistrationId,
        adminNote: cleanOptionalText(body.admin_note, 500),
      });

      if (!applied.ok) {
        return NextResponse.json({ error: applied.error }, { status: 400 });
      }

      await writeAuditLog({
        adminId: access.profile.id,
        action: 'system_note',
        targetType: 'tournament',
        targetId: fixtureId,
        details: { action, player1Score, player2Score, winnerRegistrationId },
        ipAddress: getClientIp(request),
      });

      return NextResponse.json(await getAdminState());
    }

    if (action === 'update_payout') {
      const game = cleanText(body.game, 20);
      const placement = readNumber(body.placement);
      const payoutStatus = cleanText(body.payout_status, 20);

      if (
        !isOnlineTournamentGame(game) ||
        !placement ||
        placement < 1 ||
        placement > 3 ||
        !PAYOUT_STATUSES.includes(payoutStatus as (typeof PAYOUT_STATUSES)[number])
      ) {
        return NextResponse.json({ error: 'Game, placement, and payout status are required' }, { status: 400 });
      }

      const { error } = await supabase.from('online_tournament_payouts').upsert(
        {
          event_slug: ONLINE_TOURNAMENT_SLUG,
          game,
          placement,
          registration_id: cleanOptionalText(body.registration_id, 80),
          prize_label: cleanText(body.prize_label, 80),
          prize_value_kes: readNumber(body.prize_value_kes),
          reward_type: cleanText(body.reward_type, 20) || 'cash',
          eligibility_status: cleanText(body.eligibility_status, 20) || 'pending',
          payout_status: payoutStatus,
          payout_ref: cleanOptionalText(body.payout_ref, 120),
          admin_note: cleanOptionalText(body.admin_note, 500),
          updated_by: access.profile.id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'event_slug,game,placement' }
      );

      if (error) {
        return NextResponse.json({ error: 'Could not update payout' }, { status: 500 });
      }

      await writeAuditLog({
        adminId: access.profile.id,
        action: 'system_note',
        targetType: 'tournament',
        details: { action, game, placement, payoutStatus },
        ipAddress: getClientIp(request),
      });

      return NextResponse.json(await getAdminState());
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('[AdminOnlineTournamentOps PATCH] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
