import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import { createServiceClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) {
    return access.response;
  }

  const authUser = access.profile;

  try {
    const supabase = createServiceClient();

    const { data: suggestions, error } = await supabase
      .from('suggestions')
      .select('*')
      .order('votes', { ascending: false })
      .limit(50);

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch suggestions' }, { status: 500 });
    }

    // Check which ones the user has voted for
    const { data: userVotes } = await supabase
      .from('suggestion_votes')
      .select('suggestion_id')
      .eq('user_id', authUser.id);

    const votedIds = new Set((userVotes ?? []).map((v: { suggestion_id: string }) => v.suggestion_id));

    const enriched = (suggestions ?? []).map((s: Record<string, unknown>) => ({
      ...s,
      user_voted: votedIds.has(s.id as string),
    }));

    return NextResponse.json({ suggestions: enriched });
  } catch (err) {
    console.error('[Suggestions GET] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) {
    return access.response;
  }

  const authUser = access.profile;

  try {
    const body = await request.json();
    const { game_name, description } = body;

    if (!game_name?.trim() || !description?.trim()) {
      return NextResponse.json({ error: 'Game name and description are required' }, { status: 400 });
    }

    const supabase = createServiceClient();

    const { data: suggestion, error } = await supabase
      .from('suggestions')
      .insert({
        user_id: authUser.id,
        game_name: game_name.trim(),
        description: description.trim(),
        votes: 0,
        status: 'pending',
      })
      .select()
      .single();

    if (error || !suggestion) {
      return NextResponse.json({ error: 'Failed to create suggestion' }, { status: 500 });
    }

    return NextResponse.json({ suggestion }, { status: 201 });
  } catch (err) {
    console.error('[Suggestions POST] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
