import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { hashPassword, profileToAuthUser, signToken } from '@/lib/auth';
import { sendWelcomeEmail } from '@/lib/email';
import {
  DEFAULT_RATING,
  PLATFORMS,
  getConfiguredPlatformForGame,
  getGameIdValue,
  getValidCanonicalGameKey,
  getPlatformsForGameSetup,
  normalizeGameIdKeys,
} from '@/lib/config';
import { isMissingColumnError, isMissingTableError } from '@/lib/db-compat';
import { findInviterByCode, generateUniqueInviteCode, normalizeInviteCode } from '@/lib/invite';
import { getPhoneLookupVariants, isValidPhoneNumber, normalizePhoneNumber } from '@/lib/phone';
import { canSelectGames } from '@/lib/plans';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rateLimit';
import { sendNewRegistrationTelegramNotification } from '@/lib/telegram';
import type { GameKey, PlatformKey } from '@/types';

const STARTER_TRIAL_PLAN = 'pro';
const MIN_PASSWORD_LENGTH = 9;

function getStarterTrialWindow() {
  const startedAt = new Date();
  const expiresAt = new Date(startedAt);
  expiresAt.setMonth(expiresAt.getMonth() + 1);

  return {
    startedAtIso: startedAt.toISOString(),
    expiresAtIso: expiresAt.toISOString(),
  };
}

function normalizeSelectedGames(value: unknown): { games: GameKey[]; hasInvalid: boolean } {
  if (!Array.isArray(value)) {
    return { games: [], hasInvalid: Boolean(value) };
  }

  const games: GameKey[] = [];
  let hasInvalid = false;

  for (const item of value) {
    if (typeof item !== 'string') {
      hasInvalid = true;
      continue;
    }

    const game = getValidCanonicalGameKey(item);
    if (game) {
      if (!games.includes(game)) {
        games.push(game);
      }
    } else {
      hasInvalid = true;
    }
  }

  return { games, hasInvalid };
}

function normalizePlatforms(value: unknown): { platforms: PlatformKey[]; hasInvalid: boolean } {
  if (!Array.isArray(value)) {
    return { platforms: [], hasInvalid: Boolean(value) };
  }

  const platforms: PlatformKey[] = [];
  let hasInvalid = false;

  for (const item of value) {
    if (typeof item === 'string' && item in PLATFORMS) {
      const platform = item as PlatformKey;
      if (!platforms.includes(platform)) {
        platforms.push(platform);
      }
    } else {
      hasInvalid = true;
    }
  }

  return { platforms, hasInvalid };
}

function normalizeGameIds(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return normalizeGameIdKeys(
    Object.fromEntries(
      Object.entries(value)
        .filter((entry): entry is [string, string] => typeof entry[1] === 'string')
        .map(([key, id]) => [key, id.trim()])
    )
  );
}

