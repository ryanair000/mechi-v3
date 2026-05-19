import { after, NextRequest, NextResponse } from 'next/server';
import { getRequestAccessProfile, requireActiveAccessProfile } from '@/lib/access';
import {
  getConfiguredPlatformForGame,
  getGameIdKey,
  getGameIdValue,
  getGamePlatformKey,
  normalizeGameIdKeys,
  normalizeSelectedGameKeys,
} from '@/lib/config';
import { sendWeekendCupRegistrationReceivedEmail } from '@/lib/email';
import {
  getNormalisedKenyanMobilePhone,
  initializeTournamentPayment,
  isPaystackConfigured,
  verifyTournamentPayment,
} from '@/lib/paystack';
import { checkPersistentRateLimit, getClientIp, rateLimitResponse } from '@/lib/rateLimit';
import { makePaymentReference } from '@/lib/slug';
import { createServiceClient } from '@/lib/supabase';
import { sendOnlineTournamentRegistrationTelegramNotification } from '@/lib/telegram';
import { getObservabilitySettings } from '@/lib/observability-settings';
import type { GameKey, PlatformKey } from '@/types';
import type { OnlineTournamentPaymentTier } from '@/lib/online-tournament';
import {
  WEEKEND_CUP_ACTIVE_PAYMENT_TIER,
  WEEKEND_CUP_ENTRY_PRICING,
  WEEKEND_CUP_GAME_BY_KEY,
  WEEKEND_CUP_REGISTRATION_PATH,
  WEEKEND_CUP_REGISTRATION_DISABLED_MESSAGE,
  WEEKEND_CUP_REGISTRATION_ENABLED,
  WEEKEND_CUP_SLUG,
  WEEKEND_CUP_TITLE,
  cleanWeekendCupHandle,
  cleanWeekendCupText,
  getWeekendCupPaymentTierAmount,
  getWeekendCupPaymentTierDisplay,
  getWeekendCupWindowState,
  isWeekendCupGame,
  isWeekendCupRegisterableGame,
  isWeekendCupRegistrationOpen,
} from '@/lib/weekend-cup';
import {
  buildWeekendCupRegisterPayload,
  getWeekendCupCapacityErrorMessage,
  getWeekendCupRegistrationPrefill,
  getWeekendCupRegistrationSummary,
  markWeekendCupPaymentPaidByReference,
} from '@/lib/weekend-cup-server';
import { APP_URL } from '@/lib/urls';

function getProfileGameId(params: {
  game: keyof typeof WEEKEND_CUP_GAME_BY_KEY;
  gameIds: Record<string, string>;
  platforms: PlatformKey[];
}) {
  const platform = getConfiguredPlatformForGame(params.game, params.gameIds, params.platforms);
  if (!platform) return '';

  return getGameIdValue(params.gameIds, params.game, platform).trim();
}

