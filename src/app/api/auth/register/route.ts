import { after, NextRequest, NextResponse } from 'next/server';
import { applyAuthCookie, createSessionForProfile, hashPassword } from '@/lib/auth';
import { DEFAULT_RATING } from '@/lib/config';
import { isMissingColumnError, isMissingTableError } from '@/lib/db-compat';
import { sendWelcomeEmail } from '@/lib/email';
import { findInviterByCode, generateUniqueInviteCode, normalizeInviteCode } from '@/lib/invite';
import { getPhoneLookupVariants, isValidPhoneNumber, normalizePhoneNumber } from '@/lib/phone';
import { checkPersistentRateLimit, getClientIp, rateLimitResponse } from '@/lib/rateLimit';
import { awardAffiliateInviteSignup, ensureChezahubCustomer } from '@/lib/rewards';
import { createServiceClient } from '@/lib/supabase';
import { sendNewRegistrationTelegramNotification } from '@/lib/telegram';
import { isUsernameTaken } from '@/lib/username-availability';
import { validateUsername } from '@/lib/username';
import type { CountryKey } from '@/types';

const STARTER_TRIAL_PLAN = 'pro';
const DEFAULT_COUNTRY: CountryKey = 'kenya';
const DEFAULT_REGION = 'Other';
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

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(request: NextRequest) {
  try {
    const rateLimit = await checkPersistentRateLimit(
      `register:${getClientIp(request)}`,
      5,
      60 * 60 * 1000
    );
    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit.retryAfterSeconds);
    }

    const body = (await request.json()) as Record<string, unknown>;
    const { username, error: usernameError } = validateUsername(body.username);
    const email = String(body.email ?? '').trim().toLowerCase();
    const password = String(body.password ?? '');
    const rawPhone = String(body.phone ?? '').trim();
    const normalizedInviteCode = normalizeInviteCode(
      typeof body.invite_code === 'string' ? body.invite_code : null
    );

    if (usernameError || !rawPhone || !email || !password) {
      return NextResponse.json({ error: usernameError ?? 'Missing required fields' }, { status: 400 });
    }

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 });
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json(
        { error: 'Password must be more than 8 characters' },
        { status: 400 }
      );
    }

    if (!isValidPhoneNumber(rawPhone, DEFAULT_COUNTRY)) {
      return NextResponse.json({ error: 'Enter a valid phone number' }, { status: 400 });
    }

    if (await isUsernameTaken(username)) {
      return NextResponse.json({ error: 'Username already taken' }, { status: 409 });
    }

    const normalizedPhone = normalizePhoneNumber(rawPhone, DEFAULT_COUNTRY);
    const supabase = createServiceClient();
    const phoneVariants = getPhoneLookupVariants(normalizedPhone, DEFAULT_COUNTRY);
    const { data: existingPhoneMatches, error: phoneLookupError } = await supabase
      .from('profiles')
      .select('id')
      .in('phone', phoneVariants)
      .limit(1);

    if (phoneLookupError) {
      console.error('[Register] Phone lookup error:', phoneLookupError);
      return NextResponse.json({ error: 'Could not verify phone number' }, { status: 500 });
    }

    if (existingPhoneMatches?.length) {
      return NextResponse.json({ error: 'Phone number already registered' }, { status: 409 });
    }

    const { data: existingEmailMatches, error: emailLookupError } = await supabase
      .from('profiles')
      .select('id')
      .ilike('email', email)
      .limit(1);

    if (emailLookupError) {
      console.error('[Register] Email lookup error:', emailLookupError);
      return NextResponse.json({ error: 'Could not verify email address' }, { status: 500 });
    }

    if (existingEmailMatches?.length) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
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
      email,
      invite_code: ownInviteCode,
      invited_by: inviter?.id ?? null,
      password_hash,
      country: DEFAULT_COUNTRY,
      region: DEFAULT_REGION,
      plan: STARTER_TRIAL_PLAN,
      plan_since: trialWindow.startedAtIso,
      plan_expires_at: trialWindow.expiresAtIso,
      platforms: [],
      game_ids: {},
      selected_games: [],
      whatsapp_number: null,
      whatsapp_notifications: false,
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
      email,
      password_hash,
      region: DEFAULT_REGION,
      platforms: [],
      game_ids: {},
      selected_games: [],
      whatsapp_number: null,
    };

    let insertResult = await supabase.from('profiles').insert(fullProfileInsert).select().single();

    if (insertResult.error && isMissingColumnError(insertResult.error)) {
      insertResult = await supabase.from('profiles').insert(legacyProfileInsert).select().single();
    }

    if (insertResult.error || !insertResult.data) {
      console.error('[Register] Insert error:', insertResult.error);
      const isUniqueConflict = insertResult.error?.code === '23505';
      return NextResponse.json(
        { error: isUniqueConflict ? 'Account details already registered' : 'Failed to create account' },
        { status: isUniqueConflict ? 409 : 500 }
      );
    }

    const profile = insertResult.data;
    const { error: trialError } = await supabase.from('subscriptions').insert({
      user_id: profile.id,
      plan: STARTER_TRIAL_PLAN,
      billing_cycle: 'monthly',
      amount_kes: 0,
      status: 'active',
      started_at: trialWindow.startedAtIso,
      expires_at: trialWindow.expiresAtIso,
    });

    if (trialError && !isMissingTableError(trialError, 'subscriptions')) {
      console.error('[Register] Trial subscription tracking error:', trialError);
    }

    if (inviter?.id) {
      try {
        await awardAffiliateInviteSignup(supabase, {
          inviterUserId: inviter.id,
          inviteeUserId: String(profile.id),
          inviteCode: normalizedInviteCode,
        });
      } catch (affiliateError) {
        console.warn('[Register] Affiliate invite reward error:', affiliateError);
      }
    }

    await sendWelcomeEmail({ to: email, username });
    after(async () => {
      try {
        await sendNewRegistrationTelegramNotification({
          username: profile.username as string,
          email,
          phone: normalizedPhone,
          location: 'Kenya / Other',
          selectedGames: [],
          plan: STARTER_TRIAL_PLAN,
          inviteCode: normalizedInviteCode,
        });
      } catch (error) {
        console.error('[Telegram] Registration notification error:', error);
      }
    });

    if (!profile.chezahub_user_id) {
      try {
        const ensuredCustomer = await ensureChezahubCustomer({
          mechiUserId: String(profile.id),
          username,
          email,
          phone: normalizedPhone,
        });
        const linkedAt = new Date().toISOString();

        await supabase
          .from('profiles')
          .update({
            chezahub_user_id: ensuredCustomer.chezahubUserId,
            chezahub_linked_at: linkedAt,
          })
          .eq('id', profile.id);

        Object.assign(profile, {
          chezahub_user_id: ensuredCustomer.chezahubUserId,
          chezahub_linked_at: linkedAt,
        });
      } catch (chezahubError) {
        console.warn('[Register] ChezaHub auto-provision failed:', chezahubError);
      }
    }

    const { token, user } = createSessionForProfile(profile as unknown as Record<string, unknown>);
    const response = NextResponse.json({ token, user });
    applyAuthCookie(response, token);

    return response;
  } catch (err) {
    console.error('[Register] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
