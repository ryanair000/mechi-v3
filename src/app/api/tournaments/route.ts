import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import { GAMES, getCanonicalGameKey, isValidGamePlatform } from '@/lib/config';
import { isTournamentSize } from '@/lib/bracket';
import { notifyGameAudienceAboutTournament } from '@/lib/game-audience';
import { resolveProfileLocation, validateLocationSelection } from '@/lib/location';
import { getPlan } from '@/lib/plans';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rateLimit';
import { makeSlug } from '@/lib/slug';
import { maybeExpireProfilePlan } from '@/lib/subscription';
import { createServiceClient } from '@/lib/supabase';
import {
  getPlatformForTournament,
  getTournamentPaymentMetrics,
  getTournamentPrizeSnapshot,
} from '@/lib/tournaments';
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
      .order('is_featured', { ascending: false })
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
      .select('tournament_id, payment_status')
      .in('tournament_id', tournamentIds)
      .in('payment_status', ['paid', 'free']);

    if (playersError) {
      return NextResponse.json({ error: 'Failed to fetch tournaments' }, { status: 500 });
    }

    const playersByTournament = (players ?? []).reduce<
      Record<string, Array<{ payment_status: string | null | undefined }>>
    >((grouped, player) => {
      const tournamentId = player.tournament_id as string | undefined;
      if (!tournamentId) return grouped;
      grouped[tournamentId] = [
        ...(grouped[tournamentId] ?? []),
        { payment_status: (player.payment_status as string | null | undefined) ?? null },
      ];
      return grouped;
    }, {});

    return NextResponse.json({
      tournaments: tournaments.map((tournament) => ({
        ...tournament,
        player_count: getTournamentPaymentMetrics(playersByTournament[tournament.id] ?? [])
          .confirmedCount,
        prize_pool: getTournamentPrizeSnapshot({
          entryFee: Number(tournament.entry_fee ?? 0),
          paidPlayerCount: getTournamentPaymentMetrics(playersByTournament[tournament.id] ?? [])
            .paidCount,
          feeRate: Number(tournament.platform_fee_rate ?? 5),
          storedPrizePool: Number(tournament.prize_pool ?? 0),
          storedPlatformFee: Number(tournament.platform_fee ?? 0),
        }).prizePool,
      })),
    });
  } catch (err) {
    console.error('[Tournaments GET] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) {
    return access.response;
  }

  const authUser = access.profile;

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
      `tournament-create:${authUser.id}:${game}:${getClientIp(request)}`,
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
      .eq('id', authUser.id)
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
        approval_status: 'pending',
        is_featured: false,
        organizer_id: authUser.id,
      })
      .select('*')
      .single();

    if (error || !tournament) {
      return NextResponse.json({ error: 'Failed to create tournament' }, { status: 500 });
    }

    await supabase.from('tournament_players').insert({
      tournament_id: tournament.id,
      user_id: authUser.id,
      payment_status: 'free',
    });

    try {
      await notifyGameAudienceAboutTournament({
        supabase,
        actorUserId: authUser.id,
        game,
        organizerName: organizerProfile.username?.trim() || 'A player',
        slug,
        title,
        platform,
        entryFee,
        size,
        region: location.label,
        excludeUserIds: [authUser.id],
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
