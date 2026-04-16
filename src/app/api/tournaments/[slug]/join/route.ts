import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { GAMES } from '@/lib/config';
import { createServiceClient } from '@/lib/supabase';
import {
  ACTIVE_TOURNAMENT_PLAYER_STATUSES,
  CONFIRMED_PAYMENT_STATUSES,
  getAppUrl,
  maybeMarkTournamentFull,
  releaseExpiredTournamentReservations,
} from '@/lib/tournaments';
import {
  initializeTournamentPayment,
  isPaystackConfigured,
  normaliseKenyanPhone,
} from '@/lib/paystack';
import { makePaymentReference } from '@/lib/slug';
import type { Tournament } from '@/types';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const authUser = getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { slug } = await params;

  try {
    const supabase = createServiceClient();
    const { data: tournamentBySlug, error: tournamentError } = await supabase
      .from('tournaments')
      .select('*')
      .eq('slug', slug)
      .single();

    let tournament = tournamentBySlug as Tournament | null;
    if (tournamentError || !tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }

    await releaseExpiredTournamentReservations(supabase, tournament.id);

    const { data: refreshedTournament } = await supabase
      .from('tournaments')
      .select('*')
      .eq('id', tournament.id)
      .single();

    tournament = (refreshedTournament as Tournament | null) ?? tournament;

    if (tournament.status !== 'open') {
      return NextResponse.json({ error: 'This tournament is not open' }, { status: 400 });
    }

    const { data: existing } = await supabase
      .from('tournament_players')
      .select('id, payment_status')
      .eq('tournament_id', tournament.id)
      .eq('user_id', authUser.sub)
      .maybeSingle();

    const existingPlayer = existing as { id: string; payment_status: string } | null;
    const canRetryExistingPlayer =
      existingPlayer &&
      !ACTIVE_TOURNAMENT_PLAYER_STATUSES.includes(
        existingPlayer.payment_status as (typeof ACTIVE_TOURNAMENT_PLAYER_STATUSES)[number]
      );

    if (
      existingPlayer &&
      CONFIRMED_PAYMENT_STATUSES.includes(
        existingPlayer.payment_status as (typeof CONFIRMED_PAYMENT_STATUSES)[number]
      )
    ) {
      return NextResponse.json({ error: 'You already joined this tournament' }, { status: 409 });
    }

    if (existingPlayer?.payment_status === 'pending') {
      return NextResponse.json(
        { error: 'Finish your current payment before trying again' },
        { status: 409 }
      );
    }

    const { count: reservedCount } = await supabase
      .from('tournament_players')
      .select('id', { count: 'exact', head: true })
      .eq('tournament_id', tournament.id)
      .in('payment_status', [...ACTIVE_TOURNAMENT_PLAYER_STATUSES]);

    if ((reservedCount ?? 0) >= tournament.size) {
      await maybeMarkTournamentFull(supabase, tournament.id);
      return NextResponse.json({ error: 'This bracket is full' }, { status: 400 });
    }

    const { data: profileRaw, error: profileError } = await supabase
      .from('profiles')
      .select('id, username, phone, email, selected_games')
      .eq('id', authUser.sub)
      .single();

    const profile = profileRaw as {
      id: string;
      username: string;
      phone: string;
      email?: string | null;
      selected_games?: string[] | null;
    } | null;

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    if (!profile.selected_games?.includes(tournament.game)) {
      const gameLabel = GAMES[tournament.game]?.label ?? tournament.game;
      return NextResponse.json(
        { error: `Add ${gameLabel} to your profile before joining` },
        { status: 400 }
      );
    }

    if (
      tournament.entry_fee > 0 &&
      !isPaystackConfigured() &&
      process.env.NODE_ENV === 'production'
    ) {
      return NextResponse.json(
        { error: 'Payment provider is not configured' },
        { status: 502 }
      );
    }

    if (
      tournament.entry_fee <= 0 ||
      (!isPaystackConfigured() && process.env.NODE_ENV !== 'production')
    ) {
      const playerOperation = canRetryExistingPlayer
        ? supabase
            .from('tournament_players')
            .update({
              payment_status: 'free',
              payment_ref: null,
              payment_access_code: null,
              joined_at: new Date().toISOString(),
            })
            .eq('id', existingPlayer.id)
        : supabase
            .from('tournament_players')
            .insert({
              tournament_id: tournament.id,
              user_id: authUser.sub,
              payment_status: 'free',
            });

      const { data: player, error } = await playerOperation.select('*').single();

      if (error || !player) {
        return NextResponse.json({ error: 'Could not join tournament' }, { status: 500 });
      }

      await maybeMarkTournamentFull(supabase, tournament.id);
      return NextResponse.json({ status: 'joined', player });
    }

    const reference = makePaymentReference('mechi_tournament');
    const email = profile.email || `${profile.username}@mechi.club`;
    const callbackUrl = `${getAppUrl()}/t/${tournament.slug}?reference=${encodeURIComponent(reference)}`;

    const pendingOperation = canRetryExistingPlayer
      ? supabase
          .from('tournament_players')
          .update({
            payment_status: 'pending',
            payment_ref: reference,
            payment_access_code: null,
            joined_at: new Date().toISOString(),
          })
          .eq('id', existingPlayer.id)
      : supabase
          .from('tournament_players')
          .insert({
            tournament_id: tournament.id,
            user_id: authUser.sub,
            payment_status: 'pending',
            payment_ref: reference,
          });

    const { data: pendingPlayer, error: insertError } = await pendingOperation
      .select('*')
      .single();

    if (insertError || !pendingPlayer) {
      return NextResponse.json({ error: 'Could not reserve your slot' }, { status: 500 });
    }

    const initialized = await initializeTournamentPayment({
      amountKes: tournament.entry_fee,
      email,
      reference,
      callbackUrl,
      metadata: {
        tournament_id: tournament.id,
        tournament_slug: tournament.slug,
        user_id: authUser.sub,
        phone: normaliseKenyanPhone(profile.phone),
      },
    });

    if (!initialized.success || !initialized.authorizationUrl) {
      await supabase
        .from('tournament_players')
        .update({
          payment_status: 'failed',
          payment_ref: reference,
        })
        .eq('id', pendingPlayer.id);

      return NextResponse.json(
        { error: initialized.error ?? 'Could not start payment' },
        { status: 502 }
      );
    }

    await supabase
      .from('tournament_players')
      .update({
        payment_ref: initialized.reference,
        payment_access_code: initialized.accessCode ?? null,
      })
      .eq('id', pendingPlayer.id);

    return NextResponse.json({
      status: 'payment_pending',
      authorization_url: initialized.authorizationUrl,
      reference: initialized.reference,
    });
  } catch (err) {
    console.error('[Tournament Join] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
