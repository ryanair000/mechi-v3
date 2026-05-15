import { NextRequest, NextResponse } from 'next/server';
import { hasModeratorAccess, requireActiveAccessProfile } from '@/lib/access';
import { writeAuditLog } from '@/lib/audit';
import { createNotification } from '@/lib/notifications';
import {
  ONLINE_TOURNAMENT_ENTRY_PRICING,
  getOnlineTournamentCapacityErrorType,
  getOnlineTournamentDefaultPaymentForConfirmation,
  getOnlineTournamentPaymentTierAmount,
  ONLINE_TOURNAMENT_ARENA_PATH,
  ONLINE_TOURNAMENT_CHECK_IN_STATUSES,
  ONLINE_TOURNAMENT_ELIGIBILITY_STATUSES,
  ONLINE_TOURNAMENT_GAME_BY_KEY,
  ONLINE_TOURNAMENT_SLUG,
  isOnlineTournamentGame,
  isOnlineTournamentPaidStatus,
  isOnlineTournamentPaymentStatus,
  isOnlineTournamentPaymentTier,
  type OnlineTournamentCheckInStatus,
  type OnlineTournamentEligibilityStatus,
  type OnlineTournamentGameKey,
  type OnlineTournamentPaymentStatus,
  type OnlineTournamentPaymentTier,
} from '@/lib/online-tournament';
import { getClientIp } from '@/lib/rateLimit';
import { createServiceClient } from '@/lib/supabase';
import { assignOnlineTournamentLobbySlot } from '@/lib/online-tournament-store';

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

function cleanOptionalText(value: unknown, maxLength = 300) {
  const text = String(value ?? '').trim().replace(/\s+/g, ' ').slice(0, maxLength);
  return text || null;
}

function readOptionalInteger(value: unknown) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (typeof value === 'number' && Number.isInteger(value) && value >= 0) {
    return value;
  }

  const text = String(value).trim();
  if (!/^\d+$/.test(text)) {
    return Number.NaN;
  }

  return Number(text);
}

async function getEarlyBirdPaidCount(params: {
  supabase: ReturnType<typeof createServiceClient>;
  excludeRegistrationId?: string;
}) {
  let query = params.supabase
    .from('online_tournament_registrations')
    .select('id', { count: 'exact', head: true })
    .eq('event_slug', ONLINE_TOURNAMENT_SLUG)
    .eq('payment_status', 'paid')
    .eq('payment_tier', 'early_bird')
    .neq('eligibility_status', 'disqualified');

  if (params.excludeRegistrationId) {
    query = query.neq('id', params.excludeRegistrationId);
  }

  const { count, error } = await query;
  if (error) {
    throw error;
  }

  return count ?? 0;
}

function getTournamentCapacityErrorMessage(
  game: OnlineTournamentGameKey,
  error: unknown
) {
  const errorType = getOnlineTournamentCapacityErrorType(error);
  if (!errorType) {
    return null;
  }

  const config = ONLINE_TOURNAMENT_GAME_BY_KEY[game];
  return errorType === 'registration_cap'
    ? `${config.label} registration is full`
    : `${config.label} check-in is full`;
}

