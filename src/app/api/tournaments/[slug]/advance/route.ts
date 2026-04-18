import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import { createServiceClient } from '@/lib/supabase';
import { advanceTournamentAfterMatch } from '@/lib/tournaments';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) {
    return access.response;
  }

  const authUser = access.profile;

  const { slug } = await params;

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const matchId = String(body.match_id ?? '').trim();
    const winnerId = String(body.winner_id ?? '').trim();

    if (!matchId || !winnerId) {
      return NextResponse.json({ error: 'match_id and winner_id are required' }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { data: tournament } = await supabase
      .from('tournaments')
      .select('id, organizer_id')
      .eq('slug', slug)
      .single();

    if (!tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }

    if (tournament.organizer_id !== authUser.id) {
      return NextResponse.json({ error: 'Only the organizer can repair bracket advancement' }, { status: 403 });
    }

    await advanceTournamentAfterMatch({ supabase, matchId, winnerId });

    return NextResponse.json({ status: 'advanced' });
  } catch (err) {
    console.error('[Tournament Advance] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
