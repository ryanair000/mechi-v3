import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import { createServiceClient } from '@/lib/supabase';

const CONTENT_TYPES = new Set(['clip', 'video', 'stream', 'post']);
const PLATFORMS = new Set(['youtube', 'twitch', 'tiktok', 'instagram', 'facebook', 'x', 'other']);

export async function POST(request: NextRequest) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) return access.response;

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const title = String(body.title ?? '').trim().slice(0, 120);
    const externalUrl = String(body.external_url ?? '').trim().slice(0, 500);
    const contentType = CONTENT_TYPES.has(String(body.content_type)) ? String(body.content_type) : 'video';
    const platform = PLATFORMS.has(String(body.platform)) ? String(body.platform) : 'other';

    if (title.length < 2 || !/^https?:\/\//i.test(externalUrl)) {
      return NextResponse.json({ error: 'Add a title and a valid public content link.' }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { data: creator, error: creatorError } = await supabase
      .from('creator_profiles')
      .select('id')
      .eq('user_id', access.profile.id)
      .single();
    if (creatorError || !creator) return NextResponse.json({ error: 'Activate Creator Studio first.' }, { status: 403 });

    const { data, error } = await supabase
      .from('creator_content')
      .insert({
        creator_id: creator.id,
        title,
        external_url: externalUrl,
        content_type: contentType,
        platform,
        status: 'published',
        published_at: new Date().toISOString(),
      })
      .select('*')
      .single();
    if (error) return NextResponse.json({ error: 'Could not add this content.' }, { status: 500 });
    return NextResponse.json({ content: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Could not add this content.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) return access.response;
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Content id is required.' }, { status: 400 });

  const supabase = createServiceClient();
  const { data: creator } = await supabase.from('creator_profiles').select('id').eq('user_id', access.profile.id).maybeSingle();
  if (!creator) return NextResponse.json({ error: 'Creator profile not found.' }, { status: 404 });
  const { error } = await supabase.from('creator_content').delete().eq('id', id).eq('creator_id', creator.id);
  if (error) return NextResponse.json({ error: 'Could not remove this content.' }, { status: 500 });
  return NextResponse.json({ success: true });
}
