import { NextRequest, NextResponse } from 'next/server';
import {
  GET as adminGET,
  PATCH as adminPATCH,
} from '@/app/api/admin/weekendcup-registrations/route';
import { requireModeratorTournamentScope } from '@/lib/moderator-tournament-access';
import { getModeratorTournamentByKey, type ModeratorTournamentGameKey } from '@/lib/moderator-tournaments';
import { createServiceClient } from '@/lib/supabase';
import { WEEKEND_CUP_GAMES, WEEKEND_CUP_SLUG, cleanWeekendCupText, isWeekendCupGame } from '@/lib/weekend-cup';

const ACTIVE_WEEKEND_CUP_GAMES = new Set(WEEKEND_CUP_GAMES.map((game) => game.game));

function requireWeekendCupAssignment(
  scope: Awaited<ReturnType<typeof requireModeratorTournamentScope>>
) {
  if (scope.response || scope.isAdmin) {
    return null;
  }

  if (!scope.assignment?.key.startsWith('weekendcup_')) {
    return NextResponse.json(
      { error: 'Weekend Cup moderator assignment required' },
      { status: 403 }
    );
  }

  return null;
}

function isAllGamesModerator(scope: Awaited<ReturnType<typeof requireModeratorTournamentScope>>) {
  return scope.profile?.username.toLowerCase() === 'ranxxs';
}

function canViewWeekendCupRevenue(scope: Awaited<ReturnType<typeof requireModeratorTournamentScope>>) {
  return scope.isAdmin || scope.profile?.username.toLowerCase() === 'ryanair001';
}

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

function filterPayloadForModeratorGame(
  payload: Record<string, unknown>,
  game: ModeratorTournamentGameKey,
  options?: {
    allGames?: boolean;
    canViewRevenue?: boolean;
  }
) {
  const tournament = getModeratorTournamentByKey(`weekendcup_${game}`);
  const allGames = options?.allGames ?? false;
  const canViewRevenue = options?.canViewRevenue ?? false;
  const scrubRegistration = (registration: unknown) => {
    if (!registration || typeof registration !== 'object') {
      return registration;
    }

    if (canViewRevenue) {
      return registration;
    }

    return {
      ...(registration as Record<string, unknown>),
      entry_fee_kes: null,
    };
  };
  const registrations = Array.isArray(payload.registrations)
    ? payload.registrations.filter((registration) => {
        const registrationGame =
          registration && typeof registration === 'object'
            ? (registration as { game?: unknown }).game
            : null;

        if (!ACTIVE_WEEKEND_CUP_GAMES.has(registrationGame as ModeratorTournamentGameKey)) {
          return false;
        }

        if (allGames) {
          return true;
        }

        return registrationGame === game;
      }).map(scrubRegistration)
    : [];
  const summary =
    payload.summary && typeof payload.summary === 'object' && !Array.isArray(payload.summary)
      ? (payload.summary as Record<string, unknown>)
      : {};
  const summaryGames =
    summary.games && typeof summary.games === 'object' && !Array.isArray(summary.games)
      ? (summary.games as Record<string, unknown>)
      : {};
  const summaryRegistrations = Array.isArray(summary.registrations)
    ? summary.registrations.filter((registration) => {
        const registrationGame =
          registration && typeof registration === 'object'
            ? (registration as { game?: unknown }).game
            : null;

        if (!ACTIVE_WEEKEND_CUP_GAMES.has(registrationGame as ModeratorTournamentGameKey)) {
          return false;
        }

        if (allGames) {
          return true;
        }

        return registrationGame === game;
      }).map(scrubRegistration)
    : summary.registrations;
  const games = allGames
    ? summaryGames
    : {
        [game]: summaryGames[game],
      };

  return {
    ...payload,
    registrations,
    summary: {
      ...summary,
      games,
      registrations: summaryRegistrations,
    },
    scope: {
      game,
      label: tournament.label,
      shortLabel: tournament.shortLabel,
      isAdmin: false,
      allGames,
      canViewRevenue,
    },
  };
}

export async function GET(request: NextRequest) {
  const scope = await requireModeratorTournamentScope(request);
  if (scope.response) {
    return scope.response;
  }

  const assignmentResponse = requireWeekendCupAssignment(scope);
  if (assignmentResponse) {
    return assignmentResponse;
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
    filterPayloadForModeratorGame(payload as Record<string, unknown>, game, {
      allGames: isAllGamesModerator(scope),
      canViewRevenue: canViewWeekendCupRevenue(scope),
    }),
    { status: response.status }
  );
}

export async function PATCH(request: NextRequest) {
  const scope = await requireModeratorTournamentScope(request);
  if (scope.response) {
    return scope.response;
  }

  const assignmentResponse = requireWeekendCupAssignment(scope);
  if (assignmentResponse) {
    return assignmentResponse;
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
    if (!isWeekendCupGame(game) || (!isAllGamesModerator(scope) && game !== assignedGame)) {
      return NextResponse.json({ error: 'That player is outside your assigned tournament' }, { status: 403 });
    }

    if (
      Object.prototype.hasOwnProperty.call(body, 'entry_fee_kes') &&
      !canViewWeekendCupRevenue(scope)
    ) {
      return NextResponse.json({ error: 'Only admin can update revenue values' }, { status: 403 });
    }
  }

  const response = await adminPATCH(request);
  const payload = (await response.json()) as Record<string, unknown>;
  if (!scope.isAdmin && response.ok) {
    const assignedGame = scope.assignment?.game;
    if (!assignedGame) {
      return NextResponse.json(
        { error: 'Moderator tournament assignment is missing' },
        { status: 403 }
      );
    }

    return NextResponse.json(filterPayloadForModeratorGame(payload, assignedGame, {
      allGames: isAllGamesModerator(scope),
      canViewRevenue: canViewWeekendCupRevenue(scope),
    }), {
      status: response.status,
    });
  }

  return NextResponse.json(payload, { status: response.status });
}
