import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { GAMES, isValidGamePlatform } from '@/lib/config';
import { isTournamentSize } from '@/lib/bracket';
import { makeSlug } from '@/lib/slug';
import { createServiceClient } from '@/lib/supabase';
import { getPlatformForTournament } from '@/lib/tournaments';
import type { GameKey, PlatformKey } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') ?? 'open';
    const game = searchParams.get('game');
    const limit = Math.min(Math.max(Number(searchParams.get('limit') ?? 24), 1), 50);
    const offset = Math.max(Number(searchParams.get('offset') ?? 0), 0);
    const supabase = createServiceClient();

    let query = supabase
      .from('tournaments')
      .select(
        '*, organizer:organizer_id(id, username), winner:winner_id(id, username), player_count:tournament_players(count)'
      )
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    if (game && GAMES[game as GameKey]) {
      query = query.eq('game', game);
    }

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: 'Failed to fetch tournaments' }, { status: 500 });
    }

    return NextResponse.json({ tournaments: data ?? [] });
  } catch (err) {
    console.error('[Tournaments GET] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authUser = getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const title = String(body.title ?? '').trim();
    const game = String(body.game ?? '') as GameKey;
    const requestedPlatform = (body.platform ? String(body.platform) : null) as PlatformKey | null;
    const size = Number(body.size);
    const entryFee = Math.max(0, Math.round(Number(body.entry_fee ?? 0)));
    const region = String(body.region ?? 'Nairobi').trim() || 'Nairobi';
    const rules = String(body.rules ?? '').trim();

    if (title.length < 3) {
      return NextResponse.json({ error: 'Tournament title is too short' }, { status: 400 });
    }

    const gameConfig = GAMES[game];
    if (!gameConfig || gameConfig.mode !== '1v1') {
      return NextResponse.json({ error: 'Pick a supported 1v1 game' }, { status: 400 });
    }

    if (!isTournamentSize(size)) {
      return NextResponse.json({ error: 'Tournament size must be 4, 8, or 16' }, { status: 400 });
    }

    const platform = getPlatformForTournament(game, requestedPlatform);
    if (!platform || !isValidGamePlatform(game, platform)) {
      return NextResponse.json({ error: 'Pick a valid platform for this game' }, { status: 400 });
    }

    const supabase = createServiceClient();
    const slug = makeSlug(title);

    const { data: tournament, error } = await supabase
      .from('tournaments')
      .insert({
        slug,
        title,
        game,
        platform,
        region,
        size,
        entry_fee: entryFee,
        rules: rules || null,
        organizer_id: authUser.sub,
      })
      .select('*')
      .single();

    if (error || !tournament) {
      return NextResponse.json({ error: 'Failed to create tournament' }, { status: 500 });
    }

    await supabase.from('tournament_players').insert({
      tournament_id: tournament.id,
      user_id: authUser.sub,
      payment_status: 'free',
    });

    return NextResponse.json({ tournament }, { status: 201 });
  } catch (err) {
    console.error('[Tournaments POST] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
