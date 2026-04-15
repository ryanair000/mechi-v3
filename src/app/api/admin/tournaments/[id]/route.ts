import { NextRequest, NextResponse } from 'next/server';
import { getRequestAccessProfile, hasAdminAccess, hasModeratorAccess } from '@/lib/access';
import { writeAuditLog } from '@/lib/audit';
import { getClientIp } from '@/lib/rateLimit';
import { createServiceClient } from '@/lib/supabase';

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
