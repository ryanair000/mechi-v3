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

    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select('*')
      .eq('id', id)
      .single();

    if (matchError || !match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    if (match.player1_id !== authUser.sub && match.player2_id !== authUser.sub) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (match.status !== 'pending') {
      return NextResponse.json({ error: 'Cannot cancel this match' }, { status: 400 });
    }

    const { error: updateError } = await supabase
      .from('matches')
      .update({ status: 'cancelled', completed_at: new Date().toISOString() })
      .eq('id', id);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to cancel match' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[Match Cancel] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
