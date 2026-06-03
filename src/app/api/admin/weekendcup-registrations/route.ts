import { NextRequest, NextResponse } from 'next/server';
import { hasModeratorAccess, requireActiveAccessProfile } from '@/lib/access';
import { writeAuditLog } from '@/lib/audit';
import { createNotification } from '@/lib/notifications';
import { assignOnlineTournamentLobbySlot } from '@/lib/online-tournament-store';
import { getClientIp } from '@/lib/rateLimit';
import { createServiceClient } from '@/lib/supabase';
import {
  WEEKEND_CUP_CHECK_IN_BLOCKED_MESSAGE,
  WEEKEND_CUP_DASHBOARD_PATH,
  WEEKEND_CUP_GAME_BY_KEY,
  WEEKEND_CUP_REGISTRATION_DISABLED_MESSAGE,
  WEEKEND_CUP_REGISTRATION_ENABLED,
  WEEKEND_CUP_SLUG,
  cleanWeekendCupText,
  isWeekendCupRegistrationOpen,
  isWeekendCupGame,
  isWeekendCupPaidStatus,
  type WeekendCupPlayerRegistration,
} from '@/lib/weekend-cup';
import {
  getWeekendCupCapacityErrorMessage,
  getWeekendCupRegistrationSummary,
} from '@/lib/weekend-cup-server';
import type {
  OnlineTournamentCheckInStatus,
  OnlineTournamentEligibilityStatus,
  OnlineTournamentPaymentStatus,
} from '@/lib/online-tournament';

type WeekendCupAdminRegistration = WeekendCupPlayerRegistration & {
  user_id: string;
  phone: string | null;
  email: string | null;
  tournament_lobby_number: number | null;
  tournament_lobby_slot: number | null;
  tournament_lobby_assigned_at: string | null;
  admin_note: string | null;
  user?: {
    id: string;
    username: string;
    phone?: string | null;
    email?: string | null;
    role?: 'user' | 'moderator' | 'admin' | null;
    is_banned?: boolean | null;
  } | null;
};

const ELIGIBILITY_STATUSES: OnlineTournamentEligibilityStatus[] = [
  'pending',
  'verified',
  'ineligible',
  'disqualified',
];
const CHECK_IN_STATUSES: OnlineTournamentCheckInStatus[] = [
  'registered',
  'checked_in',
  'no_show',
];

function isEligibilityStatus(value: unknown): value is OnlineTournamentEligibilityStatus {
  return typeof value === 'string' && ELIGIBILITY_STATUSES.includes(value as OnlineTournamentEligibilityStatus);
}

function isCheckInStatus(value: unknown): value is OnlineTournamentCheckInStatus {
  return typeof value === 'string' && CHECK_IN_STATUSES.includes(value as OnlineTournamentCheckInStatus);
}

function cleanOptionalText(value: unknown, maxLength = 300) {
  const text = cleanWeekendCupText(value, maxLength);
  return text || null;
}

async function loadRegistrations() {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('online_tournament_registrations')
    .select(
      'id, user_id, game, in_game_username, phone, email, instagram_username, youtube_name, followed_instagram, subscribed_youtube, reward_eligible, eligibility_status, check_in_status, entry_fee_kes, payment_tier, payment_status, payment_reference, payment_confirmed_at, payment_note, game_uid, whatsapp_number, device_model, device_serial_last6, checked_in_at, created_at, updated_at, tournament_lobby_number, tournament_lobby_slot, tournament_lobby_assigned_at, admin_note, user:user_id(id, username, phone, email, role, is_banned)'
    )
    .eq('event_slug', WEEKEND_CUP_SLUG)
    .order('game', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    throw error;
  }

  return ((data ?? []) as Array<
    Omit<WeekendCupAdminRegistration, 'user'> & {
      user?: WeekendCupAdminRegistration['user'] | WeekendCupAdminRegistration['user'][];
    }
  >).map((registration) => ({
    ...registration,
    user: Array.isArray(registration.user) ? (registration.user[0] ?? null) : (registration.user ?? null),
  }));
}