export async function GET(request: NextRequest) {
  if (!WEEKEND_CUP_REGISTRATION_ENABLED || !isWeekendCupRegistrationOpen()) {
    return NextResponse.json(
      { error: WEEKEND_CUP_REGISTRATION_DISABLED_MESSAGE },
      { status: 503 }
    );
  }

  try {
    const accessProfile = await getRequestAccessProfile(request);
    const summary = await getWeekendCupRegistrationSummary({
      userId: accessProfile?.id ?? null,
    });

    return NextResponse.json(summary);
  } catch (error) {
    console.error('[WeekendCupRegistration GET] Error:', error);
    return NextResponse.json({ error: 'Could not load Weekend Cup registration state' }, { status: 500 });
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
    const body = (await request.json()) as Record<string, unknown>;
    const action = cleanWeekendCupText(body.action, 40);
    const supabase = createServiceClient();

    if (action === 'verify_payment') {
      const reference = cleanWeekendCupText(body.reference, 140);
      if (!reference) {
        return NextResponse.json({ error: 'Payment reference is required' }, { status: 400 });
      }

      const { data: registrationRaw, error: registrationError } = await supabase
        .from('online_tournament_registrations')
        .select('id, user_id, entry_fee_kes, payment_status')
        .eq('event_slug', WEEKEND_CUP_SLUG)
        .eq('user_id', access.profile.id)
        .eq('payment_reference', reference)
        .maybeSingle();

      const paymentRegistration = registrationRaw as
        | {
            id: string;
            user_id: string;
            entry_fee_kes: number | null;
            payment_status: string;
          }
        | null;

      if (registrationError || !paymentRegistration) {
        return NextResponse.json({ error: 'Payment record not found' }, { status: 404 });
      }

      if (paymentRegistration.payment_status !== 'paid') {
        const verified = await verifyTournamentPayment({
          reference,
          expectedAmountKes: paymentRegistration.entry_fee_kes ?? 0,
        });

        if (!verified.success) {
          return NextResponse.json(
            { error: verified.error ?? 'Payment is not complete yet' },
            { status: 400 }
          );
        }

        const confirmed = await markWeekendCupPaymentPaidByReference(supabase, reference);
        if (!confirmed.success) {
          return NextResponse.json(
            { error: confirmed.error ?? 'Could not confirm Weekend Cup payment' },
            { status: 500 }
          );
        }
      }

      const summary = await getWeekendCupRegistrationSummary({
        supabase,
        userId: access.profile.id,
      });

      return NextResponse.json({ status: 'paid', ...summary });
    }

    const gameInput = cleanWeekendCupText(body.game, 20);

    if (!isWeekendCupGame(gameInput)) {
      return NextResponse.json({ error: 'Pick a valid Weekend Cup game' }, { status: 400 });
    }

    if (!isWeekendCupRegisterableGame(gameInput)) {
      return NextResponse.json(
        { error: 'Mystery game registration opens after the vote locks.' },
        { status: 400 }
      );
    }

    const game = gameInput;
    const gameConfig = WEEKEND_CUP_GAME_BY_KEY[game];
    const windowState = getWeekendCupWindowState(gameConfig);
    if (!windowState.isRegistrationOpen) {
      return NextResponse.json(
        { error: `${gameConfig.label} registration closed at ${gameConfig.timeLabel}` },
        { status: 400 }
      );
    }

    if (!isPaystackConfigured() && process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'Payment provider is not configured' },
        { status: 502 }
      );
    }

    const createRateLimit = await checkPersistentRateLimit(
      `weekend-cup-register:${access.profile.id}:${game}:${getClientIp(request)}`,
      5,
      30 * 60 * 1000
    );
    if (!createRateLimit.allowed) {
      return rateLimitResponse(createRateLimit.retryAfterSeconds);
    }

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
    const playmechiPrefill = await getWeekendCupRegistrationPrefill({
      supabase,
      userId: access.profile.id,
    });
    const sourcePrefill = playmechiPrefill[game] ?? null;

    const { data: existingRegistrationRaw } = await supabase
      .from('online_tournament_registrations')
      .select(
        'id, payment_status, payment_tier, entry_fee_kes, payment_reference, payment_confirmed_at, payment_confirmed_by, payment_note, check_in_status, created_at, updated_at'
      )
      .eq('event_slug', WEEKEND_CUP_SLUG)
      .eq('user_id', access.profile.id)
      .eq('game', game)
      .maybeSingle();

    const existingRegistration = existingRegistrationRaw as
      | {
          id: string;
          payment_status: string;
          payment_tier: OnlineTournamentPaymentTier | null;
          entry_fee_kes: number | null;
          payment_reference: string | null;
          payment_confirmed_at: string | null;
          payment_confirmed_by: string | null;
          payment_note: string | null;
          check_in_status: string;
          created_at: string;
          updated_at: string;
        }
      | null;

    const summaryBefore = await getWeekendCupRegistrationSummary({
      supabase,
      userId: access.profile.id,
    });
    const gameSummaryBefore = summaryBefore.games[game];
    if (!existingRegistration && gameSummaryBefore.confirmed >= gameConfig.slots) {
      return NextResponse.json({ error: `${gameConfig.label} confirmed slots are full` }, { status: 400 });
    }

    const profileGameId = getProfileGameId({
      game,
      gameIds: profileGameIds,
      platforms: profilePlatforms,
    });
    const inGameUsername =
      cleanWeekendCupText(body.in_game_username, 80) ||
      cleanWeekendCupText(sourcePrefill?.in_game_username, 80) ||
      profileGameId;
    const instagramUsername =
      cleanWeekendCupHandle(body.instagram_username, 80) ||
      cleanWeekendCupHandle(sourcePrefill?.instagram_username, 80);
    const youtubeName =
      cleanWeekendCupText(body.youtube_name, 100) ||
      cleanWeekendCupText(sourcePrefill?.youtube_name, 100);
    const followedInstagram = Boolean(body.followed_instagram ?? sourcePrefill?.followed_instagram ?? true);
    const subscribedYoutube = Boolean(body.subscribed_youtube ?? sourcePrefill?.subscribed_youtube ?? true);
    const availableAtMatchTime = Boolean(
      body.available_at_match_time ?? body.available_at_8pm ?? sourcePrefill?.available_at_8pm ?? true
    );
    const acceptedRules = true;

    if (inGameUsername.length < 2) {
      return NextResponse.json({ error: 'Add your in-game username or gamer tag' }, { status: 400 });
    }

    if (!availableAtMatchTime) {
      return NextResponse.json(
        { error: `Confirm that you are free for ${gameConfig.dateLabel} at ${gameConfig.timeLabel}` },
        { status: 400 }
      );
    }

    if (followedInstagram && instagramUsername.length < 2) {
      return NextResponse.json(
        { error: 'Add the Instagram username you used to follow PlayMechi' },
        { status: 400 }
      );
    }

    if (subscribedYoutube && youtubeName.length < 2) {
      return NextResponse.json(
        { error: 'Add the YouTube name or email you used to subscribe' },
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
    const now = new Date().toISOString();
    const paymentTier = existingRegistration?.payment_status === 'paid'
      ? (existingRegistration.payment_tier ?? WEEKEND_CUP_ACTIVE_PAYMENT_TIER)
      : WEEKEND_CUP_ACTIVE_PAYMENT_TIER;
    const entryFeeKes = existingRegistration?.payment_status === 'paid' && existingRegistration.entry_fee_kes !== null
      ? existingRegistration.entry_fee_kes
      : getWeekendCupPaymentTierAmount(paymentTier, game);
    const paymentReference = existingRegistration?.payment_status === 'paid' && existingRegistration.payment_reference
      ? existingRegistration.payment_reference
      : makePaymentReference('mechi_weekendcup');
    const paymentStatus = existingRegistration?.payment_status === 'paid' ? 'paid' : 'pending_payment';
    const { data: registrationRaw, error: registrationError } = await supabase
      .from('online_tournament_registrations')
      .upsert(
        {
          event_slug: WEEKEND_CUP_SLUG,
          user_id: access.profile.id,
          game,
          in_game_username: inGameUsername,
          phone: profile.phone ?? null,
          whatsapp_number: sourcePrefill?.whatsapp_number ?? profile.whatsapp_number ?? profile.phone ?? null,
          email: profile.email ?? null,
          instagram_username: instagramUsername || null,
          youtube_name: youtubeName || null,
          followed_instagram: followedInstagram,
          subscribed_youtube: subscribedYoutube,
          available_at_8pm: availableAtMatchTime,
          accepted_rules: acceptedRules,
          reward_eligible: false,
          eligibility_status: nextEligibilityStatus,
          game_uid: sourcePrefill?.game_uid ?? null,
          device_model: sourcePrefill?.device_model ?? null,
          device_serial_last6: sourcePrefill?.device_serial_last6 ?? null,
          entry_fee_kes: entryFeeKes,
          payment_tier: paymentTier,
          payment_status: paymentStatus,
          payment_reference: paymentReference,
          payment_confirmed_at: existingRegistration?.payment_confirmed_at ?? null,
          payment_confirmed_by: existingRegistration?.payment_confirmed_by ?? null,
          payment_note:
            existingRegistration?.payment_status === 'paid'
              ? existingRegistration.payment_note
              : 'Waiting for Paystack confirmation. Slot is not locked yet.',
          updated_at: now,
        },
        { onConflict: 'event_slug,user_id,game' }
      )
      .select(
        'id, user_id, game, in_game_username, instagram_username, youtube_name, followed_instagram, subscribed_youtube, reward_eligible, eligibility_status, check_in_status, entry_fee_kes, payment_tier, payment_status, payment_reference, payment_confirmed_at, payment_note, game_uid, whatsapp_number, device_model, device_serial_last6, checked_in_at, created_at, updated_at'
      )
      .single();

    if (registrationError || !registrationRaw) {
      const capacityErrorMessage = getWeekendCupCapacityErrorMessage(game, registrationError);
      if (capacityErrorMessage) {
        return NextResponse.json({ error: capacityErrorMessage }, { status: 400 });
      }

      return NextResponse.json({ error: 'Could not save Weekend Cup registration' }, { status: 500 });
    }

    const registration = buildWeekendCupRegisterPayload({
      row: registrationRaw as Parameters<typeof buildWeekendCupRegisterPayload>[0]['row'],
    });
    const summary = await getWeekendCupRegistrationSummary({
      supabase,
      userId: access.profile.id,
    });
    const observabilitySettings = await getObservabilitySettings();
    const gameSummary = summary.games[game];
    let authorizationUrl: string | null = null;

    if (registration.payment_status !== 'paid') {
      const email = profile.email || `${profile.username}@mechi.club`;
      const callbackUrl = `${APP_URL}/weekendcup/payment/complete`;
      const kenyanMobilePhone = getNormalisedKenyanMobilePhone(
        profile.whatsapp_number ?? profile.phone ?? ''
      );
      const initialized = await initializeTournamentPayment({
        amountKes: entryFeeKes,
        email,
        reference: paymentReference,
        callbackUrl,
        metadata: {
          app: 'mechi',
          source: 'mechi',
          type: 'weekend_cup_registration',
          event_slug: WEEKEND_CUP_SLUG,
          registration_id: registration.id,
          game,
          user_id: access.profile.id,
          payment_tier: paymentTier,
          phone: kenyanMobilePhone,
          mpesa_requires_kenyan_phone: !kenyanMobilePhone,
        },
      });

      if (!initialized.success || !initialized.authorizationUrl) {
        await supabase
          .from('online_tournament_registrations')
          .update({
            payment_status: 'failed',
            payment_note: initialized.error ?? 'Could not start Paystack checkout.',
            updated_at: new Date().toISOString(),
          })
          .eq('id', registration.id);

        return NextResponse.json(
          { error: initialized.error ?? 'Could not start payment' },
          { status: 502 }
        );
      }

      authorizationUrl = initialized.authorizationUrl;
    }

    after(async () => {
      try {
        const paymentEvent =
          registration.payment_status === 'paid'
            ? existingRegistration?.payment_status === 'paid'
              ? 'already_paid'
              : 'confirmed'
            : 'pending';
        await sendOnlineTournamentRegistrationTelegramNotification({
          eventTitle: WEEKEND_CUP_TITLE,
          username: profile.username,
          gameLabel: gameConfig.label,
          inGameUsername,
          email: profile.email ?? null,
          phone: profile.phone ?? null,
          whatsappNumber: profile.whatsapp_number ?? profile.phone ?? null,
          instagramUsername,
          youtubeName,
          followedInstagram,
          subscribedYoutube,
          eligibilityStatus: nextEligibilityStatus,
          registered: gameSummary?.registered ?? 0,
          confirmed: gameSummary?.confirmed ?? 0,
          pendingPayment: gameSummary?.pendingPayment ?? 0,
          slots: gameSummary?.slots ?? gameConfig.slots,
          spotsLeft: gameSummary?.spotsLeft ?? Math.max(0, gameConfig.slots - 1),
          paymentStatus: registration.payment_status,
          paymentEvent,
          paymentReference,
          paymentLabel: getWeekendCupPaymentTierDisplay(paymentTier, game),
          entryFeeKes,
          checkedIn: gameSummary?.checkedIn ?? 0,
          checkInCap: gameSummary?.checkInCap ?? gameConfig.checkInCap,
          checkInSpotsLeft: gameSummary?.checkInSpotsLeft ?? gameConfig.checkInCap,
          registrationId: registration.id,
        });
      } catch (error) {
        console.error('[WeekendCupRegistration Telegram] Notification error:', error);
      }

      const registrationEmailRecipient = (profile.email ?? '').trim();
      if (registrationEmailRecipient) {
        try {
          await sendWeekendCupRegistrationReceivedEmail({
            to: registrationEmailRecipient,
            username: profile.username,
            eventTitle: WEEKEND_CUP_TITLE,
            gameLabel: gameConfig.label,
            dateLabel: gameConfig.dateLabel,
            timeLabel: gameConfig.timeLabel,
            inGameUsername,
            paymentLabel: getWeekendCupPaymentTierDisplay(paymentTier, game),
            paymentReference,
            checkoutUrl: authorizationUrl,
            registrationUrl: `${APP_URL}${WEEKEND_CUP_REGISTRATION_PATH}?game=${encodeURIComponent(game)}`,
          });
        } catch (error) {
          console.error('[WeekendCupRegistration Email] Registration received error:', error);
        }
      }
    });

    return NextResponse.json({
      registration,
      status: authorizationUrl ? 'payment_pending' : 'paid',
      authorization_url: authorizationUrl,
      reference: paymentReference,
      entryFeeKes,
      paymentTier,
      paymentLabel: getWeekendCupPaymentTierDisplay(paymentTier, game),
      ...summary,
      paymentCopy: {
        pricingLine: WEEKEND_CUP_ENTRY_PRICING.pricingLineLabel,
        earlyBirdPolicy: WEEKEND_CUP_ENTRY_PRICING.earlyBirdPolicyLabel,
        mpesaKenyanPhoneOnly: observabilitySettings.payment_support_notice,
        registerUrl: `${APP_URL}${WEEKEND_CUP_REGISTRATION_PATH}`,
      },
    });
  } catch (error) {
    console.error('[WeekendCupRegistration POST] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
