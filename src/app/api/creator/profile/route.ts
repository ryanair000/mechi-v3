import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import { safeCreatorSlug } from '@/lib/dashboard';
import { createServiceClient } from '@/lib/supabase';

const CREATOR_TYPES = new Set(['streamer', 'commentator', 'video_creator', 'coach']);
const AVAILABILITY = new Set(['available', 'limited', 'unavailable']);
const PLATFORM_KEYS = new Set(['youtube', 'twitch', 'tiktok', 'instagram', 'facebook', 'x']);

function isMissingCreatorSchema(error: { code?: string; message?: string } | null) {
  return error?.code === '42P01' || /creator_profiles/i.test(error?.message ?? '') && /not find|does not exist/i.test(error?.message ?? '');
}

function normalizeLinks(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([key, url]) => PLATFORM_KEYS.has(key) && typeof url === 'string')
      .map(([key, url]) => [key, String(url).trim().slice(0, 300)])
      .filter(([, url]) => !url || /^https?:\/\//i.test(url))
  );
}

async function uniqueSlug(base: string, userId: string) {
  const supabase = createServiceClient();
  const root = safeCreatorSlug(base);
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const candidate = attempt === 0 ? root : `${root}-${userId.slice(0, 4 + attempt)}`;
    const { data } = await supabase.from('creator_profiles').select('user_id').eq('slug', candidate).maybeSingle();
    if (!data || data.user_id === userId) return candidate;
  }
  return `${root}-${userId.slice(0, 8)}`;
}

async function getCreatorWorkspace(userId: string) {
  const supabase = createServiceClient();
  const { data: creator, error } = await supabase
    .from('creator_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) return { creator: null, error };
  if (!creator) return { creator: null, error: null };

  const [contentResult, coverageResult, streamsResult, hostedResult] = await Promise.all([
    supabase
      .from('creator_content')
      .select('*')
      .eq('creator_id', creator.id)
      .order('created_at', { ascending: false })
      .limit(12),
    supabase
      .from('creator_coverage_assignments')
      .select('*, tournament:tournament_id(id, slug, title, game, scheduled_for)')
      .eq('creator_id', creator.id)
      .order('scheduled_for', { ascending: true, nullsFirst: false })
      .limit(12),
    supabase
      .from('live_streams')
      .select('id, title, status, viewer_count, started_at, ended_at, created_at, tournament_id, match_id')
      .eq('streamer_id', userId)
      .order('created_at', { ascending: false })
      .limit(12),
    supabase
      .from('tournaments')
      .select('id, slug, title, game, status, scheduled_for, size, entry_fee, prize_pool')
      .eq('organizer_id', userId)
      .order('created_at', { ascending: false })
      .limit(10),
  ]);

  const content = contentResult.data ?? [];
  const streams = streamsResult.data ?? [];
  const totalViews = content.reduce((sum, item) => sum + Number(item.views ?? 0), 0);
  const peakLiveViewers = streams.reduce(
    (peak, stream) => Math.max(peak, Number(stream.viewer_count ?? 0)),
    0
  );

  return {
    creator,
    error: null,
    content,
    coverage: coverageResult.data ?? [],
    streams,
    tournaments: hostedResult.data ?? [],
    summary: {
      published_content: content.filter((item) => item.status === 'published').length,
      total_views: totalViews,
      peak_live_viewers: peakLiveViewers,
      upcoming_coverage: (coverageResult.data ?? []).filter((item) =>
        ['invited', 'accepted'].includes(String(item.status))
      ).length,
      active_tournaments: (hostedResult.data ?? []).filter((item) =>
        ['open', 'active'].includes(String(item.status))
      ).length,
    },
  };
}

export async function GET(request: NextRequest) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) return access.response;

  const workspace = await getCreatorWorkspace(access.profile.id);
  if (workspace.error) {
    if (isMissingCreatorSchema(workspace.error)) {
      return NextResponse.json({ creator: null, setup_required: true });
    }
    console.error('[Creator profile] GET failed', workspace.error);
    return NextResponse.json({ error: 'Could not load Creator Studio.' }, { status: 500 });
  }
  return NextResponse.json(workspace);
}

export async function POST(request: NextRequest) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) return access.response;

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const displayName = String(body.display_name ?? access.profile.username).trim().slice(0, 60);
    const bio = String(body.bio ?? '').trim().slice(0, 400);
    const requestedTypes = Array.isArray(body.creator_types) ? body.creator_types : ['streamer'];
    const creatorTypes = [...new Set(requestedTypes.map(String).filter((type) => CREATOR_TYPES.has(type)))];
    const games = Array.isArray(body.games)
      ? [...new Set(body.games.map(String).map((game) => game.trim()).filter(Boolean))].slice(0, 12)
      : [];

    if (displayName.length < 2 || creatorTypes.length === 0) {
      return NextResponse.json({ error: 'Add a display name and at least one creator focus.' }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { data: existing, error: lookupError } = await supabase
      .from('creator_profiles')
      .select('id')
      .eq('user_id', access.profile.id)
      .maybeSingle();
    if (lookupError) {
      const message = isMissingCreatorSchema(lookupError)
        ? 'Creator Studio database setup is pending.'
        : 'Could not activate Creator Studio.';
      return NextResponse.json({ error: message }, { status: 503 });
    }
    if (existing) return NextResponse.json({ error: 'Creator Studio is already active.' }, { status: 409 });

    const slug = await uniqueSlug(String(body.slug ?? displayName), access.profile.id);
    const { error } = await supabase.from('creator_profiles').insert({
      user_id: access.profile.id,
      slug,
      display_name: displayName,
      bio,
      creator_types: creatorTypes,
      games,
      platform_links: normalizeLinks(body.platform_links),
      status: 'active',
      availability: 'available',
    });
    if (error) {
      console.error('[Creator profile] POST failed', error);
      return NextResponse.json({ error: 'Could not activate Creator Studio.' }, { status: 500 });
    }

    return NextResponse.json(await getCreatorWorkspace(access.profile.id), { status: 201 });
  } catch (error) {
    console.error('[Creator profile] POST failed', error);
    return NextResponse.json({ error: 'Could not activate Creator Studio.' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) return access.response;

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (typeof body.display_name === 'string') updates.display_name = body.display_name.trim().slice(0, 60);
    if (typeof body.bio === 'string') updates.bio = body.bio.trim().slice(0, 400);
    if (typeof body.availability === 'string' && AVAILABILITY.has(body.availability)) updates.availability = body.availability;
    if (Array.isArray(body.creator_types)) {
      const values = [...new Set(body.creator_types.map(String).filter((type) => CREATOR_TYPES.has(type)))];
      if (values.length) updates.creator_types = values;
    }
    if (Array.isArray(body.games)) updates.games = [...new Set(body.games.map(String).filter(Boolean))].slice(0, 12);
    if (body.platform_links !== undefined) updates.platform_links = normalizeLinks(body.platform_links);

    const supabase = createServiceClient();
    const { error } = await supabase.from('creator_profiles').update(updates).eq('user_id', access.profile.id);
    if (error) return NextResponse.json({ error: 'Could not save your creator profile.' }, { status: 500 });
    return NextResponse.json(await getCreatorWorkspace(access.profile.id));
  } catch {
    return NextResponse.json({ error: 'Could not save your creator profile.' }, { status: 500 });
  }
}
