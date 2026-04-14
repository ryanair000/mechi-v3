import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const supabase = createServiceClient();

    const { error } = await supabase
      .from('lobby_members')
      .delete()
      .eq('lobby_id', id)
      .eq('user_id', authUser.sub);

    if (error) {
      return NextResponse.json({ error: 'Failed to leave lobby' }, { status: 500 });
    }

    // If host left, close the lobby
    const { data: lobby } = await supabase
      .from('lobbies')
      .select('host_id')
      .eq('id', id)
      .single();

    if (lobby?.host_id === authUser.sub) {
      await supabase.from('lobbies').update({ status: 'closed' }).eq('id', id);
    } else {
      // Reopen if was full
      const { count } = await supabase
        .from('lobby_members')
        .select('*', { count: 'exact', head: true })
        .eq('lobby_id', id);

      const { data: lobbyData } = await supabase
        .from('lobbies')
        .select('max_players, status')
        .eq('id', id)
        .single();

      if (lobbyData && (count ?? 0) < lobbyData.max_players && lobbyData.status === 'full') {
        await supabase.from('lobbies').update({ status: 'open' }).eq('id', id);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[Lobby Leave] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
