import { NextRequest, NextResponse } from 'next/server';
import { getRequestAccessProfile, hasModeratorAccess } from '@/lib/access';
import { writeAuditLog } from '@/lib/audit';
import { isE2ELobbyFixture, shouldHideE2EFixtures } from '@/lib/e2e-fixtures';
import { getClientIp } from '@/lib/rateLimit';
import { createServiceClient } from '@/lib/supabase';
import { firstRelation } from '@/lib/tournaments';
import type { AdminLobbyDetail, GameKey, UserRole } from '@/types';

type LobbyHostRelation = {
  id: string;
  username: string;
  phone?: string | null;
  email?: string | null;
  role?: UserRole | null;
  is_banned?: boolean | null;
};

type LobbyMemberUserRelation = {
  id: string;
  username: string;
  phone?: string | null;
  email?: string | null;
  role?: UserRole | null;
  is_banned?: boolean | null;
};

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

function buildLobbyDetail(
  lobby: Record<string, unknown>,
  members: Array<Record<string, unknown>>
): AdminLobbyDetail {
  const host = firstRelation(lobby.host as LobbyHostRelation | LobbyHostRelation[] | null | undefined);

  return {
    id: lobby.id as string,
    host_id: lobby.host_id as string,
    game: lobby.game as GameKey,
    visibility: lobby.visibility === 'private' ? 'private' : 'public',
    mode: lobby.mode as string,
    map_name: (lobby.map_name as string | null | undefined) ?? null,
    scheduled_for: (lobby.scheduled_for as string | null | undefined) ?? null,
    title: lobby.title as string,
    max_players: (lobby.max_players as number | undefined) ?? 0,
    room_code: lobby.room_code as string,
    status: lobby.status as AdminLobbyDetail['status'],
    created_at: lobby.created_at as string,
    member_count: readRelationCount(lobby.member_count) || members.length,
    host: host
      ? {
          id: host.id,
          username: host.username,
          phone: host.phone ?? null,
          email: host.email ?? null,
          role: host.role ?? undefined,
          is_banned: host.is_banned ?? undefined,
        }
      : null,
    members: members.map((member) => {
      const memberUser = firstRelation(
        member.user as LobbyMemberUserRelation | LobbyMemberUserRelation[] | null | undefined
      );

      return {
        id: member.id as string,
        lobby_id: member.lobby_id as string,
        user_id: member.user_id as string,
        joined_at: member.joined_at as string,
        user: memberUser
          ? {
              id: memberUser.id,
              username: memberUser.username,
              phone: memberUser.phone ?? null,
              email: memberUser.email ?? null,
              role: memberUser.role ?? undefined,
              is_banned: memberUser.is_banned ?? undefined,
            }
          : undefined,
      };
    }),
  };
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

  try {
    const supabase = createServiceClient();
    let lobbyQuery = supabase
      .from('lobbies')
      .select(
        'id, host_id, game, visibility, mode, map_name, scheduled_for, title, max_players, room_code, status, created_at, host:host_id(id, username, phone, email, role, is_banned), member_count:lobby_members(count)'
      )
      .eq('id', id);

    if (shouldHideE2EFixtures()) {
      lobbyQuery = lobbyQuery.not('title', 'ilike', '%e2e%').not('room_code', 'ilike', '%e2e%');
    }

    const { data: lobby, error: lobbyError } = await lobbyQuery.single();

    if (lobbyError || !lobby || isE2ELobbyFixture(lobby)) {
      return NextResponse.json({ error: 'Lobby not found' }, { status: 404 });
    }

    const { data: members, error: memberError } = await supabase
      .from('lobby_members')
      .select('id, lobby_id, user_id, joined_at, user:user_id(id, username, phone, email, role, is_banned)')
      .eq('lobby_id', id)
      .order('joined_at', { ascending: true });

    if (memberError) {
      return NextResponse.json({ error: 'Failed to load lobby members' }, { status: 500 });
    }

    return NextResponse.json({
      lobby: buildLobbyDetail(
        lobby as Record<string, unknown>,
        (members ?? []) as Array<Record<string, unknown>>
      ),
    });
  } catch (err) {
    console.error('[Admin Lobby GET] Error:', err);
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
      reason?: string;
      user_id?: string;
    };
    const supabase = createServiceClient();
    let lobbyQuery = supabase
      .from('lobbies')
      .select('id, title, room_code, host_id, max_players, status, visibility')
      .eq('id', id);

    if (shouldHideE2EFixtures()) {
      lobbyQuery = lobbyQuery.not('title', 'ilike', '%e2e%').not('room_code', 'ilike', '%e2e%');
    }

    const { data: lobby, error: lobbyError } = await lobbyQuery.single();

    if (lobbyError || !lobby) {
      return NextResponse.json({ error: 'Lobby not found' }, { status: 404 });
    }

    if (body.action === 'close') {
      const { error } = await supabase
        .from('lobbies')
        .update({ status: 'closed' })
        .eq('id', id);

      if (error) {
        return NextResponse.json({ error: 'Failed to close lobby' }, { status: 500 });
      }

      await writeAuditLog({
        adminId: admin.id,
        action: 'close_lobby',
        targetType: 'lobby',
        targetId: id,
        details: {
          title: lobby.title,
          roomCode: lobby.room_code,
          previousStatus: lobby.status,
          reason: body.reason ?? null,
        },
        ipAddress: getClientIp(request),
      });

      return NextResponse.json({ success: true });
    }

    if (body.action === 'remove_member') {
      if (!body.user_id) {
        return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
      }

      const { data: membership, error: membershipError } = await supabase
        .from('lobby_members')
        .select('id, user_id, user:user_id(username)')
        .eq('lobby_id', id)
        .eq('user_id', body.user_id)
        .maybeSingle();

      if (membershipError) {
        return NextResponse.json({ error: 'Failed to load lobby member' }, { status: 500 });
      }

      if (!membership) {
        return NextResponse.json({ error: 'Lobby member not found' }, { status: 404 });
      }

      const { error: deleteError } = await supabase
        .from('lobby_members')
        .delete()
        .eq('id', membership.id);

      if (deleteError) {
        return NextResponse.json({ error: 'Failed to remove lobby member' }, { status: 500 });
      }

      let nextStatus = lobby.status as string;
      if (body.user_id === lobby.host_id) {
        await supabase.from('lobbies').update({ status: 'closed' }).eq('id', id);
        nextStatus = 'closed';
      } else {
        const { count } = await supabase
          .from('lobby_members')
          .select('id', { count: 'exact', head: true })
          .eq('lobby_id', id);

        if ((count ?? 0) < lobby.max_players && lobby.status === 'full') {
          await supabase.from('lobbies').update({ status: 'open' }).eq('id', id);
          nextStatus = 'open';
        }
      }

      await writeAuditLog({
        adminId: admin.id,
        action: 'remove_lobby_member',
        targetType: 'lobby',
        targetId: id,
        details: {
          title: lobby.title,
          roomCode: lobby.room_code,
          previousStatus: lobby.status,
          nextStatus,
          removedUserId: body.user_id,
          removedUsername:
            (membership.user as { username?: string } | null)?.username ?? null,
          reason: body.reason ?? null,
        },
        ipAddress: getClientIp(request),
      });

      return NextResponse.json({ success: true, status: nextStatus });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    console.error('[Admin Lobby PATCH] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
