import { NextRequest, NextResponse } from 'next/server';
import {
  GET as adminGET,
  PATCH as adminPATCH,
} from '@/app/api/admin/online-tournament-registrations/route';
import { requireModeratorTournamentScope } from '@/lib/moderator-tournament-access';
import { ONLINE_TOURNAMENT_SLUG, type OnlineTournamentGameKey } from '@/lib/online-tournament';
import { createServiceClient } from '@/lib/supabase';

type RegistrationListResponse = {
  registrations?: Array<{ game: OnlineTournamentGameKey } & Record<string, unknown>>;
  registration?: ({ game: OnlineTournamentGameKey } & Record<string, unknown>) | null;
  error?: string;
};

function cleanText(value: unknown, maxLength = 80) {
  return String(value ?? '').trim().replace(/\s+/g, ' ').slice(0, maxLength);
}

function filterRegistrationPayload(
  payload: RegistrationListResponse,
  assignedGame: OnlineTournamentGameKey
) {
  return {
    ...payload,
    registration:
      payload.registration && payload.registration.game === assignedGame
        ? payload.registration
        : payload.registration ?? null,
    registrations: (payload.registrations ?? []).filter(
      (registration) => registration.game === assignedGame
    ),
  };
}

async function registrationBelongsToGame(
  registrationId: string,
  assignedGame: OnlineTournamentGameKey
) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('online_tournament_registrations')
    .select('game')
    .eq('id', registrationId)
    .eq('event_slug', ONLINE_TOURNAMENT_SLUG)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as { game?: OnlineTournamentGameKey } | null)?.game === assignedGame;
}

export async function GET(request: NextRequest) {
  const scope = await requireModeratorTournamentScope(request);
  if (scope.response) {
    return scope.response;
  }

  const response = await adminGET(request);
  const payload = (await response.json()) as RegistrationListResponse;

  if (scope.isAdmin || !response.ok) {
    return NextResponse.json(payload, { status: response.status });
  }

  return NextResponse.json(filterRegistrationPayload(payload, scope.assignment!.game), {
    status: response.status,
  });
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
    const registrationId = cleanText(body.registration_id, 80);

    if (!registrationId) {
      return NextResponse.json({ error: 'Registration id is required' }, { status: 400 });
    }

    const inScope = await registrationBelongsToGame(registrationId, assignedGame);
    if (!inScope) {
      return NextResponse.json(
        { error: 'That player is outside your assigned tournament' },
        { status: 403 }
      );
    }
  }

  const response = await adminPATCH(request);
  const payload = (await response.json()) as RegistrationListResponse;

  if (scope.isAdmin || !response.ok) {
    return NextResponse.json(payload, { status: response.status });
  }

  return NextResponse.json(filterRegistrationPayload(payload, scope.assignment!.game), {
    status: response.status,
  });
}
