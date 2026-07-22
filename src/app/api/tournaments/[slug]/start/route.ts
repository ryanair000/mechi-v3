import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import { createServiceClient } from '@/lib/supabase';
import { startTournament } from '@/lib/tournaments';

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
    const supabase = createServiceClient();
    const { data: tournament, error: tournamentError } = await supabase
      .from('tournaments')
      .select('id, organizer_id, entry_fee, prize_pool_mode, prize_pool, approval_status')
      .eq('slug', slug)
      .single();

    if (tournamentError || !tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }

    if (tournament.organizer_id !== authUser.id) {
      return NextResponse.json(
        { error: 'Only the organizer can start this tournament.' },
        { status: 403 }
      );
    }

    if (Number(tournament.entry_fee ?? 0) > 0 && tournament.approval_status !== 'approved') {
      return NextResponse.json(
        { error: 'Paid tournaments must be approved by Mechi before they can start.' },
        { status: 403 }
      );
    }

    if (
      Number(tournament.entry_fee ?? 0) === 0 &&
      (tournament.prize_pool_mode === 'specified' || Number(tournament.prize_pool ?? 0) > 0)
    ) {
      return NextResponse.json(
        { error: 'Free tournaments cannot include a cash prize or reward.' },
        { status: 400 }
      );
    }

    const started = await startTournament({
      supabase,
      tournamentId: tournament.id,
      requesterId: authUser.id,
    });

    if (!started.success) {
      return NextResponse.json({ error: started.error }, { status: 400 });
    }

    return NextResponse.json({ status: 'active' });
  } catch (err) {
    console.error('[Tournament Start] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
