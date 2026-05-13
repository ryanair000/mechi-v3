import { NextRequest, NextResponse } from 'next/server';
import {
  GET as adminGET,
  PATCH as adminPATCH,
} from '@/app/api/admin/online-tournament-ops/route';
import {
  filterOnlineTournamentDashboardStateByGame,
  type OnlineTournamentOpsDashboardState,
} from '@/lib/online-tournament-moderation';
import {
  requireModeratorTournamentScope,
} from '@/lib/moderator-tournament-access';
import { ONLINE_TOURNAMENT_SLUG, isOnlineTournamentGame } from '@/lib/online-tournament';
import { createServiceClient } from '@/lib/supabase';

function cleanText(value: unknown, maxLength = 80) {
  return String(value ?? '').trim().replace(/\s+/g, ' ').slice(0, maxLength);
}

async function readScopedGameForRecord(params: {
  table:
    | 'online_tournament_registrations'
    | 'online_tournament_result_submissions'
    | 'online_tournament_fixtures'
    | 'online_tournament_disputes';
  id: string;
}) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from(params.table)
    .select('game')
    .eq('id', params.id)
    .eq('event_slug', ONLINE_TOURNAMENT_SLUG)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as { game?: unknown } | null)?.game;
}

async function validateModeratorActionScope(params: {
  body: Record<string, unknown>;
  assignedGame: 'pubgm' | 'codm' | 'efootball';
}) {
  const action = cleanText(params.body.action, 60);

  if (action === 'seed_efootball') {
    if (params.assignedGame !== 'efootball') {
      return NextResponse.json({ error: 'Only the eFootball moderator can seed the bracket' }, { status: 403 });
    }

    return null;
  }

  if (action === 'upsert_room' || action === 'update_payout') {
    const game = cleanText(params.body.game, 20);
    if (!isOnlineTournamentGame(game) || game !== params.assignedGame) {
      return NextResponse.json({ error: 'That tournament action is outside your assigned game' }, { status: 403 });
    }

    return null;
  }

  if (action === 'update_payment_status' || action === 'confirm_payment') {
    const registrationId = cleanText(params.body.registration_id, 80);
    if (!registrationId) {
      return NextResponse.json({ error: 'Registration is required' }, { status: 400 });
    }

    const game = await readScopedGameForRecord({
      table: 'online_tournament_registrations',
      id: registrationId,
    });

    if (!isOnlineTournamentGame(game) || game !== params.assignedGame) {
      return NextResponse.json({ error: 'That player is outside your assigned tournament' }, { status: 403 });
    }

    return null;
  }

  if (action === 'set_result_status' || action === 'scan_codm_submission_ocr') {
    const submissionId = cleanText(params.body.submission_id, 80);
    if (!submissionId) {
      return NextResponse.json({ error: 'Submission is required' }, { status: 400 });
    }

    const game = await readScopedGameForRecord({
      table: 'online_tournament_result_submissions',
      id: submissionId,
    });

    if (!isOnlineTournamentGame(game) || game !== params.assignedGame) {
      return NextResponse.json({ error: 'That submission is outside your assigned tournament' }, { status: 403 });
    }

    return null;
  }

  if (action === 'record_fixture_result' || action === 'reset_fixture_result') {
    const fixtureId = cleanText(params.body.fixture_id, 80);
    if (!fixtureId) {
      return NextResponse.json({ error: 'Fixture is required' }, { status: 400 });
    }

    const game = await readScopedGameForRecord({
      table: 'online_tournament_fixtures',
      id: fixtureId,
    });

    if (game !== 'efootball' || params.assignedGame !== 'efootball') {
      return NextResponse.json({ error: 'Only the eFootball moderator can manage bracket fixtures' }, { status: 403 });
    }

    return null;
  }

  if (action === 'update_dispute_status') {
    const disputeId = cleanText(params.body.dispute_id, 80);
    if (!disputeId) {
      return NextResponse.json({ error: 'Dispute is required' }, { status: 400 });
    }

    const game = await readScopedGameForRecord({
      table: 'online_tournament_disputes',
      id: disputeId,
    });

    if (!isOnlineTournamentGame(game) || game !== params.assignedGame) {
      return NextResponse.json({ error: 'That dispute is outside your assigned tournament' }, { status: 403 });
    }

    return null;
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}

function toScopedResponse(
  responsePayload: OnlineTournamentOpsDashboardState,
  assignedGame: 'pubgm' | 'codm' | 'efootball',
  status = 200
) {
  return NextResponse.json(
    filterOnlineTournamentDashboardStateByGame(responsePayload, assignedGame),
    { status }
  );
}

export async function GET(request: NextRequest) {
  const scope = await requireModeratorTournamentScope(request);
  if (scope.response) {
    return scope.response;
  }

  const response = await adminGET(request);
  const payload = (await response.json()) as OnlineTournamentOpsDashboardState & { error?: string };

  if (scope.isAdmin || !response.ok) {
    return NextResponse.json(payload, { status: response.status });
  }

  return toScopedResponse(payload, scope.assignment!.game, response.status);
}

export async function PATCH(request: NextRequest) {
  const scope = await requireModeratorTournamentScope(request);
  if (scope.response) {
    return scope.response;
  }

  if (!scope.isAdmin) {
    const assignedGame = scope.assignment?.game;
    if (!assignedGame) {
      return NextResponse.json(
        { error: 'Moderator tournament assignment is missing' },
        { status: 403 }
      );
    }

    const body = (await request.clone().json()) as Record<string, unknown>;
    const validationResponse = await validateModeratorActionScope({
      body,
      assignedGame,
    });

    if (validationResponse) {
      return validationResponse;
    }
  }

  const response = await adminPATCH(request);
  const payload = (await response.json()) as OnlineTournamentOpsDashboardState & {
    error?: string;
    ocr_scan_error?: string | null;
  };

  if (scope.isAdmin || !response.ok) {
    return NextResponse.json(payload, { status: response.status });
  }

  return NextResponse.json(
    {
      ...filterOnlineTournamentDashboardStateByGame(payload, scope.assignment!.game),
      ocr_scan_error: payload.ocr_scan_error ?? null,
    },
    { status: response.status }
  );
}
