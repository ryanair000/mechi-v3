import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import { GAMES, getCanonicalGameKey, isValidGamePlatform } from '@/lib/config';
import { filterVisibleTournaments, shouldHideE2EFixtures } from '@/lib/e2e-fixtures';
import { isTournamentSize } from '@/lib/bracket';
import { notifyGameAudienceAboutTournament } from '@/lib/game-audience';
import { resolveProfileLocation, validateLocationSelection } from '@/lib/location';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rateLimit';
import { makeSlug } from '@/lib/slug';
import { maybeExpireProfilePlan } from '@/lib/subscription';
import { createServiceClient } from '@/lib/supabase';
import {
  getTournamentHostingAccess,
  getTournamentHostingMonthWindow,
} from '@/lib/tournament-hosting';
import {
  getPlatformForTournament,
  getTournamentPaymentMetrics,
  getTournamentPrizeSnapshot,
  resolveTournamentPrizePoolMode,
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

    if (shouldHideE2EFixtures()) {
      query = query.not('title', 'ilike', '%e2e%').not('slug', 'ilike', '%e2e%');
    }

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: 'Failed to fetch tournaments' }, { status: 500 });
    }

    const tournaments = filterVisibleTournaments(
      (data ?? []) as Array<Record<string, unknown> & { id: string }>
    );
    if (!tournaments.length) {
      return NextResponse.json({ tournaments: [] });
    }

    const tournamentIds = tournaments.map((tournament) => tournament.id);
    const { data: players, error: playersError } = await supabase
      .from('tournament_players')
      .select('tournament_id, payment_status')
      .in('tournament_id', tournamentIds)
      .in('payment_status', ['paid', 'free']);

    const { data: activeStreams, error: activeStreamsError } = await supabase
      .from('live_streams')
      .select('id, tournament_id, viewer_count')
      .in('tournament_id', tournamentIds)
      .eq('status', 'active');

    if (playersError || activeStreamsError) {
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

    const activeStreamByTournament = (activeStreams ?? []).reduce<
      Record<string, { id: string; viewer_count: number }>
    >((grouped, stream) => {
      const tournamentId = stream.tournament_id as string | undefined;
      if (!tournamentId || grouped[tournamentId]) {
        return grouped;
      }

      grouped[tournamentId] = {
        id: stream.id as string,
        viewer_count: Number(stream.viewer_count ?? 0),
      };
      return grouped;
    }, {});

    return NextResponse.json({
      tournaments: tournaments.map((tournament) => {
        const paymentMetrics = getTournamentPaymentMetrics(playersByTournament[tournament.id] ?? []);

        return {
          ...tournament,
          player_count: paymentMetrics.confirmedCount,
          prize_pool: getTournamentPrizeSnapshot({
            entryFee: Number(tournament.entry_fee ?? 0),
            paidPlayerCount: paymentMetrics.paidCount,
            feeRate: Number(tournament.platform_fee_rate ?? 5),
            prizePoolMode: tournament.prize_pool_mode as string | null | undefined,
            storedPrizePool: Number(tournament.prize_pool ?? 0),
            storedPlatformFee: Number(tournament.platform_fee ?? 0),
          }).prizePool,
          active_stream: activeStreamByTournament[tournament.id] ?? null,
        };
      }),
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
    const normalizedSchedule = String(body.scheduled_for ?? '').trim();
    const rules = String(body.rules ?? '').trim();
    const prizePoolModeInput =
      typeof body.prize_pool_mode === 'string' ? body.prize_pool_mode.trim() : 'auto';
    const prizePoolMode = resolveTournamentPrizePoolMode(prizePoolModeInput);
    const requestedPrizePool = Math.max(0, Math.round(Number(body.prize_pool ?? 0)));

    if (title.length < 3) {
      return NextResponse.json({ error: 'Tournament title is too short' }, { status: 400 });
    }

    const game = GAMES[requestedGame] ? getCanonicalGameKey(requestedGame) : requestedGame;
    const gameConfig = GAMES[game];
    if (!gameConfig || gameConfig.mode !== '1v1') {
      return NextResponse.json({ error: 'Pick a supported 1v1 game' }, { status: 400 });
    }

    if (!isTournamentSize(size)) {
      return NextResponse.json({ error: 'Tournament size must be 4, 8, or 16' }, { status: 400 });
    }

    if (!normalizedSchedule) {
      return NextResponse.json(
        { error: 'Tournament date and time are required' },
        { status: 400 }
      );
    }

    const scheduledAt = new Date(normalizedSchedule);
    if (Number.isNaN(scheduledAt.getTime())) {
      return NextResponse.json(
        { error: 'Pick a valid tournament date and time' },
        { status: 400 }
      );
    }

    if (scheduledAt.getTime() <= Date.now()) {
      return NextResponse.json(
        { error: 'Tournament date and time must be in the future' },
        { status: 400 }
      );
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
    let hostedThisMonth = 0;

    if (organizerPlan === 'elite') {
      const { startIso, endIso } = getTournamentHostingMonthWindow();
      const { count, error: monthlyCountError } = await supabase
        .from('tournaments')
        .select('id', { head: true, count: 'exact' })
        .eq('organizer_id', authUser.id)
        .gte('created_at', startIso)
        .lt('created_at', endIso);

      if (monthlyCountError) {
        return NextResponse.json(
          { error: 'Could not check your tournament hosting allowance' },
          { status: 500 }
        );
      }

      hostedThisMonth = count ?? 0;
    }

    const hostingAccess = getTournamentHostingAccess(organizerPlan, hostedThisMonth);

    if (!hostingAccess.canHost) {
      return NextResponse.json(
        {
          error: 'Tournament hosting requires Pro or Elite.',
          upgrade_url: '/pricing',
          required_plan: 'pro',
        },
        { status: 403 }
      );
    }

    const createRateLimit = checkRateLimit(
      `tournament-create:${authUser.id}:${game}:${getClientIp(request)}`,
      2,
      60 * 60 * 1000
    );
    if (!createRateLimit.allowed) {
      return rateLimitResponse(createRateLimit.retryAfterSeconds);
    }

    if (!['auto', 'specified'].includes(prizePoolModeInput)) {
      return NextResponse.json(
        { error: 'Choose whether the prize pool is auto or specified.' },
        { status: 400 }
      );
    }

    if (prizePoolMode === 'specified' && requestedPrizePool <= 0) {
      return NextResponse.json(
        { error: 'Enter a specified prize pool amount above KES 0.' },
        { status: 400 }
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
        prize_pool_mode: prizePoolMode,
        prize_pool: prizePoolMode === 'specified' ? requestedPrizePool : 0,
        platform_fee: 0,
        platform_fee_rate: hostingAccess.platformFeePercent,
        rules: rules || null,
        scheduled_for: scheduledAt.toISOString(),
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
        scheduledFor: scheduledAt.toISOString(),
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
