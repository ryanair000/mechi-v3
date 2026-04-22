import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import { hasPrimaryAdminAccess } from '@/lib/admin-access';
import { createMuxClient } from '@/lib/mux';
import { createServiceClient } from '@/lib/supabase';

export const runtime = 'nodejs';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) {
    return access.response;
  }

  const { id } = await params;

  try {
    const supabase = createServiceClient();
    const { data: streamRaw } = await supabase
      .from('live_streams')
      .select('id, streamer_id, mux_stream_id')
      .eq('id', id)
      .maybeSingle();

    const stream = streamRaw as
      | {
          id: string;
          streamer_id: string;
          mux_stream_id: string;
        }
      | null;

    if (!stream) {
      return NextResponse.json({ error: 'Stream not found' }, { status: 404 });
    }

    const isAdmin = hasPrimaryAdminAccess(access.profile);
    if (!isAdmin && stream.streamer_id !== access.profile.id) {
      return NextResponse.json(
        { error: 'Only the streamer or a primary admin can stop this stream' },
        { status: 403 }
      );
    }

    const mux = createMuxClient();
    await mux.video.liveStreams.disable(stream.mux_stream_id);

    await supabase
      .from('live_streams')
      .update({
        status: 'ended',
        ended_at: new Date().toISOString(),
        viewer_count: 0,
        updated_at: new Date().toISOString(),
      })
      .eq('id', stream.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Streams Delete] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
