import { NextRequest, NextResponse } from 'next/server';
import { getRequestAccessProfile, requireActiveAccessProfile } from '@/lib/access';
import {
  getConfiguredPlatformForGame,
  getGameIdKey,
  getGameIdValue,
  getGamePlatformKey,
  normalizeGameIdKeys,
  normalizeSelectedGameKeys,
} from '@/lib/config';
import {
  ONLINE_TOURNAMENT_GAME_BY_KEY,
  ONLINE_TOURNAMENT_GAMES,
  ONLINE_TOURNAMENT_SLUG,
  getOnlineTournamentWindowState,
  isOnlineTournamentGame,
  normalizeSocialHandle,
  type OnlineTournamentGameKey,
} from '@/lib/online-tournament';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rateLimit';
import { createServiceClient } from '@/lib/supabase';
import type { GameKey, PlatformKey } from '@/types';

type EventRegistrationRow = {
  id: string;
  game: OnlineTournamentGameKey;
  in_game_username: string;
  instagram_username: string | null;
  youtube_name: string | null;
  followed_instagram: boolean;
  subscribed_youtube: boolean;
  reward_eligible: boolean;
  eligibility_status: string;
  check_in_status: string;
  created_at: string;
  updated_at: string;
};

function emptyGameCounts() {
  return ONLINE_TOURNAMENT_GAMES.reduce(
    (counts, game) => {
      counts[game.game] = {
        registered: 0,
        slots: game.slots,
        spotsLeft: game.slots,
        full: false,
      };
      return counts;
    },
    {} as Record<
      OnlineTournamentGameKey,
      { registered: number; slots: number; spotsLeft: number; full: boolean }
    >
  );
}

function cleanText(value: unknown, maxLength = 120): string {
  return String(value ?? '').trim().replace(/\s+/g, ' ').slice(0, maxLength);
}

function getProfileGameId(params: {
  game: OnlineTournamentGameKey;
  gameIds: Record<string, string>;
  platforms: PlatformKey[];
}) {
  const platform = getConfiguredPlatformForGame(params.game, params.gameIds, params.platforms);
  if (!platform) return '';

  return getGameIdValue(params.gameIds, params.game, platform).trim();
}

async function getRegistrationSummary(userId?: string | null) {
  const supabase = createServiceClient();
  const { data: registrationsRaw, error } = await supabase
    .from('online_tournament_registrations')
    .select(
      'id, game, in_game_username, instagram_username, youtube_name, followed_instagram, subscribed_youtube, reward_eligible, eligibility_status, check_in_status, created_at, updated_at, user_id'
    )
    .eq('event_slug', ONLINE_TOURNAMENT_SLUG)
    .order('created_at', { ascending: true });

  if (error) {
    throw error;
  }

  const gameCounts = emptyGameCounts();
  const registrations = (registrationsRaw ?? []) as Array<EventRegistrationRow & { user_id: string }>;

  for (const registration of registrations) {
    if (!isOnlineTournamentGame(registration.game)) continue;
    if (registration.eligibility_status === 'disqualified') continue;

    gameCounts[registration.game].registered += 1;
  }

  for (const game of ONLINE_TOURNAMENT_GAMES) {
    const registered = gameCounts[game.game].registered;
    gameCounts[game.game].spotsLeft = Math.max(0, game.slots - registered);
    gameCounts[game.game].full = registered >= game.slots;
  }

  return {
    games: gameCounts,
    registrations: userId
      ? registrations
          .filter((registration) => registration.user_id === userId)
          .map((registration) => ({
            id: registration.id,
            game: registration.game,
            in_game_username: registration.in_game_username,
            instagram_username: registration.instagram_username,
            youtube_name: registration.youtube_name,
            followed_instagram: registration.followed_instagram,
            subscribed_youtube: registration.subscribed_youtube,
            reward_eligible: registration.reward_eligible,
            eligibility_status: registration.eligibility_status,
            check_in_status: registration.check_in_status,
            created_at: registration.created_at,
            updated_at: registration.updated_at,
          }))
      : [],
  };
}

