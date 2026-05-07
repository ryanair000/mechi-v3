import { after, NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import {
  getGameIdKey,
  getGamePlatformKey,
  normalizeGameIdKeys,
  normalizeSelectedGameKeys,
} from '@/lib/config';
import {
  ONLINE_TOURNAMENT_SLUG,
  ONLINE_TOURNAMENT_TITLE,
  normalizeTournamentDeviceSerialLast6,
  isOnlineTournamentGame,
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

    if (deviceSerialLast6.length !== 6) {
      return NextResponse.json(
        { error: 'Add the last 6 characters of your device serial number' },
        { status: 400 }
      );
    }

    const checkedInAt = new Date().toISOString();
    const supabase = createServiceClient();
    const { data: registration, error: registrationError } = await supabase
      .from('online_tournament_registrations')
      .update({
        in_game_username: inGameUsername,
        game_uid: gameUid,
        whatsapp_number: whatsappNumber,
        device_model: deviceModel,
        device_serial_last6: deviceSerialLast6,
        check_in_status: 'checked_in',
        checked_in_at: checkedInAt,
        updated_at: checkedInAt,
      })
      .eq('event_slug', ONLINE_TOURNAMENT_SLUG)
      .eq('user_id', access.profile.id)
      .eq('game', game)
      .neq('eligibility_status', 'disqualified')
      .select(
        'id, event_slug, user_id, game, in_game_username, game_uid, whatsapp_number, device_model, device_serial_last6, check_in_status, tournament_lobby_number, tournament_lobby_slot, tournament_lobby_assigned_at'
      )
      .maybeSingle();

    if (registrationError) {
      console.error('[OnlineTournamentState POST] Check-in update error:', registrationError);
      return NextResponse.json({ error: 'Could not check you in' }, { status: 500 });
    }

    if (!registration) {
      return NextResponse.json(
        { error: 'Register for this game before checking in' },
        { status: 404 }
      );
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
          deviceSerialLast6,
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
