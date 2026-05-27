import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { applyAuthCookie, createSessionForProfile, hashPassword } from '@/lib/auth';
import { DEFAULT_RATING } from '@/lib/config';
import { generateUniqueInviteCode } from '@/lib/invite';
import { createServiceClient } from '@/lib/supabase';

function cleanUsernameSeed(value: unknown) {
  const cleaned = String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/@.*$/, '')
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 24);

  return cleaned.length >= 3 ? cleaned : `gamer_${crypto.randomUUID().slice(0, 6)}`;
}

async function getUniqueUsername(seed: string) {
  const supabase = createServiceClient();
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const username = attempt === 0 ? seed : `${seed}_${crypto.randomUUID().slice(0, 5)}`;
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .ilike('username', username)
      .limit(1);

    if (error) {
      throw error;
    }

    if (!data?.length) {
      return username;
    }
  }

  return `gamer_${crypto.randomUUID().replace(/-/g, '').slice(0, 10)}`;
}

function getSocialProvider(metadata: Record<string, unknown>) {
  const provider = String(metadata.provider ?? metadata.iss ?? 'social').toLowerCase();
  if (provider.includes('facebook')) return 'facebook';
  if (provider.includes('google')) return 'google';
  return 'social';
}

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
    if (!supabaseUrl || !anonKey) {
      return NextResponse.json({ error: 'Social login is not configured yet' }, { status: 503 });
    }

    const body = (await request.json()) as Record<string, unknown>;
    const accessToken = String(body.access_token ?? '').trim();
    if (!accessToken) {
      return NextResponse.json({ error: 'Social login token is required' }, { status: 400 });
    }

    const authClient = createClient(supabaseUrl, anonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
    const { data, error } = await authClient.auth.getUser(accessToken);
    if (error || !data.user) {
      return NextResponse.json({ error: 'Social login could not be verified' }, { status: 401 });
    }

    const socialUser = data.user;
    const email = (socialUser.email ?? '').trim().toLowerCase();
    if (!email) {
      return NextResponse.json(
        { error: 'Social login needs an email address on the provider account' },
        { status: 400 }
      );
    }

    const service = createServiceClient();
    const { data: existingProfiles, error: lookupError } = await service
      .from('profiles')
      .select('*')
      .ilike('email', email)
      .limit(1);

    if (lookupError) {
      return NextResponse.json({ error: 'Could not load Mechi account' }, { status: 500 });
    }

    let profile = existingProfiles?.[0] as Record<string, unknown> | undefined;
    if (!profile) {
      const metadata = (socialUser.user_metadata ?? {}) as Record<string, unknown>;
      const seed = cleanUsernameSeed(metadata.user_name ?? metadata.name ?? email);
      const username = await getUniqueUsername(seed);
      const syntheticPhone = `oauth:${getSocialProvider(metadata)}:${socialUser.id}`;
      const ownInviteCode = await generateUniqueInviteCode(service, username);
      const passwordHash = await hashPassword(crypto.randomUUID());

      const { data: created, error: createError } = await service
        .from('profiles')
        .insert({
          username,
          phone: syntheticPhone,
          email,
          invite_code: ownInviteCode,
          password_hash: passwordHash,
          country: 'kenya',
          region: 'Nairobi',
          platforms: ['mobile'],
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
        })
        .select()
        .single();

      if (createError || !created) {
        console.error('[SocialAuthSession] Profile create error:', createError);
        return NextResponse.json({ error: 'Could not create Mechi account' }, { status: 500 });
      }

      profile = created as Record<string, unknown>;
    }

    if (profile.is_banned) {
      return NextResponse.json({ error: 'Account suspended. Contact support.' }, { status: 403 });
    }

    const { token, user } = createSessionForProfile(profile);
    const response = NextResponse.json({ token, user });
    applyAuthCookie(response, token);
    return response;
  } catch (error) {
    console.error('[SocialAuthSession] Error:', error);
    return NextResponse.json({ error: 'Could not complete social login' }, { status: 500 });
  }
}