export async function GET(request: NextRequest) {
  try {
    const accessProfile = await getRequestAccessProfile(request);
    const summary = await getRegistrationSummary(accessProfile?.id ?? null);

    return NextResponse.json(summary);
  } catch (error) {
    console.error('[OnlineTournamentRegistration GET] Error:', error);
    return NextResponse.json({ error: 'Could not load tournament registration state' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) {
    return access.response;
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const gameInput = String(body.game ?? '').trim();

    if (!isOnlineTournamentGame(gameInput)) {
      return NextResponse.json({ error: 'Pick a supported tournament game' }, { status: 400 });
    }

    const game = gameInput;
    const gameConfig = ONLINE_TOURNAMENT_GAME_BY_KEY[game];
    const windowState = getOnlineTournamentWindowState(gameConfig);

    if (!windowState.isRegistrationOpen) {
      return NextResponse.json({ error: `${gameConfig.label} registration is closed` }, { status: 400 });
    }

    const createRateLimit = checkRateLimit(
      `online-tournament-register:${access.profile.id}:${game}:${getClientIp(request)}`,
      5,
      30 * 60 * 1000
    );
    if (!createRateLimit.allowed) {
      return rateLimitResponse(createRateLimit.retryAfterSeconds);
    }

    const supabase = createServiceClient();
    const { data: profileRaw, error: profileError } = await supabase
      .from('profiles')
      .select('id, username, phone, email, whatsapp_number, selected_games, game_ids, platforms')
      .eq('id', access.profile.id)
      .single();

    const profile = profileRaw as
      | {
          id: string;
          username: string;
          phone?: string | null;
          email?: string | null;
          whatsapp_number?: string | null;
          selected_games?: GameKey[] | null;
          game_ids?: Record<string, string> | null;
          platforms?: PlatformKey[] | null;
        }
      | null;

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const selectedGames = normalizeSelectedGameKeys(profile.selected_games ?? []);
    const profileGameIds = normalizeGameIdKeys(profile.game_ids ?? {});
    const profilePlatforms = Array.isArray(profile.platforms) ? profile.platforms : [];

    const { count: registeredCount, error: countError } = await supabase
      .from('online_tournament_registrations')
      .select('id', { count: 'exact', head: true })
      .eq('event_slug', ONLINE_TOURNAMENT_SLUG)
      .eq('game', game)
      .neq('eligibility_status', 'disqualified');

    if (countError) {
      return NextResponse.json({ error: 'Could not check available slots' }, { status: 500 });
    }

    const { data: existingRegistration } = await supabase
      .from('online_tournament_registrations')
      .select('id')
      .eq('event_slug', ONLINE_TOURNAMENT_SLUG)
      .eq('user_id', access.profile.id)
      .eq('game', game)
      .maybeSingle();

    if (!existingRegistration && (registeredCount ?? 0) >= gameConfig.slots) {
      return NextResponse.json({ error: `${gameConfig.label} slots are full` }, { status: 400 });
    }

    const profileGameId = getProfileGameId({
      game,
      gameIds: profileGameIds,
      platforms: profilePlatforms,
    });
    const inGameUsername = cleanText(body.in_game_username, 80) || profileGameId;
    const instagramUsername = normalizeSocialHandle(body.instagram_username);
    const youtubeName = cleanText(body.youtube_name, 100);
    const followedInstagram = Boolean(body.followed_instagram);
    const subscribedYoutube = Boolean(body.subscribed_youtube);
    const availableAt8pm = Boolean(body.available_at_8pm);
    const acceptedRules = Boolean(body.accepted_rules);

    if (inGameUsername.length < 2) {
      return NextResponse.json({ error: 'Add your in-game username or gamer tag' }, { status: 400 });
    }

    if (!availableAt8pm) {
      return NextResponse.json(
        { error: `Confirm that you are available at 8:00 PM on ${gameConfig.dateLabel}` },
        { status: 400 }
      );
    }

    if (!acceptedRules) {
      return NextResponse.json({ error: 'Accept the tournament rules before registering' }, { status: 400 });
    }

    if (followedInstagram && instagramUsername.length < 2) {
      return NextResponse.json(
        { error: 'Add the Instagram username used to follow PlayMechi' },
        { status: 400 }
      );
    }

    if (subscribedYoutube && youtubeName.length < 2) {
      return NextResponse.json(
        { error: 'Add the Youtube mail or channel name used to subscribe' },
        { status: 400 }
      );
    }

    const tournamentPlatform: PlatformKey = 'mobile';
    const profilePlatformKey = getGamePlatformKey(game);
    const profileMobileGameId = getGameIdValue(profileGameIds, game, tournamentPlatform).trim();
    const nextSelectedGames = selectedGames.includes(game) ? selectedGames : [...selectedGames, game];
    const nextPlatforms = profilePlatforms.includes(tournamentPlatform)
      ? profilePlatforms
      : [...profilePlatforms, tournamentPlatform];
    const nextGameIds = {
      ...profileGameIds,
      [profilePlatformKey]: tournamentPlatform,
    };
    const shouldSaveSubmittedGameId = !profileMobileGameId || !selectedGames.includes(game);

    if (shouldSaveSubmittedGameId) {
      nextGameIds[getGameIdKey(game, tournamentPlatform)] = inGameUsername;
    }

    const shouldUpdateProfile =
      nextSelectedGames.length !== selectedGames.length ||
      nextPlatforms.length !== profilePlatforms.length ||
      profileGameIds[profilePlatformKey] !== tournamentPlatform ||
      shouldSaveSubmittedGameId;

    if (shouldUpdateProfile) {
      const { error: profileUpdateError } = await supabase
        .from('profiles')
        .update({
          selected_games: nextSelectedGames,
          platforms: nextPlatforms,
          game_ids: nextGameIds,
        })
        .eq('id', access.profile.id);

      if (profileUpdateError) {
        return NextResponse.json({ error: 'Could not update your game profile' }, { status: 500 });
      }
    }

    const nextEligibilityStatus =
      followedInstagram && subscribedYoutube ? 'pending' : 'ineligible';

    const { data: registration, error: registrationError } = await supabase
      .from('online_tournament_registrations')
      .upsert(
        {
          event_slug: ONLINE_TOURNAMENT_SLUG,
          user_id: access.profile.id,
          game,
          in_game_username: inGameUsername,
          phone: profile.phone ?? null,
          whatsapp_number: profile.whatsapp_number ?? profile.phone ?? null,
          email: profile.email ?? null,
          instagram_username: instagramUsername || null,
          youtube_name: youtubeName || null,
          followed_instagram: followedInstagram,
          subscribed_youtube: subscribedYoutube,
          available_at_8pm: availableAt8pm,
          accepted_rules: acceptedRules,
          reward_eligible: false,
          eligibility_status: nextEligibilityStatus,
          check_in_status: 'registered',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'event_slug,user_id,game' }
      )
      .select(
        'id, game, in_game_username, instagram_username, youtube_name, followed_instagram, subscribed_youtube, reward_eligible, eligibility_status, check_in_status, created_at, updated_at'
      )
      .single();

    if (registrationError || !registration) {
      return NextResponse.json({ error: 'Could not save tournament registration' }, { status: 500 });
    }

    const summary = await getRegistrationSummary(access.profile.id);

    return NextResponse.json({
      registration,
      ...summary,
    });
  } catch (error) {
    console.error('[OnlineTournamentRegistration POST] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
