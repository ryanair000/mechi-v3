import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const authUser = getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceClient();
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, username, phone, email, region, platforms, game_ids, selected_games, rating_efootball, rating_fc26, rating_mk11, rating_nba2k26, rating_tekken8, rating_sf6, wins_efootball, wins_fc26, wins_mk11, wins_nba2k26, wins_tekken8, wins_sf6, losses_efootball, losses_fc26, losses_mk11, losses_nba2k26, losses_tekken8, losses_sf6, created_at')
    .eq('id', authUser.sub)
    .single();

  if (error || !profile) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json({ user: profile });
}
