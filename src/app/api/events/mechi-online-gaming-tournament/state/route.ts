import { after, NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import {
  getGameIdKey,
  getGamePlatformKey,
  normalizeGameIdKeys,
  normalizeSelectedGameKeys,
} from '@/lib/config';
import {
  getOnlineTournamentCapacityErrorType,
  ONLINE_TOURNAMENT_GAME_BY_KEY,
  ONLINE_TOURNAMENT_SLUG,
  ONLINE_TOURNAMENT_TITLE,
  normalizeTournamentDeviceSerialLast6,
  isOnlineTournamentGame,
  requiresTournamentDeviceSerialLast6,
  type OnlineTournamentGameKey,
} from '@/lib/online-tournament';
import {
  assignOnlineTournamentLobbySlot,
  buildPlayerTournamentState,
  loadOnlineTournamentOpsState,
} from '@/lib/online-tournament-store';
import { checkPersistentRateLimit, getClientIp, rateLimitResponse } from '@/lib/rateLimit';
import { createServiceClient } from '@/lib/supabase';
import { sendOnlineTournamentCheckInTelegramNotification } from '@/lib/telegram';
import type { GameKey, PlatformKey } from '@/types';

const CHECK_IN_REGISTRATION_SELECT =
  'id, event_slug, user_id, game, in_game_username, game_uid, whatsapp_number, device_model, device_serial_last6, check_in_status, tournament_lobby_number, tournament_lobby_slot, tournament_lobby_assigned_at';

function cleanText(value: unknown, maxLength: number) {
  return String(value ?? '').trim().replace(/\s+/g, ' ').slice(0, maxLength);
}

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

function hasAlphabeticSerialCharacters(value: string) {
  return /[A-Z]/.test(value);
}

function isLegacyDeviceSerialConstraintError(error: unknown, deviceSerialLast6: string) {
  if (!hasAlphabeticSerialCharacters(deviceSerialLast6) || !error || typeof error !== 'object') {
    return false;
  }

  const candidate = error as {
    code?: string;
    details?: string;
    hint?: string;
    message?: string;
  };
  const text = [candidate.code, candidate.details, candidate.hint, candidate.message]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return (
    text.includes('23514') &&
    text.includes('device_serial_last6')
  ) || (
    text.includes('online_tournament_registrations_device_serial_last6_check')
  );
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

async function syncCheckInDetailsToProfile(params: {
  supabase: ReturnType<typeof createServiceClient>;
  userId: string;
  game: OnlineTournamentGameKey;
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

  const { error: updateError } = await supabase
    .from('profiles')
    .update(updateData)
    .eq('id', userId);

  if (updateError) {
    throw updateError;
  }
}

async function updateRegistrationForCheckIn(params: {
  supabase: ReturnType<typeof createServiceClient>;
  userId: string;
  game: OnlineTournamentGameKey;
  inGameUsername: string;
  gameUid: string;
  whatsappNumber: string;
  deviceModel: string;
  deviceSerialLast6: string;
  includeDeviceSerial: boolean;
  checkedInAt: string;
}) {
  const {
    supabase,
    userId,
    game,
    inGameUsername,
    gameUid,
    whatsappNumber,
    deviceModel,
    deviceSerialLast6,
    includeDeviceSerial,
    checkedInAt,
  } = params;

  const runUpdate = (includeDeviceSerial: boolean) =>
    supabase
      .from('online_tournament_registrations')
      .update({
        in_game_username: inGameUsername,
        game_uid: gameUid,
        whatsapp_number: whatsappNumber,
        device_model: deviceModel,
        ...(includeDeviceSerial ? { device_serial_last6: deviceSerialLast6 } : {}),
        check_in_status: 'checked_in',
        checked_in_at: checkedInAt,
        updated_at: checkedInAt,
      })
      .eq('event_slug', ONLINE_TOURNAMENT_SLUG)
      .eq('user_id', userId)
      .eq('game', game)
      .neq('eligibility_status', 'disqualified')
      .select(CHECK_IN_REGISTRATION_SELECT)
      .maybeSingle();

  if (!includeDeviceSerial) {
    const updateWithoutSerial = await runUpdate(false);
    return {
      registration: updateWithoutSerial.data,
      registrationError: updateWithoutSerial.error,
      serialPersisted: true,
    };
  }

  const primary = await runUpdate(true);
  if (!primary.error) {
    return {
      registration: primary.data,
      registrationError: null,
      serialPersisted: true,
    };
  }

  if (!isLegacyDeviceSerialConstraintError(primary.error, deviceSerialLast6)) {
    return {
      registration: primary.data,
      registrationError: primary.error,
      serialPersisted: true,
    };
  }

  console.warn(
    '[OnlineTournamentState POST] Falling back after legacy device serial constraint rejected an alphanumeric serial.'
  );

  const fallback = await runUpdate(false);
  return {
    registration: fallback.data,
    registrationError: fallback.error,
    serialPersisted: false,
  };
}

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

    const inGameUsername = cleanText(body.in_game_username, 80);
    const gameUid = cleanText(body.game_uid, 80);
    const deviceModel = cleanText(body.device_model, 100);
    const whatsappNumber = cleanText(body.whatsapp_number, 40);
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
    const { data: currentRegistration, error: currentRegistrationError } = await supabase
      .from('online_tournament_registrations')
      .select('id, check_in_status, eligibility_status')
      .eq('event_slug', ONLINE_TOURNAMENT_SLUG)
      .eq('user_id', access.profile.id)
      .eq('game', game)
      .maybeSingle();

    if (currentRegistrationError) {
      console.error(
        '[OnlineTournamentState POST] Current registration query error:',
        currentRegistrationError
      );
      return NextResponse.json({ error: 'Could not load your registration' }, { status: 500 });
    }

    if (!currentRegistration) {
      return NextResponse.json(
        { error: 'Register for this game before checking in' },
        { status: 404 }
      );
    }

    const alreadyCheckedIn =
      currentRegistration.check_in_status === 'checked_in' &&
      currentRegistration.eligibility_status !== 'disqualified';

    if (!alreadyCheckedIn) {
      const gameConfig = ONLINE_TOURNAMENT_GAME_BY_KEY[game];
      const { count: checkedInCount, error: checkedInCountError } = await supabase
        .from('online_tournament_registrations')
        .select('id', { count: 'exact', head: true })
        .eq('event_slug', ONLINE_TOURNAMENT_SLUG)
        .eq('game', game)
        .eq('check_in_status', 'checked_in')
        .neq('eligibility_status', 'disqualified');

      if (checkedInCountError) {
        console.error(
          '[OnlineTournamentState POST] Check-in count query error:',
          checkedInCountError
        );
        return NextResponse.json({ error: 'Could not verify check-in capacity' }, { status: 500 });
      }

      if ((checkedInCount ?? 0) >= gameConfig.checkInCap) {
        return NextResponse.json(
          { error: `${gameConfig.label} check-in is full` },
          { status: 400 }
        );
      }
    }

    const {
      registration,
      registrationError,
      serialPersisted,
    } = await updateRegistrationForCheckIn({
      supabase,
      userId: access.profile.id,
      game,
      inGameUsername,
      gameUid,
      whatsappNumber,
      deviceModel,
      deviceSerialLast6,
      includeDeviceSerial: requiresDeviceSerial,
      checkedInAt,
    });

    if (registrationError) {
      const capacityErrorMessage = getTournamentCapacityErrorMessage(game, registrationError);
      if (capacityErrorMessage) {
        return NextResponse.json({ error: capacityErrorMessage }, { status: 400 });
      }

      console.error('[OnlineTournamentState POST] Check-in update error:', registrationError);
      return NextResponse.json({ error: 'Could not check you in' }, { status: 500 });
    }

    if (!registration) {
      return NextResponse.json({ error: 'Could not check you in' }, { status: 500 });
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
      console.error('[OnlineTournamentState POST] Profile sync error:', error);
      return NextResponse.json({ error: 'Checked in, but could not update your profile' }, { status: 500 });
    }

    const lobbyAssignment = await assignOnlineTournamentLobbySlot({
      supabase,
      registrationId: String(registration.id),
      eventSlug: ONLINE_TOURNAMENT_SLUG,
      userId: access.profile.id,
      game,
    });
    const tournamentLobbyNumber =
      lobbyAssignment?.tournament_lobby_number ?? registration.tournament_lobby_number ?? null;
    const tournamentLobbySlot =
      lobbyAssignment?.tournament_lobby_slot ?? registration.tournament_lobby_slot ?? null;

    after(async () => {
      try {
        await sendOnlineTournamentCheckInTelegramNotification({
          eventTitle: ONLINE_TOURNAMENT_TITLE,
          username: access.profile.username,
          game,
          inGameUsername,
          gameUid,
          whatsappNumber,
          deviceModel,
          deviceSerialLast6: requiresDeviceSerial ? deviceSerialLast6 : null,
          tournamentLobbyNumber,
          tournamentLobbySlot,
          checkedInAt,
          registrationId: String(registration.id),
        });
      } catch (error) {
        console.error('[OnlineTournamentState POST] Telegram check-in notification error:', error);
      }
    });

    const state = await loadOnlineTournamentOpsState(supabase);
    return NextResponse.json(
      {
        ...buildPlayerTournamentState({
          state,
          userId: access.profile.id,
        }),
        warning: serialPersisted
          ? undefined
          : 'Checked in. We saved your desk access, but your serial last 6 still needs a database sync.',
      }
    );
  } catch (error) {
    console.error('[OnlineTournamentState POST] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
