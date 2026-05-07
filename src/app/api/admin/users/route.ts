import { NextRequest, NextResponse } from 'next/server';
import { getRequestAccessProfile, hasModeratorAccess } from '@/lib/access';
import { createServiceClient } from '@/lib/supabase';

function safeSearch(value: string) {
  return value.replace(/[%,]/g, '').trim();
}

export async function GET(request: NextRequest) {
  const user = await getRequestAccessProfile(request);
  if (!user || !hasModeratorAccess(user) || user.is_banned) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const search = safeSearch(searchParams.get('q') ?? '');
    const role = searchParams.get('role');
    const banned = searchParams.get('banned');
    const limit = Math.min(Math.max(Number(searchParams.get('limit') ?? 50), 1), 100);
    const offset = Math.max(Number(searchParams.get('offset') ?? 0), 0);
    const supabase = createServiceClient();

    let query = supabase
      .from('profiles')
      .select('id, username, phone, email, region, role, is_banned, ban_reason, banned_at, selected_games, created_at')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (search) {
      query = query.or(`username.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`);
    }

    if (role && ['user', 'moderator', 'admin'].includes(role)) {
      query = query.eq('role', role);
    }

    if (banned === 'true') query = query.eq('is_banned', true);
    if (banned === 'false') query = query.eq('is_banned', false);

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }

    return NextResponse.json({ users: data ?? [] });
  } catch (err) {
    console.error('[Admin Users] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
