import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import { createServiceClient } from '@/lib/supabase';

export async function POST(
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

    const { data: lobby } = await supabase
      .from('lobbies')
      .select('*, member_count:lobby_members(count)')
      .eq('id', id)
      .single();

    if (!lobby) {
      return NextResponse.json({ error: 'Lobby not found' }, { status: 404 });
    }

    if (lobby.status !== 'open') {
      return NextResponse.json({ error: `Lobby is ${lobby.status}` }, { status: 400 });
    }

    // Check if already a member
    const { data: existing } = await supabase
      .from('lobby_members')
      .select('id')
      .eq('lobby_id', id)
      .eq('user_id', authUser.id)
      .single();

    if (existing) {
      return NextResponse.json({ error: 'Already in lobby' }, { status: 409 });
    }

    const memberCount = lobby.member_count?.[0]?.count ?? 0;
    if (memberCount >= lobby.max_players) {
      return NextResponse.json({ error: 'Lobby is full' }, { status: 400 });
    }

    const { data: member, error } = await supabase
      .from('lobby_members')
      .insert({ lobby_id: id, user_id: authUser.id })
      .select()
      .single();

    if (error || !member) {
      return NextResponse.json({ error: 'Failed to join lobby' }, { status: 500 });
    }

    const newCount = memberCount + 1;
    if (newCount >= lobby.max_players) {
      await supabase.from('lobbies').update({ status: 'full' }).eq('id', id);
    }

    return NextResponse.json({ member });
  } catch (err) {
    console.error('[Lobby Join] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
