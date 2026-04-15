import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase';
import { maybeMarkTournamentFull } from '@/lib/tournaments';
import { verifyTournamentPayment } from '@/lib/paystack';
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
      .eq('user_id', authUser.sub)
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

    await supabase
      .from('tournament_players')
      .update({ payment_status: 'paid' })
      .eq('id', player.id);

    await maybeMarkTournamentFull(supabase, tournament.id);

    return NextResponse.json({ status: 'paid' });
  } catch (err) {
    console.error('[Tournament Payment Verify] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
