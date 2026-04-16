import { NextRequest, NextResponse } from 'next/server';
import { getRequestAccessProfile, hasAdminAccess, hasModeratorAccess } from '@/lib/access';
import { writeAuditLog } from '@/lib/audit';
import { getClientIp } from '@/lib/rateLimit';
import { createServiceClient } from '@/lib/supabase';
import { mapTournamentMatchRelations } from '@/lib/tournaments';
import type { TournamentPaymentStatus } from '@/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getRequestAccessProfile(request);
  if (!admin || !hasModeratorAccess(admin) || admin.is_banned) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;

  try {
    const supabase = createServiceClient();
    const { data: tournament, error: tournamentError } = await supabase
      .from('tournaments')
      .select(
        'id, slug, title, game, platform, region, size, entry_fee, prize_pool, platform_fee, platform_fee_rate, status, bracket, winner_id, organizer_id, rules, payout_status, payout_ref, payout_error, created_at, started_at, ended_at, organizer:organizer_id(id, username, email), winner:winner_id(id, username)'
      )
      .eq('id', id)
      .single();

    if (tournamentError || !tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }

    const [playersResult, bracketMatchesResult, liveMatchesResult] = await Promise.all([
      supabase
        .from('tournament_players')
        .select('*, user:user_id(id, username, email, phone)')
        .eq('tournament_id', id)
        .order('joined_at', { ascending: true }),
      supabase
        .from('tournament_matches')
        .select('*, player1:player1_id(id, username), player2:player2_id(id, username), winner:winner_id(id, username)')
        .eq('tournament_id', id)
        .order('round', { ascending: true })
        .order('slot', { ascending: true }),
      supabase
        .from('matches')
        .select('id, game, status, winner_id, created_at, completed_at, player1:player1_id(id, username), player2:player2_id(id, username)')
        .eq('tournament_id', id)
        .order('created_at', { ascending: false }),
    ]);

    if (playersResult.error || bracketMatchesResult.error || liveMatchesResult.error) {
      return NextResponse.json({ error: 'Failed to load tournament detail' }, { status: 500 });
    }

    const paymentBreakdown = ((playersResult.data ?? []) as Array<{ payment_status: TournamentPaymentStatus }>)
      .reduce<Record<TournamentPaymentStatus, number>>(
        (counts, player) => {
          counts[player.payment_status] = (counts[player.payment_status] ?? 0) + 1;
          return counts;
        },
        {
          pending: 0,
          paid: 0,
          free: 0,
          failed: 0,
          refunded: 0,
        }
      );

    return NextResponse.json({
      tournament,
      players: playersResult.data ?? [],
      bracketMatches: (bracketMatchesResult.data ?? []).map(mapTournamentMatchRelations),
      liveMatches: liveMatchesResult.data ?? [],
      paymentBreakdown,
    });
  } catch (err) {
    console.error('[Admin Tournament GET] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getRequestAccessProfile(request);
  if (!admin || !hasModeratorAccess(admin) || admin.is_banned) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;

  try {
    const body = (await request.json()) as {
      action?: string;
      winner_id?: string;
      reason?: string;
    };
    const supabase = createServiceClient();

    const { data: tournament, error: tournamentError } = await supabase
      .from('tournaments')
      .select('id, title, status, winner_id')
      .eq('id', id)
      .single();

    if (tournamentError || !tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }

    if (body.action === 'cancel') {
      if (!hasAdminAccess(admin)) {
        return NextResponse.json({ error: 'Only admins can cancel tournaments' }, { status: 403 });
      }

      const { error } = await supabase
        .from('tournaments')
        .update({ status: 'cancelled' })
        .eq('id', id);

      if (error) return NextResponse.json({ error: 'Failed to cancel tournament' }, { status: 500 });

      await writeAuditLog({
        adminId: admin.id,
        action: 'cancel_tournament',
        targetType: 'tournament',
        targetId: id,
        details: { title: tournament.title, previousStatus: tournament.status, reason: body.reason ?? null },
        ipAddress: getClientIp(request),
      });

      return NextResponse.json({ success: true });
    }

    if (body.action === 'override_winner') {
      if (!hasAdminAccess(admin)) {
        return NextResponse.json(
          { error: 'Only admins can override tournament winners' },
          { status: 403 }
        );
      }

      if (!body.winner_id) {
        return NextResponse.json({ error: 'winner_id is required' }, { status: 400 });
      }

      const { error } = await supabase
        .from('tournaments')
        .update({
          status: 'completed',
          winner_id: body.winner_id,
          ended_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) return NextResponse.json({ error: 'Failed to update tournament' }, { status: 500 });

      await writeAuditLog({
        adminId: admin.id,
        action: 'override_tournament_winner',
        targetType: 'tournament',
        targetId: id,
        details: {
          title: tournament.title,
          previousStatus: tournament.status,
          previousWinner: tournament.winner_id,
          newWinner: body.winner_id,
          reason: body.reason ?? null,
        },
        ipAddress: getClientIp(request),
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    console.error('[Admin Tournament PATCH] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
