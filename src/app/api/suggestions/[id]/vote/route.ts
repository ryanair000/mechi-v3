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

    // Check suggestion exists
    const { data: suggestion } = await supabase
      .from('suggestions')
      .select('id, votes')
      .eq('id', id)
      .single();

    if (!suggestion) {
      return NextResponse.json({ error: 'Suggestion not found' }, { status: 404 });
    }

    // Check if already voted
    const { data: existingVote } = await supabase
      .from('suggestion_votes')
      .select('id')
      .eq('suggestion_id', id)
      .eq('user_id', authUser.id)
      .single();

    if (existingVote) {
      // Toggle: remove vote
      await supabase
        .from('suggestion_votes')
        .delete()
        .eq('suggestion_id', id)
        .eq('user_id', authUser.id);

      const newVotes = Math.max(0, suggestion.votes - 1);
      await supabase.from('suggestions').update({ votes: newVotes }).eq('id', id);

      return NextResponse.json({ voted: false, votes: newVotes });
    }

    // Add vote
    await supabase.from('suggestion_votes').insert({
      suggestion_id: id,
      user_id: authUser.id,
    });

    const newVotes = suggestion.votes + 1;
    await supabase.from('suggestions').update({ votes: newVotes }).eq('id', id);

    return NextResponse.json({ voted: true, votes: newVotes });
  } catch (err) {
    console.error('[Suggestion Vote] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