export async function GET(request: NextRequest) {
  if (!WEEKEND_CUP_REGISTRATION_ENABLED || !isWeekendCupRegistrationOpen()) {
    return NextResponse.json(
      { error: WEEKEND_CUP_REGISTRATION_DISABLED_MESSAGE },
      { status: 503 }
    );
  }

  const access = await requireActiveAccessProfile(request);
  if (access.response) {
    return access.response;
  }

  if (!hasModeratorAccess(access.profile)) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  try {
    const [registrations, summary] = await Promise.all([
      loadRegistrations(),
      getWeekendCupRegistrationSummary(),
    ]);

    return NextResponse.json({ registrations, summary });
  } catch (error) {
    console.error('[AdminWeekendCupRegistrations GET] Error:', error);
    return NextResponse.json({ error: 'Could not load Weekend Cup registrations' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  if (!WEEKEND_CUP_REGISTRATION_ENABLED || !isWeekendCupRegistrationOpen()) {
    return NextResponse.json(
      { error: WEEKEND_CUP_REGISTRATION_DISABLED_MESSAGE },
      { status: 503 }
    );
  }

  const access = await requireActiveAccessProfile(request);
  if (access.response) {
    return access.response;
  }

  if (!hasModeratorAccess(access.profile)) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const registrationId = cleanWeekendCupText(body.registration_id, 80);
    if (!registrationId) {
      return NextResponse.json({ error: 'Registration id is required' }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { data: currentRaw, error: currentError } = await supabase
      .from('online_tournament_registrations')
      .select(
        'id, user_id, game, in_game_username, eligibility_status, check_in_status, payment_status'
      )
      .eq('id', registrationId)
      .eq('event_slug', WEEKEND_CUP_SLUG)
      .maybeSingle();

    const currentRegistration = currentRaw as
      | {
          id: string;
          user_id: string;
          game: string;
          in_game_username: string | null;
          eligibility_status: OnlineTournamentEligibilityStatus;
          check_in_status: OnlineTournamentCheckInStatus;
          payment_status: OnlineTournamentPaymentStatus;
        }
      | null;

    if (currentError || !currentRegistration) {
      return NextResponse.json({ error: 'Registration not found' }, { status: 404 });
    }

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    const nextPaymentStatus = currentRegistration.payment_status;

    if (
      Object.prototype.hasOwnProperty.call(body, 'payment_status') ||
      Object.prototype.hasOwnProperty.call(body, 'payment_tier') ||
      Object.prototype.hasOwnProperty.call(body, 'entry_fee_kes') ||
      Object.prototype.hasOwnProperty.call(body, 'payment_reference') ||
      Object.prototype.hasOwnProperty.call(body, 'payment_note')
    ) {
      return NextResponse.json(
        { error: 'Payment status is controlled by Paystack confirmation' },
        { status: 400 }
      );
    }

    if (Object.prototype.hasOwnProperty.call(body, 'eligibility_status')) {
      if (!isEligibilityStatus(body.eligibility_status)) {
        return NextResponse.json({ error: 'Invalid eligibility status' }, { status: 400 });
      }

      updates.eligibility_status = body.eligibility_status;
      updates.reward_eligible = body.eligibility_status === 'verified';
      if (body.eligibility_status === 'disqualified') {
        updates.check_in_status = 'registered';
        updates.checked_in_at = null;
        updates.tournament_lobby_number = null;
        updates.tournament_lobby_slot = null;
        updates.tournament_lobby_assigned_at = null;
      }
    }

    if (Object.prototype.hasOwnProperty.call(body, 'check_in_status')) {
      if (!isCheckInStatus(body.check_in_status)) {
        return NextResponse.json({ error: 'Invalid check-in status' }, { status: 400 });
      }

      const nextCheckInStatus = body.check_in_status;
      if (nextCheckInStatus === 'checked_in' && !isWeekendCupPaidStatus(nextPaymentStatus)) {
        return NextResponse.json({ error: WEEKEND_CUP_CHECK_IN_BLOCKED_MESSAGE }, { status: 400 });
      }

      const currentGame = currentRegistration.game;
      if (
        currentGame &&
        isWeekendCupGame(currentGame) &&
        nextCheckInStatus === 'checked_in' &&
        currentRegistration.check_in_status !== 'checked_in'
      ) {
        const gameConfig = WEEKEND_CUP_GAME_BY_KEY[currentGame];
        const { count: checkedInCount, error: checkedInCountError } = await supabase
          .from('online_tournament_registrations')
          .select('id', { count: 'exact', head: true })
          .eq('event_slug', WEEKEND_CUP_SLUG)
          .eq('game', currentGame)
          .eq('check_in_status', 'checked_in')
          .eq('payment_status', 'paid')
          .neq('eligibility_status', 'disqualified');

        if (checkedInCountError) {
          return NextResponse.json({ error: 'Could not verify check-in capacity' }, { status: 500 });
        }

        if ((checkedInCount ?? 0) >= gameConfig.checkInCap) {
          return NextResponse.json({ error: `${gameConfig.label} check-in is full` }, { status: 400 });
        }
      }

      updates.check_in_status = body.check_in_status;
      if (body.check_in_status === 'checked_in') {
        updates.checked_in_at = updates.updated_at;
      } else {
        updates.checked_in_at = null;
        updates.tournament_lobby_number = null;
        updates.tournament_lobby_slot = null;
        updates.tournament_lobby_assigned_at = null;
      }
    }

    if (Object.prototype.hasOwnProperty.call(body, 'admin_note')) {
      updates.admin_note = cleanOptionalText(body.admin_note, 500);
    }

    const { data: updated, error } = await supabase
      .from('online_tournament_registrations')
      .update(updates)
      .eq('id', registrationId)
      .eq('event_slug', WEEKEND_CUP_SLUG)
      .select(
        'id, user_id, game, eligibility_status, check_in_status, reward_eligible, entry_fee_kes, payment_tier, payment_status, payment_reference, payment_confirmed_at, payment_confirmed_by, payment_note, admin_note, tournament_lobby_number, tournament_lobby_slot'
      )
      .single();

    if (error || !updated) {
      const updatedGame = cleanWeekendCupText(currentRegistration.game, 20);
      if (isWeekendCupGame(updatedGame)) {
        const capacityErrorMessage = getWeekendCupCapacityErrorMessage(updatedGame, error);
        if (capacityErrorMessage) {
          return NextResponse.json({ error: capacityErrorMessage }, { status: 400 });
        }
      }

      return NextResponse.json({ error: 'Could not update Weekend Cup registration' }, { status: 500 });
    }

    const updatedGame = cleanWeekendCupText((updated as { game?: unknown }).game, 20);
    if (
      isWeekendCupGame(updatedGame) &&
      (updated as { check_in_status?: unknown }).check_in_status === 'checked_in' &&
      (updated as { eligibility_status?: unknown }).eligibility_status !== 'disqualified' &&
      isWeekendCupPaidStatus((updated as { payment_status?: unknown }).payment_status)
    ) {
      await assignOnlineTournamentLobbySlot({
        supabase,
        registrationId,
        eventSlug: WEEKEND_CUP_SLUG,
        userId: String((updated as { user_id?: unknown }).user_id ?? ''),
        game: updatedGame,
      });
    }

    await writeAuditLog({
      adminId: access.profile.id,
      action: 'system_note',
      targetType: 'tournament',
      targetId: registrationId,
      ipAddress: getClientIp(request),
      details: {
        event_slug: WEEKEND_CUP_SLUG,
        registration_id: registrationId,
        game: isWeekendCupGame(updatedGame) ? updatedGame : null,
        updates,
      },
    });

    if (
      currentRegistration.user_id &&
      isWeekendCupGame(updatedGame) &&
      currentRegistration.payment_status !== 'paid' &&
      (updated as { payment_status?: unknown }).payment_status === 'paid'
    ) {
      const config = WEEKEND_CUP_GAME_BY_KEY[updatedGame];
      await createNotification(
        {
          user_id: currentRegistration.user_id,
          type: 'tournament_registration_verified',
          title: `${config.shortLabel} payment confirmed`,
          body: `Your ${config.label} Weekend Cup slot is confirmed. Open your dashboard and check in when you are ready.`,
          href: `${WEEKEND_CUP_DASHBOARD_PATH}?game=${encodeURIComponent(updatedGame)}`,
          metadata: {
            event_slug: WEEKEND_CUP_SLUG,
            registration_id: registrationId,
            game: updatedGame,
          },
        },
        supabase
      );
    }

    const [registrations, summary] = await Promise.all([
      loadRegistrations(),
      getWeekendCupRegistrationSummary({ supabase }),
    ]);

    return NextResponse.json({ registrations, summary });
  } catch (error) {
    console.error('[AdminWeekendCupRegistrations PATCH] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
