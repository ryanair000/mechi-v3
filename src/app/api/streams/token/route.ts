import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import { signMuxPlaybackToken } from '@/lib/mux';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) {
    return access.response;
  }

  const playbackId = request.nextUrl.searchParams.get('playback_id')?.trim() ?? '';
  if (!playbackId) {
    return NextResponse.json({ error: 'playback_id is required' }, { status: 400 });
  }

  try {
    const token = await signMuxPlaybackToken(playbackId);
    return NextResponse.json({ token });
  } catch (error) {
    console.error('[Streams Token] Error:', error);
    return NextResponse.json({ error: 'Could not create playback token' }, { status: 500 });
  }
}
