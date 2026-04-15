import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const authUser = getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = createServiceClient();

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authUser.sub)
      .single();

    if (error || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Remove password hash from response
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password_hash: _hash, ...safeProfile } = profile;

    return NextResponse.json({ profile: safeProfile });
  } catch (err) {
    console.error('[Profile GET] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const authUser = getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      platforms,
      game_ids,
      selected_games,
      region,
      whatsapp_number,
      whatsapp_notifications,
      avatar_url,
      cover_url,
    } = body;

    const updateData: Record<string, unknown> = {};
    if (platforms !== undefined) updateData.platforms = platforms;
    if (game_ids !== undefined) updateData.game_ids = game_ids;
    if (selected_games !== undefined) updateData.selected_games = selected_games;
    if (region !== undefined) updateData.region = region;
    if (whatsapp_number !== undefined) updateData.whatsapp_number = whatsapp_number;
    if (whatsapp_notifications !== undefined) {
      updateData.whatsapp_notifications = whatsapp_notifications;
    }
    if (avatar_url !== undefined) updateData.avatar_url = avatar_url;
    if (cover_url !== undefined) updateData.cover_url = cover_url;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }

    const supabase = createServiceClient();

    const { data: profile, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', authUser.sub)
      .select()
      .single();

    if (error || !profile) {
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password_hash: _hash2, ...safeProfile2 } = profile;

    return NextResponse.json({ profile: safeProfile2 });
  } catch (err) {
    console.error('[Profile PATCH] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
