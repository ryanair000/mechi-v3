import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { hashPassword, profileToAuthUser, signToken } from '@/lib/auth';
import { sendWelcomeEmail } from '@/lib/email';
import { DEFAULT_RATING } from '@/lib/config';
import { findInviterByCode, generateUniqueInviteCode, normalizeInviteCode } from '@/lib/invite';
import { getPhoneLookupVariants, isValidPhoneNumber, normalizePhoneNumber } from '@/lib/phone';
import { canSelectGames } from '@/lib/plans';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rateLimit';

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
    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }
    if (!platforms || platforms.length === 0) {
      return NextResponse.json({ error: 'Select at least one platform' }, { status: 400 });
    }
    if (!selected_games || selected_games.length === 0) {
      return NextResponse.json({ error: 'Select at least one game' }, { status: 400 });
    }
    if (!canSelectGames('free', selected_games.length)) {
      return NextResponse.json(
        { error: 'Free accounts start with 1 selected game. Upgrade later to unlock 3.' },
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

    const { data: profile, error: insertError } = await supabase
      .from('profiles')
      .insert({
        username,
        phone: normalizedPhone,
        email: trimmedEmail,
        invite_code: ownInviteCode,
        invited_by: inviter?.id ?? null,
        password_hash,
        region: trimmedRegion,
        platforms,
        game_ids: game_ids ?? {},
        selected_games: selected_games ?? [],
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
      })
      .select()
      .single();

    if (insertError || !profile) {
      console.error('[Register] Insert error:', insertError);
      return NextResponse.json({ error: 'Failed to create account' }, { status: 500 });
    }

    const token = signToken({
      sub: profile.id,
      username: profile.username,
      role: 'user',
      is_banned: false,
    });

    // Send welcome email async
    sendWelcomeEmail({ to: trimmedEmail, username }).catch(console.error);

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
