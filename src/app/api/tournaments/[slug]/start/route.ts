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
    const { data: tournament } = await supabase
      .from('tournaments')
      .select('id')
      .eq('slug', slug)
      .single();

    if (!tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
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
