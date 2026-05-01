import { NextRequest, NextResponse } from 'next/server';
import { hasModeratorAccess, requireActiveAccessProfile } from '@/lib/access';
import { writeAuditLog } from '@/lib/audit';
import {
  ONLINE_TOURNAMENT_CHECK_IN_STATUSES,
  ONLINE_TOURNAMENT_ELIGIBILITY_STATUSES,
  ONLINE_TOURNAMENT_SLUG,
  isOnlineTournamentGame,
  type OnlineTournamentCheckInStatus,
  type OnlineTournamentEligibilityStatus,
} from '@/lib/online-tournament';
import { getClientIp } from '@/lib/rateLimit';
import { createServiceClient } from '@/lib/supabase';

function isEligibilityStatus(value: unknown): value is OnlineTournamentEligibilityStatus {
  return (
    typeof value === 'string' &&
    ONLINE_TOURNAMENT_ELIGIBILITY_STATUSES.includes(value as OnlineTournamentEligibilityStatus)
  );
}

function isCheckInStatus(value: unknown): value is OnlineTournamentCheckInStatus {
  return (
    typeof value === 'string' &&
    ONLINE_TOURNAMENT_CHECK_IN_STATUSES.includes(value as OnlineTournamentCheckInStatus)
  );
}

async function loadRegistrations() {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('online_tournament_registrations')
    .select(
      'id, event_slug, user_id, game, in_game_username, phone, whatsapp_number, email, instagram_username, youtube_name, followed_instagram, subscribed_youtube, available_at_8pm, accepted_rules, reward_eligible, eligibility_status, check_in_status, admin_note, created_at, updated_at, user:user_id(id, username, phone, email)'
    )
    .eq('event_slug', ONLINE_TOURNAMENT_SLUG)
    .order('game', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    throw error;
  }

  return data ?? [];
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
    const registrations = await loadRegistrations();
    return NextResponse.json({ registrations });
  } catch (error) {
    console.error('[AdminOnlineTournamentRegistrations GET] Error:', error);
    return NextResponse.json({ error: 'Could not load registrations' }, { status: 500 });
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
    const registrationId = String(body.registration_id ?? '').trim();

    if (!registrationId) {
      return NextResponse.json({ error: 'Registration id is required' }, { status: 400 });
    }

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (Object.prototype.hasOwnProperty.call(body, 'eligibility_status')) {
      if (!isEligibilityStatus(body.eligibility_status)) {
        return NextResponse.json({ error: 'Invalid eligibility status' }, { status: 400 });
      }

      updates.eligibility_status = body.eligibility_status;
      updates.reward_eligible = body.eligibility_status === 'verified';
    }

    if (Object.prototype.hasOwnProperty.call(body, 'check_in_status')) {
      if (!isCheckInStatus(body.check_in_status)) {
        return NextResponse.json({ error: 'Invalid check-in status' }, { status: 400 });
      }

      updates.check_in_status = body.check_in_status;
    }

    if (Object.prototype.hasOwnProperty.call(body, 'admin_note')) {
      updates.admin_note = String(body.admin_note ?? '').trim().slice(0, 500) || null;
    }

    const supabase = createServiceClient();
    const { data: updated, error } = await supabase
      .from('online_tournament_registrations')
      .update(updates)
      .eq('id', registrationId)
      .eq('event_slug', ONLINE_TOURNAMENT_SLUG)
      .select('id, game, user_id, eligibility_status, check_in_status, reward_eligible, admin_note')
      .single();

    if (error || !updated) {
      return NextResponse.json({ error: 'Could not update registration' }, { status: 500 });
    }

    const updatedGame = String((updated as { game?: unknown }).game ?? '');
    await writeAuditLog({
      adminId: access.profile.id,
      action: 'system_note',
      targetType: 'tournament',
      targetId: registrationId,
      ipAddress: getClientIp(request),
      details: {
        event_slug: ONLINE_TOURNAMENT_SLUG,
        registration_id: registrationId,
        game: isOnlineTournamentGame(updatedGame) ? updatedGame : null,
        updates,
      },
    });

    const registrations = await loadRegistrations();
    return NextResponse.json({ registration: updated, registrations });
  } catch (error) {
    console.error('[AdminOnlineTournamentRegistrations PATCH] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
