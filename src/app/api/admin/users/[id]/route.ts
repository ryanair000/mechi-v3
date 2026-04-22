import { NextRequest, NextResponse } from 'next/server';
import { PRIMARY_ADMIN_PHONE, isPrimaryAdminPhone } from '@/lib/admin-access';
import { getRequestAccessProfile, hasAdminAccess, hasModeratorAccess } from '@/lib/access';
import { writeAuditLog, type AuditAction } from '@/lib/audit';
import {
  filterVisibleLobbies,
  filterVisibleTournaments,
  isE2ELobbyFixture,
  isE2ETournamentFixture,
  shouldHideE2EFixtures,
} from '@/lib/e2e-fixtures';
import { getClientIp } from '@/lib/rateLimit';
import { createServiceClient } from '@/lib/supabase';
import { firstRelation } from '@/lib/tournaments';
import type { UserRole } from '@/types';

function readRelationCount(value: unknown): number {
  if (typeof value === 'number') {
    return value;
  }

  if (Array.isArray(value)) {
    const first = value[0] as { count?: unknown } | undefined;
    return typeof first?.count === 'number' ? first.count : 0;
  }

  if (value && typeof value === 'object' && 'count' in value) {
    const count = (value as { count?: unknown }).count;
    return typeof count === 'number' ? count : 0;
  }

  return 0;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getRequestAccessProfile(request);
  if (!admin || !hasModeratorAccess(admin) || admin.is_banned) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const hideE2EFixtures = shouldHideE2EFixtures();

  try {
    const supabase = createServiceClient();
    const { data: userProfile, error: userError } = await supabase
      .from('profiles')
      .select(
        'id, username, phone, email, region, role, is_banned, ban_reason, banned_at, selected_games, platforms, game_ids, created_at, xp, level, mp, win_streak, max_win_streak, plan, plan_since, plan_expires_at'
      )
      .eq('id', id)
      .single();

    if (userError || !userProfile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const [
      queueEntryResult,
      matchesResult,
      joinedLobbiesResult,
      hostedLobbiesResult,
      joinedTournamentsResult,
      organizedTournamentsResult,
      subscriptionResult,
    ] = await Promise.all([
      supabase
        .from('queue')
        .select('id, user_id, game, platform, region, rating, status, joined_at')
        .eq('user_id', id)
        .in('status', ['waiting', 'matched'])
        .order('joined_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('matches')
        .select(
          'id, game, platform, region, status, winner_id, created_at, completed_at, tournament_id, player1:player1_id(id, username), player2:player2_id(id, username)'
        )
        .or(`player1_id.eq.${id},player2_id.eq.${id}`)
        .order('created_at', { ascending: false })
        .limit(6),
      supabase
        .from('lobby_members')
        .select(
          'id, joined_at, lobby:lobby_id(id, host_id, game, visibility, mode, map_name, scheduled_for, title, max_players, room_code, status, created_at)'
        )
        .eq('user_id', id)
        .order('joined_at', { ascending: false })
        .limit(5),
      (() => {
        let query = supabase
          .from('lobbies')
          .select(
            'id, host_id, game, visibility, mode, map_name, scheduled_for, title, max_players, room_code, status, created_at, member_count:lobby_members(count)'
          )
          .eq('host_id', id)
          .order('created_at', { ascending: false })
          .limit(5);

        if (hideE2EFixtures) {
          query = query.not('title', 'ilike', '%e2e%').not('room_code', 'ilike', '%e2e%');
        }

        return query;
      })(),
      supabase
        .from('tournament_players')
        .select(
          'id, payment_status, joined_at, tournament:tournament_id(id, slug, title, game, status, entry_fee, prize_pool, payout_status, created_at)'
        )
        .eq('user_id', id)
        .order('joined_at', { ascending: false })
        .limit(5),
      (() => {
        let query = supabase
          .from('tournaments')
          .select('id, slug, title, game, status, entry_fee, prize_pool, payout_status, created_at')
          .eq('organizer_id', id)
          .order('created_at', { ascending: false })
          .limit(5);

        if (hideE2EFixtures) {
          query = query.not('title', 'ilike', '%e2e%').not('slug', 'ilike', '%e2e%');
        }

        return query;
      })(),
      supabase
        .from('subscriptions')
        .select('id, plan, billing_cycle, amount_kes, status, paystack_ref, started_at, expires_at, cancelled_at, created_at')
        .eq('user_id', id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    if (matchesResult.error || joinedLobbiesResult.error || hostedLobbiesResult.error || joinedTournamentsResult.error || organizedTournamentsResult.error || subscriptionResult.error) {
      return NextResponse.json({ error: 'Failed to load user detail' }, { status: 500 });
    }

    const joinedLobbies = ((joinedLobbiesResult.data ?? []) as Array<Record<string, unknown>>)
      .map((row) => {
        const lobby = firstRelation(row.lobby as Record<string, unknown> | Record<string, unknown>[] | null | undefined);
        if (!lobby) return null;

        return {
          joined_at: row.joined_at as string,
          lobby,
        };
      })
      .filter(Boolean);

    const hostedLobbies = filterVisibleLobbies(
      ((hostedLobbiesResult.data ?? []) as Array<Record<string, unknown>>).map((row) => ({
        ...row,
        member_count: readRelationCount(row.member_count),
      }))
    );

    const joinedTournaments = ((joinedTournamentsResult.data ?? []) as Array<Record<string, unknown>>)
      .map((row) => {
        const tournament = firstRelation(
          row.tournament as Record<string, unknown> | Record<string, unknown>[] | null | undefined
        );
        if (!tournament) return null;

        return {
          id: row.id,
          payment_status: row.payment_status,
          joined_at: row.joined_at,
          tournament,
        };
      })
      .filter(Boolean);

    const visibleJoinedLobbies = hideE2EFixtures
      ? joinedLobbies.filter((entry) => !isE2ELobbyFixture(entry?.lobby as Record<string, unknown>))
      : joinedLobbies;

    const visibleJoinedTournaments = hideE2EFixtures
      ? joinedTournaments.filter(
          (entry) => !isE2ETournamentFixture(entry?.tournament as Record<string, unknown>)
        )
      : joinedTournaments;

    const organizedTournaments = filterVisibleTournaments(
      (organizedTournamentsResult.data ?? []) as Array<Record<string, unknown>>
    );

    return NextResponse.json({
      user: userProfile,
      currentQueueEntry: queueEntryResult.data ?? null,
      recentMatches: matchesResult.data ?? [],
      joinedLobbies: visibleJoinedLobbies,
      hostedLobbies,
      joinedTournaments: visibleJoinedTournaments,
      organizedTournaments,
      currentSubscription: subscriptionResult.data ?? null,
    });
  } catch (err) {
    console.error('[Admin User GET] Error:', err);
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
  if (id === admin.id) {
    return NextResponse.json({ error: 'Cannot modify your own account' }, { status: 400 });
  }

  try {
    const body = (await request.json()) as {
      action?: string;
      reason?: string;
      role?: UserRole;
    };
    const supabase = createServiceClient();

    const { data: target, error: targetError } = await supabase
      .from('profiles')
      .select('id, username, phone, role, is_banned')
      .eq('id', id)
      .single();

    if (targetError || !target) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if ((body.action === 'set_role' || target.role !== 'user') && !hasAdminAccess(admin)) {
      return NextResponse.json(
        { error: 'Only admins can change roles or act on moderators/admins' },
        { status: 403 }
      );
    }

    let updateData: Record<string, unknown>;
    let auditAction: AuditAction;

    if (body.action === 'ban') {
      updateData = {
        is_banned: true,
        ban_reason: body.reason?.trim() || null,
        banned_at: new Date().toISOString(),
        banned_by: admin.id,
      };
      auditAction = 'ban_user';
    } else if (body.action === 'unban') {
      updateData = {
        is_banned: false,
        ban_reason: null,
        banned_at: null,
        banned_by: null,
      };
      auditAction = 'unban_user';
    } else if (body.action === 'set_role') {
      if (!body.role || !['user', 'moderator', 'admin'].includes(body.role)) {
        return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
      }

      if (body.role === 'admin' && !hasAdminAccess(admin)) {
        return NextResponse.json({ error: 'Only admins can promote admins' }, { status: 403 });
      }

      if (body.role === 'admin' && !isPrimaryAdminPhone(target.phone)) {
        return NextResponse.json(
          { error: `Only ${PRIMARY_ADMIN_PHONE} can hold admin access` },
          { status: 400 }
        );
      }

      if (target.role === 'admin' && isPrimaryAdminPhone(target.phone) && body.role !== 'admin') {
        return NextResponse.json(
          { error: `Keep ${PRIMARY_ADMIN_PHONE} as the admin account` },
          { status: 400 }
        );
      }

      updateData = { role: body.role };
      auditAction = 'change_role';
    } else {
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }

    const { error } = await supabase.from('profiles').update(updateData).eq('id', id);
    if (error) {
      return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
    }

    await writeAuditLog({
      adminId: admin.id,
      action: auditAction,
      targetType: 'user',
      targetId: id,
      details: {
        username: target.username,
        previousRole: target.role,
        newRole: body.role,
        reason: body.reason ?? null,
      },
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[Admin User PATCH] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
