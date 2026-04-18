import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { GAMES, getCanonicalGameKey, isValidGamePlatform } from '@/lib/config';
import { isTournamentSize } from '@/lib/bracket';
import { notifyGameAudienceAboutTournament } from '@/lib/game-audience';
import { resolveProfileLocation, validateLocationSelection } from '@/lib/location';
import { getPlan } from '@/lib/plans';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rateLimit';
import { makeSlug } from '@/lib/slug';
import { maybeExpireProfilePlan } from '@/lib/subscription';
import { createServiceClient } from '@/lib/supabase';
import { CONFIRMED_PAYMENT_STATUSES, getPlatformForTournament } from '@/lib/tournaments';
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
      .select('*, organizer:organizer_id(id, username), winner:winner_id(id, username)')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    if (game && GAMES[game as GameKey]) {
      query = query.eq('game', getCanonicalGameKey(game as GameKey));
    }

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: 'Failed to fetch tournaments' }, { status: 500 });
    }

    const tournaments = (data ?? []) as Array<Record<string, unknown> & { id: string }>;
    if (!tournaments.length) {
      return NextResponse.json({ tournaments: [] });
    }

    const tournamentIds = tournaments.map((tournament) => tournament.id);
    const { data: players, error: playersError } = await supabase
      .from('tournament_players')
      .select('tournament_id')
      .in('tournament_id', tournamentIds)
      .in('payment_status', [...CONFIRMED_PAYMENT_STATUSES]);

    if (playersError) {
      return NextResponse.json({ error: 'Failed to fetch tournaments' }, { status: 500 });
    }

    const playerCounts = (players ?? []).reduce<Record<string, number>>((counts, player) => {
      const tournamentId = player.tournament_id as string | undefined;
      if (!tournamentId) return counts;
      counts[tournamentId] = (counts[tournamentId] ?? 0) + 1;
      return counts;
    }, {});

    return NextResponse.json({
      tournaments: tournaments.map((tournament) => ({
        ...tournament,
        player_count: playerCounts[tournament.id] ?? 0,
      })),
    });
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
    const requestedGame = String(body.game ?? '') as GameKey;
    const requestedPlatform = (body.platform ? String(body.platform) : null) as PlatformKey | null;
    const size = Number(body.size);
    const entryFee = Math.max(0, Math.round(Number(body.entry_fee ?? 0)));
    const requestedCountry = body.country;
    const requestedRegion = body.region;
    const rules = String(body.rules ?? '').trim();

    if (title.length < 3) {
      return NextResponse.json({ error: 'Tournament title is too short' }, { status: 400 });
    }

    const game = GAMES[requestedGame] ? getCanonicalGameKey(requestedGame) : requestedGame;
    const gameConfig = GAMES[game];
    if (!gameConfig || gameConfig.mode !== '1v1') {
      return NextResponse.json({ error: 'Pick a supported 1v1 game' }, { status: 400 });
    }

    const createRateLimit = checkRateLimit(
      `tournament-create:${authUser.sub}:${game}:${getClientIp(request)}`,
      2,
      60 * 60 * 1000
    );
    if (!createRateLimit.allowed) {
      return rateLimitResponse(createRateLimit.retryAfterSeconds);
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
    const { data: organizerProfileRaw, error: organizerProfileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authUser.sub)
      .single();

    const organizerProfile = organizerProfileRaw as (Record<string, unknown> & {
      id: string;
      username?: string | null;
      plan?: string | null;
      plan_expires_at?: string | null;
    }) | null;

    if (organizerProfileError || !organizerProfile) {
      return NextResponse.json({ error: 'Organizer profile not found' }, { status: 404 });
    }

    const organizerLocation = resolveProfileLocation(organizerProfile as Record<string, unknown>);
    const location = validateLocationSelection({
      country: requestedCountry ?? organizerLocation.country,
      region: requestedRegion ?? organizerLocation.region,
    });

    if (!location) {
      return NextResponse.json(
        { error: 'Choose a supported country and region for the tournament' },
        { status: 400 }
      );
    }

    const organizerPlan = await maybeExpireProfilePlan(organizerProfile, supabase);
    const organizerPlanConfig = getPlan(organizerPlan);

    if (entryFee === 0 && organizerPlan === 'free') {
      return NextResponse.json(
        {
          error: 'Free-entry tournaments are for Pro and Elite players.',
          upgrade_url: '/pricing',
          required_plan: 'pro',
        },
        { status: 403 }
      );
    }

    const { data: tournament, error } = await supabase
      .from('tournaments')
      .insert({
        slug,
        title,
        game,
        platform,
        region: location.label,
        size,
        entry_fee: entryFee,
        platform_fee_rate: organizerPlanConfig.tournamentFeePercent,
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

    try {
      await notifyGameAudienceAboutTournament({
        supabase,
        actorUserId: authUser.sub,
        game,
        organizerName: organizerProfile.username?.trim() || 'A player',
        slug,
        title,
        platform,
        entryFee,
        size,
        region: location.label,
        excludeUserIds: [authUser.sub],
      });
    } catch (broadcastError) {
      console.error('[Tournaments POST] Broadcast error:', broadcastError);
    }

    return NextResponse.json({ tournament }, { status: 201 });
  } catch (err) {
    console.error('[Tournaments POST] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
