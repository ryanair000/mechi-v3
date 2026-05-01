import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import {
  ONLINE_TOURNAMENT_SLUG,
  isOnlineTournamentGame,
} from '@/lib/online-tournament';
import {
  buildPlayerTournamentState,
  loadOnlineTournamentOpsState,
} from '@/lib/online-tournament-store';
import { checkPersistentRateLimit, getClientIp, rateLimitResponse } from '@/lib/rateLimit';
import { createServiceClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) {
    return access.response;
  }

  try {
    const supabase = createServiceClient();
    const state = await loadOnlineTournamentOpsState(supabase);

    return NextResponse.json(
      buildPlayerTournamentState({
        state,
        userId: access.profile.id,
      })
    );
  } catch (error) {
    console.error('[OnlineTournamentState GET] Error:', error);
    return NextResponse.json(
      { error: 'Could not load tournament state' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) {
    return access.response;
  }

  try {
    const checkInRateLimit = await checkPersistentRateLimit(
      `online-tournament-state:${access.profile.id}:${getClientIp(request)}`,
      20,
      15 * 60 * 1000
    );
    if (!checkInRateLimit.allowed) {
      return rateLimitResponse(checkInRateLimit.retryAfterSeconds);
    }

    const body = (await request.json()) as Record<string, unknown>;
    const action = String(body.action ?? '').trim();

    if (action !== 'check_in') {
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }

    const game = String(body.game ?? '').trim();
    if (!isOnlineTournamentGame(game)) {
      return NextResponse.json({ error: 'Pick a valid game' }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { data: registration, error: registrationError } = await supabase
      .from('online_tournament_registrations')
      .update({
        check_in_status: 'checked_in',
        updated_at: new Date().toISOString(),
      })
      .eq('event_slug', ONLINE_TOURNAMENT_SLUG)
      .eq('user_id', access.profile.id)
      .eq('game', game)
      .neq('eligibility_status', 'disqualified')
      .select('id')
      .maybeSingle();

    if (registrationError) {
      return NextResponse.json({ error: 'Could not check you in' }, { status: 500 });
    }

    if (!registration) {
      return NextResponse.json(
        { error: 'Register for this game before checking in' },
        { status: 404 }
      );
    }

    const state = await loadOnlineTournamentOpsState(supabase);
    return NextResponse.json(
      buildPlayerTournamentState({
        state,
        userId: access.profile.id,
      })
    );
  } catch (error) {
    console.error('[OnlineTournamentState POST] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