export async function POST(request: NextRequest) {
  try {
    const rateLimit = checkRateLimit(`register:${getClientIp(request)}`, 5, 60 * 60 * 1000);
    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit.retryAfterSeconds);
    }

    const body = await request.json();
    const {
      username,
      phone,
      email,
      password,
      region,
      platforms,
      game_ids,
      selected_games,
      whatsapp_number,
      whatsapp_notifications,
      invite_code,
    } = body;
    const { games: selectedGames, hasInvalid: hasInvalidSelectedGame } =
      normalizeSelectedGames(selected_games);
    const { platforms: requestedPlatforms, hasInvalid: hasInvalidPlatform } =
      normalizePlatforms(platforms);
    const submittedGameIds = normalizeGameIds(game_ids);
    const finalPlatforms = getPlatformsForGameSetup(
      selectedGames,
      submittedGameIds,
      requestedPlatforms
    );
    const trimmedEmail = String(email ?? '').trim();
    const trimmedRegion = String(region ?? '').trim();
    const normalizedInviteCode = normalizeInviteCode(invite_code);
    const normalizedPhone = normalizePhoneNumber(phone ?? '');
    const normalizedWhatsappNumber = normalizePhoneNumber(
      whatsapp_number || normalizedPhone
    );
    const resolvedWhatsappNumber = whatsapp_notifications ? normalizedWhatsappNumber : null;

    // Validation
    if (!username || !phone || !password || !trimmedEmail || !trimmedRegion) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 });
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json(
        { error: 'Password must be more than 8 characters' },
        { status: 400 }
      );
    }
    if (hasInvalidPlatform) {
      return NextResponse.json({ error: 'Choose valid platforms' }, { status: 400 });
    }
    if (hasInvalidSelectedGame) {
      return NextResponse.json({ error: 'Choose valid games' }, { status: 400 });
    }
    if (selectedGames.length === 0) {
      return NextResponse.json({ error: 'Select at least one game' }, { status: 400 });
    }
    if (!canSelectGames(STARTER_TRIAL_PLAN, selectedGames.length)) {
      return NextResponse.json(
        { error: 'New accounts start with a Pro trial and can save up to 3 games.' },
        { status: 400 }
      );
    }
    if (
      selectedGames.some(
        (game) => !getConfiguredPlatformForGame(game, submittedGameIds, finalPlatforms)
      )
    ) {
      return NextResponse.json({ error: 'Choose a platform for each game' }, { status: 400 });
    }
    if (
      selectedGames.some((game) => {
        const platform = getConfiguredPlatformForGame(game, submittedGameIds, finalPlatforms);
        return !platform || !getGameIdValue(submittedGameIds, game, platform).trim();
      })
    ) {
      return NextResponse.json(
        { error: 'Add the game IDs opponents will need' },
        { status: 400 }
      );
    }
    if (!isValidPhoneNumber(phone)) {
      return NextResponse.json({ error: 'Enter a valid phone number' }, { status: 400 });
    }
    if (whatsapp_notifications && !isValidPhoneNumber(normalizedWhatsappNumber)) {
      return NextResponse.json({ error: 'Enter a valid WhatsApp number' }, { status: 400 });
    }

    const supabase = createServiceClient();
    const phoneVariants = getPhoneLookupVariants(normalizedPhone);

    // Check username uniqueness
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username)
      .single();

    if (existingUser) {
      return NextResponse.json({ error: 'Username already taken' }, { status: 409 });
    }

    // Check phone uniqueness
    const { data: existingPhoneMatches } = await supabase
      .from('profiles')
      .select('id')
      .in('phone', phoneVariants)
      .limit(1);

    if (existingPhoneMatches?.length) {
      return NextResponse.json({ error: 'Phone number already registered' }, { status: 409 });
    }

    const ownInviteCode = await generateUniqueInviteCode(supabase, username);
    const inviter = normalizedInviteCode
      ? await findInviterByCode(supabase, normalizedInviteCode)
      : null;

    const password_hash = await hashPassword(password);
    const trialWindow = getStarterTrialWindow();

    const fullProfileInsert = {
      username,
      phone: normalizedPhone,
      email: trimmedEmail,
      invite_code: ownInviteCode,
      invited_by: inviter?.id ?? null,
      password_hash,
      region: trimmedRegion,
      plan: STARTER_TRIAL_PLAN,
      plan_since: trialWindow.startedAtIso,
      plan_expires_at: trialWindow.expiresAtIso,
      platforms: finalPlatforms,
      game_ids: submittedGameIds,
      selected_games: selectedGames,
      whatsapp_number: resolvedWhatsappNumber,
      whatsapp_notifications: Boolean(whatsapp_notifications),
      rating_efootball: DEFAULT_RATING,
      rating_fc26: DEFAULT_RATING,
      rating_mk11: DEFAULT_RATING,
      rating_nba2k26: DEFAULT_RATING,
      rating_tekken8: DEFAULT_RATING,
      rating_sf6: DEFAULT_RATING,
      wins_efootball: 0,
      wins_fc26: 0,
      wins_mk11: 0,
      wins_nba2k26: 0,
      wins_tekken8: 0,
      wins_sf6: 0,
      losses_efootball: 0,
      losses_fc26: 0,
      losses_mk11: 0,
      losses_nba2k26: 0,
      losses_tekken8: 0,
      losses_sf6: 0,
    };

    const legacyProfileInsert = {
      username,
      phone: normalizedPhone,
      email: trimmedEmail,
      password_hash,
      region: trimmedRegion,
      platforms: finalPlatforms,
      game_ids: submittedGameIds,
      selected_games: selectedGames,
      whatsapp_number: resolvedWhatsappNumber,
    };

    let insertResult = await supabase
      .from('profiles')
      .insert(fullProfileInsert)
      .select()
      .single();

    if (insertResult.error && isMissingColumnError(insertResult.error)) {
      insertResult = await supabase
        .from('profiles')
        .insert(legacyProfileInsert)
        .select()
        .single();
    }

    const profile = insertResult.data;
    const insertError = insertResult.error;

    if (insertError || !profile) {
      console.error('[Register] Insert error:', insertError);
      return NextResponse.json({ error: 'Failed to create account' }, { status: 500 });
    }

    const { error: trialError } = await supabase.from('subscriptions').insert({
      user_id: profile.id,
      plan: STARTER_TRIAL_PLAN,
      billing_cycle: 'monthly',
      amount_kes: 0,
      status: 'active',
      started_at: trialWindow.startedAtIso,
      expires_at: trialWindow.expiresAtIso,
    });

    if (trialError) {
      if (!isMissingTableError(trialError, 'subscriptions')) {
        console.error('[Register] Trial subscription tracking error:', trialError);
      }
    }

    const token = signToken({
      sub: profile.id,
      username: profile.username,
      role: 'user',
      is_banned: false,
    });

    // Send welcome email async
    sendWelcomeEmail({ to: trimmedEmail, username }).catch(console.error);
    sendNewRegistrationTelegramNotification({
      username: profile.username as string,
      email: trimmedEmail,
      phone: normalizedPhone,
      region: trimmedRegion,
      selectedGames,
      plan: STARTER_TRIAL_PLAN,
      inviteCode: normalizedInviteCode,
    }).catch((error) => {
      console.error('[Telegram] Registration notification error:', error);
    });

    const response = NextResponse.json({
      token,
      user: profileToAuthUser(profile as unknown as Record<string, unknown>),
    });

    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return response;
  } catch (err) {
    console.error('[Register] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