async function loadRegistrations() {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('online_tournament_registrations')
    .select(
      'id, event_slug, user_id, game, in_game_username, game_uid, phone, whatsapp_number, device_model, device_serial_last6, tournament_lobby_number, tournament_lobby_slot, tournament_lobby_assigned_at, email, instagram_username, youtube_name, followed_instagram, subscribed_youtube, available_at_8pm, accepted_rules, reward_eligible, eligibility_status, check_in_status, entry_fee_kes, payment_tier, payment_status, payment_reference, payment_confirmed_at, payment_confirmed_by, payment_note, checked_in_at, admin_note, created_at, updated_at, user:user_id(id, username, phone, email, role, is_banned)'
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

    const supabase = createServiceClient();
    const { data: currentRaw, error: currentError } = await supabase
      .from('online_tournament_registrations')
      .select(
        'id, user_id, game, in_game_username, eligibility_status, check_in_status, payment_status, payment_tier, entry_fee_kes'
      )
      .eq('id', registrationId)
      .eq('event_slug', ONLINE_TOURNAMENT_SLUG)
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
          payment_tier: OnlineTournamentPaymentTier | null;
          entry_fee_kes: number | null;
        }
      | null;

    if (currentError || !currentRegistration) {
      return NextResponse.json({ error: 'Registration not found' }, { status: 404 });
    }

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    let nextPaymentStatus = currentRegistration.payment_status;
    let nextPaymentTier = currentRegistration.payment_tier;
    let nextEntryFeeKes = currentRegistration.entry_fee_kes;

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

    if (Object.prototype.hasOwnProperty.call(body, 'payment_status')) {
      if (!isOnlineTournamentPaymentStatus(body.payment_status)) {
        return NextResponse.json({ error: 'Invalid payment status' }, { status: 400 });
      }

      nextPaymentStatus = body.payment_status;
      updates.payment_status = nextPaymentStatus;

      if (isOnlineTournamentPaidStatus(nextPaymentStatus)) {
        updates.payment_confirmed_at = updates.updated_at;
        updates.payment_confirmed_by = access.profile.id;
      } else {
        updates.payment_confirmed_at = null;
        updates.payment_confirmed_by = null;
        updates.check_in_status = 'registered';
        updates.checked_in_at = null;
        updates.tournament_lobby_number = null;
        updates.tournament_lobby_slot = null;
        updates.tournament_lobby_assigned_at = null;
      }
    }

    if (Object.prototype.hasOwnProperty.call(body, 'payment_tier')) {
      if (body.payment_tier === null || body.payment_tier === '') {
        nextPaymentTier = null;
        updates.payment_tier = null;
      } else if (!isOnlineTournamentPaymentTier(body.payment_tier)) {
        return NextResponse.json({ error: 'Invalid payment tier' }, { status: 400 });
      } else {
        nextPaymentTier = body.payment_tier;
        updates.payment_tier = body.payment_tier;
      }
    }

    if (Object.prototype.hasOwnProperty.call(body, 'entry_fee_kes')) {
      const entryFeeKes = readOptionalInteger(body.entry_fee_kes);
      if (Number.isNaN(entryFeeKes)) {
        return NextResponse.json({ error: 'Entry fee must be a non-negative whole number' }, { status: 400 });
      }

      nextEntryFeeKes = entryFeeKes;
      updates.entry_fee_kes = entryFeeKes;
    }

    if (Object.prototype.hasOwnProperty.call(body, 'payment_reference')) {
      updates.payment_reference = cleanOptionalText(body.payment_reference, 120);
    }

    if (Object.prototype.hasOwnProperty.call(body, 'payment_note')) {
      updates.payment_note = cleanOptionalText(body.payment_note, 500);
    }

    if (isOnlineTournamentPaidStatus(nextPaymentStatus) && !nextPaymentTier) {
      const earlyBirdPaidCount = await getEarlyBirdPaidCount({
        supabase,
        excludeRegistrationId: registrationId,
      });
      const defaultPayment = getOnlineTournamentDefaultPaymentForConfirmation(earlyBirdPaidCount);

      nextPaymentTier = defaultPayment.tier;
      updates.payment_tier = defaultPayment.tier;

      if (nextEntryFeeKes === null) {
        nextEntryFeeKes = defaultPayment.amountKes;
        updates.entry_fee_kes = defaultPayment.amountKes;
      }
    }

    if (isOnlineTournamentPaidStatus(nextPaymentStatus) && nextPaymentTier && nextEntryFeeKes === null) {
      nextEntryFeeKes = getOnlineTournamentPaymentTierAmount(nextPaymentTier);
      updates.entry_fee_kes = nextEntryFeeKes;
    }

    if (Object.prototype.hasOwnProperty.call(body, 'check_in_status')) {
      if (!isCheckInStatus(body.check_in_status)) {
        return NextResponse.json({ error: 'Invalid check-in status' }, { status: 400 });
      }

      const nextCheckInStatus = body.check_in_status;
      if (nextCheckInStatus === 'checked_in' && !isOnlineTournamentPaidStatus(nextPaymentStatus)) {
        return NextResponse.json(
          { error: ONLINE_TOURNAMENT_ENTRY_PRICING.pendingPaymentMessage },
          { status: 400 }
        );
      }

      const currentGame = currentRegistration.game;
      if (
        currentGame &&
        isOnlineTournamentGame(currentGame) &&
        nextCheckInStatus === 'checked_in' &&
        currentRegistration.check_in_status !== 'checked_in'
      ) {
        const gameConfig = ONLINE_TOURNAMENT_GAME_BY_KEY[currentGame];
        const { count: checkedInCount, error: checkedInCountError } = await supabase
          .from('online_tournament_registrations')
          .select('id', { count: 'exact', head: true })
          .eq('event_slug', ONLINE_TOURNAMENT_SLUG)
          .eq('game', currentGame)
          .eq('check_in_status', 'checked_in')
          .neq('eligibility_status', 'disqualified');

        if (checkedInCountError) {
          return NextResponse.json(
            { error: 'Could not verify check-in capacity' },
            { status: 500 }
          );
        }

        if ((checkedInCount ?? 0) >= gameConfig.checkInCap) {
          return NextResponse.json(
            { error: `${gameConfig.label} check-in is full` },
            { status: 400 }
          );
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
      .eq('event_slug', ONLINE_TOURNAMENT_SLUG)
      .select(
        'id, event_slug, game, user_id, eligibility_status, check_in_status, reward_eligible, entry_fee_kes, payment_tier, payment_status, payment_reference, payment_confirmed_at, payment_confirmed_by, payment_note, admin_note, tournament_lobby_number, tournament_lobby_slot'
      )
      .single();

    if (error || !updated) {
      const updatedGame = String(currentRegistration.game ?? '').trim();
      if (isOnlineTournamentGame(updatedGame)) {
        const capacityErrorMessage = getTournamentCapacityErrorMessage(updatedGame, error);
        if (capacityErrorMessage) {
          return NextResponse.json({ error: capacityErrorMessage }, { status: 400 });
        }
      }

      return NextResponse.json({ error: 'Could not update registration' }, { status: 500 });
    }

    const updatedGame = String((updated as { game?: unknown }).game ?? '');
    if (
      isOnlineTournamentGame(updatedGame) &&
      (updated as { check_in_status?: unknown }).check_in_status === 'checked_in' &&
      (updated as { eligibility_status?: unknown }).eligibility_status !== 'disqualified' &&
      isOnlineTournamentPaidStatus((updated as { payment_status?: unknown }).payment_status)
    ) {
      const updatedUserId = String((updated as { user_id?: unknown }).user_id ?? '');
      await assignOnlineTournamentLobbySlot({
        supabase,
        registrationId,
        eventSlug: ONLINE_TOURNAMENT_SLUG,
        userId: updatedUserId || undefined,
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
        event_slug: ONLINE_TOURNAMENT_SLUG,
        registration_id: registrationId,
        game: isOnlineTournamentGame(updatedGame) ? updatedGame : null,
        updates,
      },
    });

    if (
      currentRegistration.user_id &&
      isOnlineTournamentGame(updatedGame) &&
      currentRegistration.eligibility_status !== 'verified' &&
      (updated as { eligibility_status?: unknown }).eligibility_status === 'verified'
    ) {
      const config = ONLINE_TOURNAMENT_GAME_BY_KEY[updatedGame];
      const playerLabel = currentRegistration.in_game_username?.trim() || 'Your slot';
      await createNotification(
        {
          user_id: currentRegistration.user_id,
          type: 'tournament_registration_verified',
          title: `${config.shortLabel} verification confirmed`,
          body: `${playerLabel} is now verified for ${config.label}. Open the tournament desk for room and result updates.`,
          href: `${ONLINE_TOURNAMENT_ARENA_PATH}?game=${encodeURIComponent(updatedGame)}`,
          metadata: {
            event_slug: ONLINE_TOURNAMENT_SLUG,
            registration_id: registrationId,
            game: updatedGame,
          },
        },
        supabase
      );
    }

    const registrations = await loadRegistrations();
    return NextResponse.json({ registration: updated, registrations });
  } catch (error) {
    console.error('[AdminOnlineTournamentRegistrations PATCH] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
