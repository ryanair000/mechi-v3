import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase';
import { GAMES } from '@/lib/config';
import type { GameKey } from '@/types';

export async function POST(request: NextRequest) {
  const authUser = getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { game } = body;

    if (!game || !GAMES[game as GameKey]) {
      return NextResponse.json({ error: 'Invalid game' }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Get user profile for region and rating
    const { data: profileRaw, error: profileError } = await supabase
      .from('profiles')
      .select('id, region, rating_efootball, rating_fc26, rating_mk11, rating_nba2k26, rating_tekken8, rating_sf6')
      .eq('id', authUser.sub)
      .single();

    if (profileError || !profileRaw) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const profile = profileRaw as Record<string, unknown>;
    const ratingKey = `rating_${game}`;
    const rating = (profile[ratingKey] as number) ?? 1000;

    // Check if already in queue or has active match
    const { data: existingQueue } = await supabase
      .from('queue')
      .select('id, status')
      .eq('user_id', authUser.sub)
      .eq('status', 'waiting')
      .single();

    if (existingQueue) {
      return NextResponse.json({ error: 'Already in queue' }, { status: 409 });
    }

    // Check for active match
    const { data: activeMatch } = await supabase
      .from('matches')
      .select('id')
      .or(`player1_id.eq.${authUser.sub},player2_id.eq.${authUser.sub}`)
      .eq('status', 'pending')
      .single();

    if (activeMatch) {
      return NextResponse.json(
        { error: 'You have an active match', matchId: activeMatch.id },
        { status: 409 }
      );
    }

    const { data: entry, error: insertError } = await supabase
      .from('queue')
      .insert({
        user_id: authUser.sub,
        game,
        region: profile.region as string,
        rating,
        status: 'waiting',
      })
      .select()
      .single();

    if (insertError || !entry) {
      console.error('[Queue Join] Insert error:', insertError);
      return NextResponse.json({ error: 'Failed to join queue' }, { status: 500 });
    }

    return NextResponse.json({ entry });
  } catch (err) {
    console.error('[Queue Join] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
