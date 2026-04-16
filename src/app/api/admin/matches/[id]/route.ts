import { NextRequest, NextResponse } from 'next/server';
import { getRequestAccessProfile, hasModeratorAccess } from '@/lib/access';
import { writeAuditLog } from '@/lib/audit';
import { getClientIp } from '@/lib/rateLimit';
import { createServiceClient } from '@/lib/supabase';
import { firstRelation } from '@/lib/tournaments';

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
    const { data: matchRaw, error: matchError } = await supabase
      .from('matches')
      .select(
        'id, player1_id, player2_id, game, platform, region, status, winner_id, player1_reported_winner, player2_reported_winner, rating_change_p1, rating_change_p2, dispute_screenshot_url, dispute_requested_by, gamification_summary_p1, gamification_summary_p2, tournament_id, created_at, completed_at, player1:player1_id(id, username, email, phone), player2:player2_id(id, username, email, phone)'
      )
      .eq('id', id)
      .single();

    if (matchError || !matchRaw) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    const match = {
      ...matchRaw,
      player1: firstRelation(matchRaw.player1),
      player2: firstRelation(matchRaw.player2),
    };

    const relatedProfileIds = [
      match.winner_id,
      match.player1_reported_winner,
      match.player2_reported_winner,
      match.dispute_requested_by,
    ].filter((value): value is string => Boolean(value));

    const [{ data: profiles }, tournamentResult] = await Promise.all([
      relatedProfileIds.length
        ? supabase.from('profiles').select('id, username').in('id', relatedProfileIds)
        : Promise.resolve({ data: [], error: null }),
      match.tournament_id
        ? supabase
            .from('tournaments')
            .select('id, slug, title, status, payout_status')
            .eq('id', match.tournament_id)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);

    const profileMap = new Map(
      ((profiles ?? []) as Array<{ id: string; username: string }>).map((profile) => [
        profile.id,
        profile,
      ])
    );

    return NextResponse.json({
      match,
      disputeRequester: match.dispute_requested_by
        ? profileMap.get(match.dispute_requested_by) ?? null
        : null,
      reportState: {
        player1ReportedWinner:
          match.player1_reported_winner
            ? profileMap.get(match.player1_reported_winner) ?? null
            : null,
        player2ReportedWinner:
          match.player2_reported_winner
            ? profileMap.get(match.player2_reported_winner) ?? null
            : null,
      },
      tournament: tournamentResult.data ?? null,
    });
  } catch (err) {
    console.error('[Admin Match GET] Error:', err);
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

    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select('id, status, game, player1_id, player2_id, winner_id')
      .eq('id', id)
      .single();

    if (matchError || !match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    if (body.action === 'cancel') {
      const { error } = await supabase
        .from('matches')
        .update({ status: 'cancelled' })
        .eq('id', id);

      if (error) return NextResponse.json({ error: 'Failed to cancel match' }, { status: 500 });

      await writeAuditLog({
        adminId: admin.id,
        action: 'cancel_match',
        targetType: 'match',
        targetId: id,
        details: { previousStatus: match.status, reason: body.reason ?? null },
        ipAddress: getClientIp(request),
      });

      return NextResponse.json({ success: true });
    }

    if (body.action === 'override_winner' || body.action === 'resolve_dispute') {
      if (!body.winner_id || ![match.player1_id, match.player2_id].includes(body.winner_id)) {
        return NextResponse.json({ error: 'Winner must be a match participant' }, { status: 400 });
      }

      if (body.action === 'resolve_dispute' && match.status !== 'disputed') {
        return NextResponse.json({ error: 'Match is not disputed' }, { status: 400 });
      }

      const { error } = await supabase
        .from('matches')
        .update({
          status: 'completed',
          winner_id: body.winner_id,
          completed_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) return NextResponse.json({ error: 'Failed to update match' }, { status: 500 });

      await writeAuditLog({
        adminId: admin.id,
        action: body.action === 'resolve_dispute' ? 'resolve_dispute' : 'override_match',
        targetType: 'match',
        targetId: id,
        details: {
          previousStatus: match.status,
          previousWinner: match.winner_id,
          newWinner: body.winner_id,
          reason: body.reason ?? null,
        },
        ipAddress: getClientIp(request),
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    console.error('[Admin Match PATCH] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
