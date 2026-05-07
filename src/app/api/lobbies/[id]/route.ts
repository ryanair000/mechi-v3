import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import { isE2ELobbyFixture, shouldHideE2EFixtures } from '@/lib/e2e-fixtures';
import { createServiceClient } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) {
    return access.response;
  }

  const { id } = await params;

  try {
    const supabase = createServiceClient();

    let lobbyQuery = supabase
      .from('lobbies')
      .select('*, host:host_id(id, username)')
      .eq('id', id);

    if (shouldHideE2EFixtures()) {
      lobbyQuery = lobbyQuery.not('title', 'ilike', '%e2e%').not('room_code', 'ilike', '%e2e%');
    }

    const { data: lobby, error } = await lobbyQuery.single();

    if (error || !lobby || isE2ELobbyFixture(lobby)) {
      return NextResponse.json({ error: 'Lobby not found' }, { status: 404 });
    }

    const { data: members } = await supabase
      .from('lobby_members')
      .select('*, user:user_id(id, username)')
      .eq('lobby_id', id)
      .order('joined_at', { ascending: true });

    return NextResponse.json({ lobby, members: members ?? [] });
  } catch (err) {
    console.error('[Lobby GET] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) {
    return access.response;
  }

  const authUser = access.profile;

  const { id } = await params;

  try {
    const supabase = createServiceClient();

    let lobbyQuery = supabase
      .from('lobbies')
      .select('host_id')
      .eq('id', id);

    if (shouldHideE2EFixtures()) {
      lobbyQuery = lobbyQuery.not('title', 'ilike', '%e2e%').not('room_code', 'ilike', '%e2e%');
    }

    const { data: lobby } = await lobbyQuery.single();

    if (!lobby) {
      return NextResponse.json({ error: 'Lobby not found' }, { status: 404 });
    }

    if (lobby.host_id !== authUser.id) {
      return NextResponse.json({ error: 'Only the host can close a lobby' }, { status: 403 });
    }

    await supabase.from('lobbies').update({ status: 'closed' }).eq('id', id);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[Lobby DELETE] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
