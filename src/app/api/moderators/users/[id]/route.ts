import { NextRequest, NextResponse } from 'next/server';
import {
  GET as adminGET,
  PATCH as adminPATCH,
} from '@/app/api/admin/users/[id]/route';
import {
  moderatorCanManageUserInAssignedTournament,
  requireModeratorTournamentScope,
} from '@/lib/moderator-tournament-access';

async function ensureTargetIsInScope(params: {
  request: NextRequest;
  id: string;
}) {
  const scope = await requireModeratorTournamentScope(params.request);
  if (scope.response) {
    return scope;
  }

  if (!scope.isAdmin) {
    if (!scope.assignment) {
      return {
        profile: null,
        response: NextResponse.json(
          { error: 'Moderator tournament assignment is missing' },
          { status: 403 }
        ),
        assignment: null,
        isAdmin: false,
      } as const;
    }

    const canManage = await moderatorCanManageUserInAssignedTournament({
      assignment: scope.assignment,
      userId: params.id,
    });

    if (!canManage) {
      return {
        profile: null,
        response: NextResponse.json(
          { error: 'That player is outside your assigned tournament' },
          { status: 403 }
        ),
        assignment: null,
        isAdmin: false,
      } as const;
    }
  }

  return scope;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const scope = await ensureTargetIsInScope({ request, id });
  if (scope.response) {
    return scope.response;
  }

  return adminGET(request, context);
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const scope = await ensureTargetIsInScope({ request, id });
  if (scope.response) {
    return scope.response;
  }

  return adminPATCH(request, context);
}
