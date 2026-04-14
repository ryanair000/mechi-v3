import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { verifyPassword, signToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, password } = body;

    if (!phone || !password) {
      return NextResponse.json({ error: 'Phone and password are required' }, { status: 400 });
    }

    const supabase = createServiceClient();

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('phone', phone)
      .single();

    if (error || !profile) {
      return NextResponse.json({ error: 'Invalid phone number or password' }, { status: 401 });
    }

    const isValid = await verifyPassword(password, profile.password_hash);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid phone number or password' }, { status: 401 });
    }

    const token = signToken({ sub: profile.id, username: profile.username });

    const response = NextResponse.json({
      token,
      user: {
        id: profile.id,
        username: profile.username,
        phone: profile.phone,
        email: profile.email,
        region: profile.region,
        platforms: profile.platforms ?? [],
        game_ids: profile.game_ids ?? {},
        selected_games: profile.selected_games ?? [],
      },
    });

    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    return response;
  } catch (err) {
    console.error('[Login] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
