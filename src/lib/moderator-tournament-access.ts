import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  getModeratorTournamentFromGameIds,
  type ModeratorTournamentOption,
} from '@/lib/moderator-tournaments';
import { ONLINE_TOURNAMENT_SLUG, type OnlineTournamentGameKey } from '@/lib/online-tournament';
import {
  hasModeratorAccess,
  requireActiveAccessProfile,
  type AccessProfile,
} from '@/lib/access';
import { createServiceClient } from '@/lib/supabase';

export type ModeratorTournamentScope =
  | {
      profile: AccessProfile;
      response: null;
      assignment: ModeratorTournamentOption | null;
      isAdmin: boolean;
    }
  | {
      profile: null;
      response: NextResponse;
      assignment: null;
      isAdmin: false;
    };

export async function requireModeratorTournamentScope(
  request: NextRequest
): Promise<ModeratorTournamentScope> {
  const access = await requireActiveAccessProfile(request);
  if (access.response) {
    return {
      profile: null,
      response: access.response,
      assignment: null,
      isAdmin: false,
    };
  }

  if (!hasModeratorAccess(access.profile)) {
    return {
      profile: null,
      response: NextResponse.json({ error: 'Moderator access required' }, { status: 403 }),
      assignment: null,
      isAdmin: false,
    };
  }

  if (access.profile.role === 'admin') {
    return {
      profile: access.profile,
      response: null,
      assignment: null,
      isAdmin: true,
    };
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('game_ids')
    .eq('id', access.profile.id)
    .maybeSingle();

  if (error) {
    console.error('[ModeratorTournamentScope] Could not load tournament assignment:', error);
    return {
      profile: null,
      response: NextResponse.json(
        { error: 'Could not load moderator tournament assignment' },
        { status: 500 }
      ),
      assignment: null,
      isAdmin: false,
    };
  }

  const assignment = getModeratorTournamentFromGameIds((data as { game_ids?: unknown } | null)?.game_ids);

  if (!assignment) {
    return {
      profile: null,
      response: NextResponse.json(
        { error: 'Moderator tournament assignment is missing' },
        { status: 403 }
      ),
      assignment: null,
      isAdmin: false,
    };
  }

  return {
    profile: access.profile,
    response: null,
    assignment,
    isAdmin: false,
  };
}

export function moderatorCanAccessGame(
  scope: Pick<ModeratorTournamentScope, 'assignment' | 'isAdmin'>,
  game: OnlineTournamentGameKey
) {
  return scope.isAdmin || scope.assignment?.game === game;
}

export async function moderatorCanManageUserInAssignedTournament(params: {
  assignment: ModeratorTournamentOption;
  userId: string;
}) {
  const supabase = createServiceClient();
  const { count, error } = await supabase
    .from('online_tournament_registrations')
    .select('id', { count: 'exact', head: true })
    .eq('event_slug', ONLINE_TOURNAMENT_SLUG)
    .eq('game', params.assignment.game)
    .eq('user_id', params.userId);

  if (error) {
    throw error;
  }

  return (count ?? 0) > 0;
}
