import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { hashPassword, signToken } from '@/lib/auth';
import { sendWelcomeEmail } from '@/lib/email';
import { DEFAULT_RATING } from '@/lib/config';
import { getPhoneLookupVariants, isValidPhoneNumber, normalizePhoneNumber } from '@/lib/phone';

export async function POST(request: NextRequest) {
  try {
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
    } = body;
    const normalizedPhone = normalizePhoneNumber(phone ?? '');
    const normalizedWhatsappNumber = normalizePhoneNumber(
      whatsapp_number || normalizedPhone
    );

    // Validation
    if (!username || !phone || !password || !region) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
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
    if (!isValidPhoneNumber(phone)) {
      return NextResponse.json({ error: 'Enter a valid phone number' }, { status: 400 });
    }
    if (whatsapp_notifications && !isValidPhoneNumber(normalizedWhatsappNumber)) {
      return NextResponse.json({ error: 'Enter a valid WhatsApp number' }, { status: 400 });
    }

    const supabase = createServiceClient();
    const phoneVariants = getPhoneLookupVariants(phone);

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

    const password_hash = await hashPassword(password);

    const { data: profile, error: insertError } = await supabase
      .from('profiles')
      .insert({
        username,
        phone: normalizedPhone,
        email: email || null,
        whatsapp_number: normalizedWhatsappNumber || null,
        whatsapp_notifications: whatsapp_notifications ?? false,
        password_hash,
        region,
        platforms,
        game_ids: game_ids ?? {},
        selected_games: selected_games ?? [],
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

    const token = signToken({ sub: profile.id, username: profile.username });

    // Send welcome email async
    if (email) {
      sendWelcomeEmail({ to: email, username }).catch(console.error);
    }

    const response = NextResponse.json({
      token,
      user: {
        id: profile.id,
        username: profile.username,
        phone: profile.phone,
        email: profile.email,
        whatsapp_number: profile.whatsapp_number ?? null,
        whatsapp_notifications: profile.whatsapp_notifications ?? false,
        region: profile.region,
        platforms: profile.platforms,
        game_ids: profile.game_ids,
        selected_games: profile.selected_games,
        xp: profile.xp ?? 0,
        level: profile.level ?? 1,
        mp: profile.mp ?? 0,
        win_streak: profile.win_streak ?? 0,
        max_win_streak: profile.max_win_streak ?? 0,
      },
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
