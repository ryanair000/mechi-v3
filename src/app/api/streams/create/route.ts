import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import { hasPrimaryAdminAccess } from '@/lib/admin-access';
import { isActiveTournamentPlayerStatus } from '@/lib/tournaments';
import { resolvePlan } from '@/lib/subscription';
import { createServiceClient } from '@/lib/supabase';
import { getMuxPlaybackId } from '@/lib/live-streams';
import { createMuxClient, MUX_RTMPS_URL } from '@/lib/mux';

export const runtime = 'nodejs';

type StreamCreateBody = {
  tournament_id?: string | null;
  match_id?: string | null;
  title?: string | null;
};

type StreamAccessProfile = {
  id: string;
  username: string;
  phone: string | null;
  role: 'user' | 'moderator' | 'admin';
  plan: string | null;
  plan_expires_at: string | null;
};

async function isTournamentParticipant(
  supabase: ReturnType<typeof createServiceClient>,
  tournamentId: string,
  userId: string
) {
  const { data } = await supabase
    .from('tournament_players')
    .select('payment_status')
    .eq('tournament_id', tournamentId)
    .eq('user_id', userId)
    .maybeSingle();

  return isActiveTournamentPlayerStatus(data?.payment_status as string | null | undefined);
}

export async function POST(request: NextRequest) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) {
    return access.response;
  }

  try {
    const body = (await request.json()) as StreamCreateBody;
    const title = String(body.title ?? '').trim();
    const requestedTournamentId = String(body.tournament_id ?? '').trim() || null;
    const requestedMatchId = String(body.match_id ?? '').trim() || null;

    if (!title) {
      return NextResponse.json({ error: 'Stream title is required' }, { status: 400 });
    }

    if (!requestedTournamentId && !requestedMatchId) {
      return NextResponse.json(
        { error: 'Choose a tournament or active match to stream' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();
    const { data: profileRaw, error: profileError } = await supabase
      .from('profiles')
      .select('id, username, phone, role, plan, plan_expires_at')
      .eq('id', access.profile.id)
      .single();

    const profile = profileRaw as StreamAccessProfile | null;
    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const isAdmin = hasPrimaryAdminAccess({
      phone: profile.phone,
      role: profile.role,
    });
    const resolvedPlan = resolvePlan(profile.plan, profile.plan_expires_at);

    if (!isAdmin && resolvedPlan !== 'elite') {
      return NextResponse.json(
        {
          error: 'Live streaming is available to Elite members.',
          required_plan: 'elite',
          upgrade_url: '/pricing',
        },
        { status: 403 }
      );
    }

    let tournamentId = requestedTournamentId;
    let streamAllowed = isAdmin;

    if (requestedMatchId) {
      const { data: matchRaw } = await supabase
        .from('matches')
        .select('id, tournament_id, player1_id, player2_id, status')
        .eq('id', requestedMatchId)
        .maybeSingle();

      const match = matchRaw as
        | {
            id: string;
            tournament_id: string | null;
            player1_id: string;
            player2_id: string;
            status: string;
          }
        | null;

      if (!match) {
        return NextResponse.json({ error: 'Match not found' }, { status: 404 });
      }

      if (match.status !== 'pending') {
        return NextResponse.json(
          { error: 'Only active matches can be streamed right now' },
          { status: 400 }
        );
      }

      if (match.tournament_id && tournamentId && tournamentId !== match.tournament_id) {
        return NextResponse.json(
          { error: 'The selected match does not belong to that tournament' },
          { status: 400 }
        );
      }

      tournamentId = match.tournament_id ?? tournamentId;

      if (!streamAllowed) {
        streamAllowed =
          match.player1_id === access.profile.id || match.player2_id === access.profile.id;
      }
    }

    let tournament: {
      id: string;
      status: string;
      organizer_id: string;
    } | null = null;

    if (tournamentId) {
      const { data: tournamentRaw } = await supabase
        .from('tournaments')
        .select('id, status, organizer_id')
        .eq('id', tournamentId)
        .maybeSingle();

      tournament = tournamentRaw as {
        id: string;
        status: string;
        organizer_id: string;
      } | null;

      if (!tournament) {
        return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
      }

      if (tournament.status !== 'active') {
        return NextResponse.json(
          { error: 'Only active tournaments can go live' },
          { status: 400 }
        );
      }

      if (!streamAllowed) {
        streamAllowed =
          tournament.organizer_id === access.profile.id ||
          (await isTournamentParticipant(supabase, tournament.id, access.profile.id));
      }
    }

    if (!streamAllowed) {
      return NextResponse.json(
        { error: 'You do not have access to create a stream for this target' },
        { status: 403 }
      );
    }

    if (tournamentId) {
      const { data: existingTournamentStream } = await supabase
        .from('live_streams')
        .select('id')
        .eq('tournament_id', tournamentId)
        .neq('status', 'ended')
        .limit(1)
        .maybeSingle();

      if (existingTournamentStream) {
        return NextResponse.json(
          { error: 'This tournament already has an active or queued stream' },
          { status: 409 }
        );
      }
    }

    if (requestedMatchId) {
      const { data: existingMatchStream } = await supabase
        .from('live_streams')
        .select('id')
        .eq('match_id', requestedMatchId)
        .neq('status', 'ended')
        .limit(1)
        .maybeSingle();

      if (existingMatchStream) {
        return NextResponse.json(
          { error: 'This match already has an active or queued stream' },
          { status: 409 }
        );
      }
    }

    const mux = createMuxClient();
    const muxStream = await mux.video.liveStreams.create({
      latency_mode: 'reduced',
      reconnect_window: 60,
      playback_policies: ['signed'],
      new_asset_settings: {
        playback_policies: ['signed'],
      },
    });

    const playbackId = getMuxPlaybackId(muxStream.playback_ids);
    if (!playbackId || !muxStream.stream_key) {
      return NextResponse.json(
        { error: 'Mux did not return a playback ID or stream key' },
        { status: 502 }
      );
    }

    const nowIso = new Date().toISOString();
    let stream: { id: string } | null = null;
    let insertError: { message?: string } | null = null;

    try {
      const insertResult = await supabase
        .from('live_streams')
        .insert({
          tournament_id: tournamentId,
          match_id: requestedMatchId,
          streamer_id: access.profile.id,
          mux_stream_id: muxStream.id,
          mux_playback_id: playbackId,
          status: 'idle',
          title,
          updated_at: nowIso,
        })
        .select('id')
        .single();

      stream = insertResult.data as { id: string } | null;
      insertError = insertResult.error;
    } catch (error) {
      insertError = error as { message?: string } | null;
    }

    if (insertError || !stream) {
      console.error('[Streams Create] Insert error:', insertError);
      await mux.video.liveStreams.disable(muxStream.id).catch((cleanupError) => {
        console.error('[Streams Create] Cleanup error:', cleanupError);
      });
      return NextResponse.json({ error: 'Could not save the live stream' }, { status: 500 });
    }

    return NextResponse.json(
      {
        stream_id: stream.id,
        rtmp_url: MUX_RTMPS_URL,
        stream_key: muxStream.stream_key,
        playback_id: playbackId,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[Streams Create] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
