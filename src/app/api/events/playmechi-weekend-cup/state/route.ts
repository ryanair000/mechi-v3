import { after, NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import {
  getGameIdKey,
  getGamePlatformKey,
  normalizeGameIdKeys,
  normalizeSelectedGameKeys,
} from '@/lib/config';
import {
  normalizeTournamentDeviceSerialLast6,
  requiresTournamentDeviceSerialLast6,
} from '@/lib/online-tournament';
import { assignOnlineTournamentLobbySlot } from '@/lib/online-tournament-store';
import { checkPersistentRateLimit, getClientIp, rateLimitResponse } from '@/lib/rateLimit';
import { createServiceClient } from '@/lib/supabase';
import { sendOnlineTournamentCheckInTelegramNotification } from '@/lib/telegram';
import type { GameKey, PlatformKey } from '@/types';
import {
  WEEKEND_CUP_CHECK_IN_BLOCKED_MESSAGE,
  WEEKEND_CUP_GAME_BY_KEY,
  WEEKEND_CUP_REGISTRATION_DISABLED_MESSAGE,
  WEEKEND_CUP_REGISTRATION_ENABLED,
  WEEKEND_CUP_SLUG,
  WEEKEND_CUP_TITLE,
  cleanWeekendCupText,
  getWeekendCupWindowState,
  isWeekendCupRegistrationOpen,
  isWeekendCupGame,
} from '@/lib/weekend-cup';
import {
  getWeekendCupCapacityErrorMessage,
  getWeekendCupRegistrationSummary,
} from '@/lib/weekend-cup-server';

function normalizeProfileGameIds(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return normalizeGameIdKeys(
    Object.fromEntries(
      Object.entries(value).map(([key, gameId]) => [key, String(gameId ?? '').trim()])
    )
  );
}

async function syncCheckInDetailsToProfile(params: {
  supabase: ReturnType<typeof createServiceClient>;
  userId: string;
  game: keyof typeof WEEKEND_CUP_GAME_BY_KEY;
  gameUid: string;
  whatsappNumber: string;
}) {
  const { supabase, userId, game, gameUid, whatsappNumber } = params;
  const { data: profileRaw, error: profileError } = await supabase
    .from('profiles')
    .select('selected_games, platforms, game_ids, whatsapp_number')
    .eq('id', userId)
    .single();

  if (profileError || !profileRaw) {
    throw profileError ?? new Error('Profile not found');
  }

  const profile = profileRaw as {
    selected_games?: GameKey[] | null;
    platforms?: PlatformKey[] | null;
    game_ids?: Record<string, unknown> | null;
    whatsapp_number?: string | null;
  };
  const tournamentPlatform: PlatformKey = 'mobile';
  const selectedGames = normalizeSelectedGameKeys(profile.selected_games ?? []);
  const platforms = Array.isArray(profile.platforms) ? profile.platforms : [];
  const gameIds = normalizeProfileGameIds(profile.game_ids ?? {});
  const gamePlatformKey = getGamePlatformKey(game);
  const gameIdKey = getGameIdKey(game, tournamentPlatform);
  const nextSelectedGames = selectedGames.includes(game) ? selectedGames : [...selectedGames, game];
  const nextPlatforms = platforms.includes(tournamentPlatform)
    ? platforms
    : [...platforms, tournamentPlatform];
  const nextGameIds = {
    ...gameIds,
    [gamePlatformKey]: tournamentPlatform,
    [gameIdKey]: gameUid,
  };
  const updateData: Record<string, unknown> = {};

  if (nextSelectedGames.length !== selectedGames.length) {
    updateData.selected_games = nextSelectedGames;
  }

  if (nextPlatforms.length !== platforms.length) {
    updateData.platforms = nextPlatforms;
  }

  if (gameIds[gamePlatformKey] !== tournamentPlatform || gameIds[gameIdKey] !== gameUid) {
    updateData.game_ids = nextGameIds;
  }

  if (whatsappNumber && whatsappNumber !== (profile.whatsapp_number ?? '').trim()) {
    updateData.whatsapp_number = whatsappNumber;
  }

  if (Object.keys(updateData).length === 0) {
    return;
  }

  const { error: updateError } = await supabase.from('profiles').update(updateData).eq('id', userId);
  if (updateError) {
    throw updateError;
  }
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

  try {
    const summary = await getWeekendCupRegistrationSummary({
      userId: access.profile.id,
    });
    const supabase = createServiceClient();
    const { data: submissions } = await supabase
      .from('online_tournament_result_submissions')
      .select(
        'id, event_slug, game, registration_id, user_id, room_id, fixture_id, match_number, kills, placement, player1_score, player2_score, screenshot_url, status, admin_note, created_at, updated_at'
      )
      .eq('event_slug', WEEKEND_CUP_SLUG)
      .eq('user_id', access.profile.id)
      .order('created_at', { ascending: false });

    return NextResponse.json({
      ...summary,
      roster: [],
      myRegistrations: summary.registrations,
      rooms: [],
      fixtures: [],
      standings: {},
      mySubmissions: submissions ?? [],
      payouts: [],
    });
  } catch (error) {
    console.error('[WeekendCupState GET] Error:', error);
    return NextResponse.json({ error: 'Could not load Weekend Cup player state' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
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

  try {
    const checkInRateLimit = await checkPersistentRateLimit(
      `weekend-cup-state:${access.profile.id}:${getClientIp(request)}`,
      20,
      15 * 60 * 1000
    );
    if (!checkInRateLimit.allowed) {
      return rateLimitResponse(checkInRateLimit.retryAfterSeconds);
    }

    const body = (await request.json()) as Record<string, unknown>;
    const action = cleanWeekendCupText(body.action, 40);
    if (action !== 'check_in') {
      return NextResponse.json({ error: 'Unknown Weekend Cup action' }, { status: 400 });
    }

    const game = cleanWeekendCupText(body.game, 20);
    if (!isWeekendCupGame(game)) {
      return NextResponse.json({ error: 'Pick a valid Weekend Cup game' }, { status: 400 });
    }

    const config = WEEKEND_CUP_GAME_BY_KEY[game];
    const windowState = getWeekendCupWindowState(config);
    const inGameUsername = cleanWeekendCupText(body.in_game_username, 80);
    const gameUid = cleanWeekendCupText(body.game_uid, 80);
    const deviceModel = cleanWeekendCupText(body.device_model, 100);
    const whatsappNumber = cleanWeekendCupText(body.whatsapp_number, 40);
    const requiresDeviceSerial = requiresTournamentDeviceSerialLast6(game);
    const deviceSerialLast6 = normalizeTournamentDeviceSerialLast6(body.device_serial_last6);

    if (inGameUsername.length < 2) {
      return NextResponse.json({ error: 'Add your IGN' }, { status: 400 });
    }

    if (gameUid.length < 2) {
      return NextResponse.json({ error: 'Add your UID' }, { status: 400 });
    }

    if (deviceModel.length < 2) {
      return NextResponse.json({ error: 'Add your device' }, { status: 400 });
    }

    if (whatsappNumber.length < 7) {
      return NextResponse.json({ error: 'Add your WhatsApp number' }, { status: 400 });
    }

    if (requiresDeviceSerial && deviceSerialLast6.length !== 6) {
      return NextResponse.json(
        { error: 'Add the last 6 characters of your device serial number' },
        { status: 400 }
      );
    }

    const checkedInAt = new Date().toISOString();
    const supabase = createServiceClient();
    const { data: currentRaw, error: currentError } = await supabase
      .from('online_tournament_registrations')
      .select(
        'id, check_in_status, eligibility_status, payment_status, payment_tier, entry_fee_kes'
      )
      .eq('event_slug', WEEKEND_CUP_SLUG)
      .eq('user_id', access.profile.id)
      .eq('game', game)
      .maybeSingle();

    const currentRegistration = currentRaw as
      | {
          id: string;
          check_in_status: string;
          eligibility_status: string;
          payment_status: string;
          payment_tier: string | null;
          entry_fee_kes: number | null;
        }
      | null;

    if (currentError) {
      console.error('[WeekendCupState POST] Registration query error:', currentError);
      return NextResponse.json({ error: 'Could not load your Weekend Cup registration' }, { status: 500 });
    }

    if (!currentRegistration) {
      return NextResponse.json({ error: 'Register for this game before check-in' }, { status: 404 });
    }

    if (currentRegistration.payment_status !== 'paid') {
      return NextResponse.json({ error: WEEKEND_CUP_CHECK_IN_BLOCKED_MESSAGE }, { status: 400 });
    }

    const alreadyCheckedIn =
      currentRegistration.check_in_status === 'checked_in' &&
      currentRegistration.eligibility_status !== 'disqualified';

    if (!alreadyCheckedIn) {
      const { count: checkedInCount, error: checkedInCountError } = await supabase
        .from('online_tournament_registrations')
        .select('id', { count: 'exact', head: true })
        .eq('event_slug', WEEKEND_CUP_SLUG)
        .eq('game', game)
        .eq('check_in_status', 'checked_in')
        .eq('payment_status', 'paid')
        .neq('eligibility_status', 'disqualified');

      if (checkedInCountError) {
        return NextResponse.json({ error: 'Could not verify Weekend Cup check-in capacity' }, { status: 500 });
      }

      if ((checkedInCount ?? 0) >= config.checkInCap) {
        return NextResponse.json({ error: `${config.label} check-in is full` }, { status: 400 });
      }
    }

    const { data: updatedRaw, error: updateError } = await supabase
      .from('online_tournament_registrations')
      .update({
        in_game_username: inGameUsername,
        game_uid: gameUid,
        whatsapp_number: whatsappNumber,
        device_model: deviceModel,
        ...(requiresDeviceSerial ? { device_serial_last6: deviceSerialLast6 } : {}),
        check_in_status: 'checked_in',
        checked_in_at: checkedInAt,
        updated_at: checkedInAt,
      })
      .eq('event_slug', WEEKEND_CUP_SLUG)
      .eq('user_id', access.profile.id)
      .eq('game', game)
      .neq('eligibility_status', 'disqualified')
      .select('id, tournament_lobby_number, tournament_lobby_slot')
      .maybeSingle();

    if (updateError) {
      const capacityErrorMessage = getWeekendCupCapacityErrorMessage(game, updateError);
      if (capacityErrorMessage) {
        return NextResponse.json({ error: capacityErrorMessage }, { status: 400 });
      }

      console.error('[WeekendCupState POST] Check-in update error:', updateError);
      return NextResponse.json({ error: 'Could not complete Weekend Cup check-in' }, { status: 500 });
    }

    if (!updatedRaw) {
      return NextResponse.json({ error: 'Could not complete Weekend Cup check-in' }, { status: 500 });
    }

    try {
      await syncCheckInDetailsToProfile({
        supabase,
        userId: access.profile.id,
        game,
        gameUid,
        whatsappNumber,
      });
    } catch (error) {
      console.error('[WeekendCupState POST] Profile sync error:', error);
    }

    const lobbyAssignment = await assignOnlineTournamentLobbySlot({
      supabase,
      registrationId: String(updatedRaw.id),
      eventSlug: WEEKEND_CUP_SLUG,
      userId: access.profile.id,
      game,
    });

    after(async () => {
      try {
        await sendOnlineTournamentCheckInTelegramNotification({
          eventTitle: WEEKEND_CUP_TITLE,
          username: access.profile.username,
          game,
          inGameUsername,
          gameUid,
          whatsappNumber,
          deviceModel,
          deviceSerialLast6: requiresDeviceSerial ? deviceSerialLast6 : null,
          tournamentLobbyNumber:
            lobbyAssignment?.tournament_lobby_number ?? updatedRaw.tournament_lobby_number ?? null,
          tournamentLobbySlot:
            lobbyAssignment?.tournament_lobby_slot ?? updatedRaw.tournament_lobby_slot ?? null,
          checkedInAt,
          registrationId: String(updatedRaw.id),
        });
      } catch (error) {
        console.error('[WeekendCupState Telegram] Check-in notification error:', error);
      }
    });

    const summary = await getWeekendCupRegistrationSummary({
      supabase,
      userId: access.profile.id,
    });
    const { data: submissions } = await supabase
      .from('online_tournament_result_submissions')
      .select(
        'id, event_slug, game, registration_id, user_id, room_id, fixture_id, match_number, kills, placement, player1_score, player2_score, screenshot_url, status, admin_note, created_at, updated_at'
      )
      .eq('event_slug', WEEKEND_CUP_SLUG)
      .eq('user_id', access.profile.id)
      .order('created_at', { ascending: false });

    return NextResponse.json({
      ...summary,
      roster: [],
      myRegistrations: summary.registrations,
      rooms: [],
      fixtures: [],
      standings: {},
      mySubmissions: submissions ?? [],
      payouts: [],
      checkInClosed: !windowState.isRegistrationOpen,
    });
  } catch (error) {
    console.error('[WeekendCupState POST] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
