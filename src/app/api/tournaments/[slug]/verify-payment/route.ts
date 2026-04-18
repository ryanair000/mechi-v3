import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import { GAMES } from '@/lib/config';
import { createNotifications } from '@/lib/notifications';
import { createServiceClient } from '@/lib/supabase';
import { markTournamentPaymentPaidByReference } from '@/lib/tournaments';
import { verifyTournamentPayment } from '@/lib/paystack';
import type { NotificationType, Tournament } from '@/types';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) {
    return access.response;
  }

  const authUser = access.profile;
  const { slug } = await params;

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const reference = String(body.reference ?? '').trim();
    if (!reference) {
      return NextResponse.json({ error: 'Payment reference is required' }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { data: tournamentRaw, error: tournamentError } = await supabase
      .from('tournaments')
      .select('*')
      .eq('slug', slug)
      .single();

    const tournament = tournamentRaw as Tournament | null;
    if (tournamentError || !tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }

    const { data: playerRaw, error: playerError } = await supabase
      .from('tournament_players')
      .select('*')
      .eq('tournament_id', tournament.id)
      .eq('user_id', authUser.id)
      .eq('payment_ref', reference)
      .single();

    const player = playerRaw as { id: string; payment_status: string } | null;
    if (playerError || !player) {
      return NextResponse.json({ error: 'Payment record not found' }, { status: 404 });
    }

    if (player.payment_status === 'paid') {
      return NextResponse.json({ status: 'paid' });
    }

    const verified = await verifyTournamentPayment({
      reference,
      expectedAmountKes: tournament.entry_fee,
    });

    if (!verified.success) {
      return NextResponse.json(
        { error: verified.error ?? 'Payment is not complete yet' },
        { status: 400 }
      );
    }

    const confirmed = await markTournamentPaymentPaidByReference(supabase, reference);
    if (!confirmed.success) {
      return NextResponse.json(
        { error: confirmed.error ?? 'Could not confirm tournament payment' },
        { status: 500 }
      );
    }

    const notifications: Array<{
      user_id: string;
      type: NotificationType;
      title: string;
      body: string;
      href: string;
      metadata: Record<string, unknown>;
    }> = [
      {
        user_id: authUser.id,
        type: 'tournament_joined',
        title: `Payment confirmed for ${tournament.title}`,
        body: `You're locked into the ${GAMES[tournament.game]?.label ?? tournament.game} bracket.`,
        href: `/t/${tournament.slug}`,
        metadata: {
          tournament_id: tournament.id,
          slug: tournament.slug,
          game: tournament.game,
        },
      },
    ];

    if (tournament.organizer_id !== authUser.id) {
      const { data: profileRaw } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', authUser.id)
        .maybeSingle();

      notifications.push({
        user_id: tournament.organizer_id,
        type: 'tournament_player_joined',
        title: `${String(profileRaw?.username ?? 'A player')} joined ${tournament.title}`,
        body: `Their payment cleared and the ${GAMES[tournament.game]?.label ?? tournament.game} slot is locked.`,
        href: `/t/${tournament.slug}`,
        metadata: {
          tournament_id: tournament.id,
          slug: tournament.slug,
          player_id: authUser.id,
          game: tournament.game,
        },
      });
    }

    await createNotifications(notifications, supabase);

    return NextResponse.json({ status: 'paid' });
  } catch (err) {
    console.error('[Tournament Payment Verify] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
