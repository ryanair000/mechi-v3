import { NextRequest, NextResponse } from 'next/server';
import {
  GET as adminGET,
  PATCH as adminPATCH,
} from '@/app/api/admin/weekendcup-registrations/route';
import { requireModeratorTournamentScope } from '@/lib/moderator-tournament-access';
import { createServiceClient } from '@/lib/supabase';
import { WEEKEND_CUP_SLUG, cleanWeekendCupText, isWeekendCupGame } from '@/lib/weekend-cup';

async function readScopedGameForRegistration(registrationId: string) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('online_tournament_registrations')
    .select('game')
    .eq('id', registrationId)
    .eq('event_slug', WEEKEND_CUP_SLUG)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as { game?: unknown } | null)?.game;
}

export async function GET(request: NextRequest) {
  const scope = await requireModeratorTournamentScope(request);
  if (scope.response) {
    return scope.response;
  }

  const response = await adminGET(request);
  const payload = (await response.json()) as {
    error?: string;
    registrations?: Array<{ game: string }>;
    summary?: {
      games: Record<string, unknown>;
    };
  };

  if (scope.isAdmin || !response.ok) {
    return NextResponse.json(payload, { status: response.status });
  }

  const game = scope.assignment?.game;
  if (!game) {
    return NextResponse.json(
      { error: 'Moderator tournament assignment is missing' },
      { status: 403 }
    );
  }

  return NextResponse.json(
    {
      ...payload,
      registrations: (payload.registrations ?? []).filter((registration) => registration.game === game),
    },
    { status: response.status }
  );
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
    const registrationId = cleanWeekendCupText(body.registration_id, 80);
    if (!registrationId) {
      return NextResponse.json({ error: 'Registration is required' }, { status: 400 });
    }

    const game = await readScopedGameForRegistration(registrationId);
    if (!isWeekendCupGame(game) || game !== assignedGame) {
      return NextResponse.json({ error: 'That player is outside your assigned tournament' }, { status: 403 });
    }
  }

  const response = await adminPATCH(request);
  const payload = await response.json();
  return NextResponse.json(payload, { status: response.status });
}
