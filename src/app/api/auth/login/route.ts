import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { verifyPassword, signToken } from '@/lib/auth';

function detectIdentifierType(identifier: string): 'email' | 'phone' | 'username' {
  if (identifier.includes('@')) return 'email';
  if (/^[\+\d][\d\s\-\(\)]{6,}$/.test(identifier)) return 'phone';
  return 'username';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { identifier, password } = body;

    if (!identifier || !password) {
      return NextResponse.json({ error: 'Identifier and password are required' }, { status: 400 });
    }

    const supabase = createServiceClient();
    const type = detectIdentifierType(identifier.trim());

    let query = supabase.from('profiles').select('*');

    if (type === 'email') {
      query = query.eq('email', identifier.trim().toLowerCase());
    } else if (type === 'phone') {
      const normalised = identifier.trim().replace(/[\s\-\(\)]/g, '');
      query = query.eq('phone', normalised);
    } else {
      query = query.ilike('username', identifier.trim());
    }

    const { data: profile, error } = await query.single();

    if (error || !profile) {
      return NextResponse.json({ error: 'Account not found. Check your details.' }, { status: 401 });
    }

    const isValid = await verifyPassword(password, profile.password_hash);
    if (!isValid) {
      return NextResponse.json({ error: 'Incorrect password' }, { status: 401 });
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
