import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import { hasPrimaryAdminAccess } from '@/lib/admin-access';
import { resolvePlan } from '@/lib/subscription';
import { createServiceClient } from '@/lib/supabase';
import {
  firstRelation,
  getTournamentPaymentMetrics,
  getTournamentPrizeSnapshot,
  isActiveTournamentPlayerStatus,
  releaseExpiredTournamentReservations,
} from '@/lib/tournaments';
import type { LiveStream } from '@/types';

const TOURNAMENT_DETAIL_SELECT =
  'id, slug, title, game, platform, region, size, entry_fee, prize_pool, platform_fee, platform_fee_rate, status, winner_id, organizer_id, rules, approval_status, approved_at, approved_by, is_featured, payout_status, created_at, started_at, ended_at, organizer:organizer_id(id, username), winner:winner_id(id, username)';
const TOURNAMENT_PLAYER_SELECT =
  'id, tournament_id, user_id, seed, payment_status, joined_at, user:user_id(id, username)';
const TOURNAMENT_MATCH_SELECT =
  'id, tournament_id, match_id, round, slot, player1_id, player2_id, winner_id, status, created_at, player1:player1_id(id, username), player2:player2_id(id, username), winner:winner_id(id, username), match:match_id(id, status, player1_score, player2_score)';
const TOURNAMENT_STREAM_SELECT =
  'id, tournament_id, match_id, streamer_id, mux_stream_id, mux_playback_id, status, title, viewer_count, started_at, ended_at, recording_playback_id, created_at, updated_at, streamer:streamer_id(id, username)';

type TournamentMatchProfileRelation =
  | { id: string; username: string }
  | Array<{ id: string; username: string }>
  | null
  | undefined;

type TournamentMatchGameRelation =
  | {
      id: string;
      status: string;
      player1_score: number | null;
      player2_score: number | null;
    }
  | Array<{
      id: string;
      status: string;
      player1_score: number | null;
      player2_score: number | null;
    }>
  | null
  | undefined;

type TournamentStreamRelation =
  | {
      id: string;
      username: string;
    }
  | Array<{
      id: string;
      username: string;
    }>
  | null
  | undefined;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const access = await requireActiveAccessProfile(request);
  if (access.response) {
    return access.response;
  }

  const authUser = access.profile;

  try {
    const supabase = createServiceClient();
    const { data: tournamentBySlug, error } = await supabase
      .from('tournaments')
      .select(TOURNAMENT_DETAIL_SELECT)
      .eq('slug', slug)
      .single();

    if (error || !tournamentBySlug) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }

    await releaseExpiredTournamentReservations(supabase, tournamentBySlug.id);

    const { data: refreshedTournament } = await supabase
      .from('tournaments')
      .select(TOURNAMENT_DETAIL_SELECT)
      .eq('id', tournamentBySlug.id)
      .single();

    const tournament = (refreshedTournament ?? tournamentBySlug) as typeof tournamentBySlug;

    const { data: players } = await supabase
      .from('tournament_players')
      .select(TOURNAMENT_PLAYER_SELECT)
      .eq('tournament_id', tournament.id)
      .order('joined_at', { ascending: true });

    const { data: matches } = await supabase
      .from('tournament_matches')
      .select(TOURNAMENT_MATCH_SELECT)
      .eq('tournament_id', tournament.id)
      .order('round', { ascending: true })
      .order('slot', { ascending: true });

    const playerRows = (players ?? []).filter((player) =>
      isActiveTournamentPlayerStatus(player.payment_status as string | null | undefined)
    );
    const { data: viewerProfileRaw } = await supabase
      .from('profiles')
      .select('plan, plan_expires_at, phone, role')
      .eq('id', authUser.id)
      .maybeSingle();
    const viewerProfile = viewerProfileRaw as {
      plan?: string | null;
      plan_expires_at?: string | null;
      phone?: string | null;
      role?: 'user' | 'moderator' | 'admin' | null;
    } | null;

    const { data: liveStreamRaw } = await supabase
      .from('live_streams')
      .select(TOURNAMENT_STREAM_SELECT)
      .eq('tournament_id', tournament.id)
      .in('status', ['idle', 'active'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: vodStreamRaw } = liveStreamRaw
      ? { data: null }
      : await supabase
          .from('live_streams')
          .select(TOURNAMENT_STREAM_SELECT)
          .eq('tournament_id', tournament.id)
          .eq('status', 'ended')
          .not('recording_playback_id', 'is', null)
          .order('ended_at', { ascending: false })
          .limit(1)
          .maybeSingle();

    const streamRaw = (liveStreamRaw ?? vodStreamRaw) as
      | (LiveStream & {
          streamer?: TournamentStreamRelation;
        })
      | null;
    const { activeCount, confirmedCount, paidCount } = getTournamentPaymentMetrics(playerRows);
    const prize = getTournamentPrizeSnapshot({
      entryFee: tournament.entry_fee,
      paidPlayerCount: paidCount,
      feeRate: tournament.platform_fee_rate,
      storedPrizePool: tournament.prize_pool,
      storedPlatformFee: tournament.platform_fee,
    });
    const viewerPlayer = playerRows.find((player) => player.user_id === authUser.id) ?? null;
    const resolvedPlan = resolvePlan(viewerProfile?.plan, viewerProfile?.plan_expires_at);
    const isPrimaryAdmin = hasPrimaryAdminAccess({
      phone: viewerProfile?.phone ?? authUser.phone,
      role: viewerProfile?.role ?? authUser.role,
    });
    const normalizedStream = streamRaw
      ? {
          ...streamRaw,
          streamer: firstRelation(streamRaw.streamer as TournamentStreamRelation),
        }
      : null;
    const canCreateStream =
      tournament.status === 'active' &&
      (isPrimaryAdmin ||
        (resolvedPlan === 'elite' && (authUser.id === tournament.organizer_id || Boolean(viewerPlayer))));
    const canManageStream =
      Boolean(normalizedStream) &&
      (isPrimaryAdmin || normalizedStream?.streamer_id === authUser.id);

    return NextResponse.json({
      tournament: {
        ...tournament,
        prize_pool: prize.prizePool,
        platform_fee: prize.platformFee,
        confirmed_count: confirmedCount,
        slots_left: Math.max(0, tournament.size - activeCount),
      },
      players: playerRows,
      matches: ((matches ?? []) as Array<Record<string, unknown>>).map((match) => ({
        ...match,
        player1: firstRelation(match.player1 as TournamentMatchProfileRelation),
        player2: firstRelation(match.player2 as TournamentMatchProfileRelation),
        winner: firstRelation(match.winner as TournamentMatchProfileRelation),
        match: firstRelation(match.match as TournamentMatchGameRelation),
      })),
      viewer: {
        joined: Boolean(viewerPlayer),
        isOrganizer: authUser.id === tournament.organizer_id,
        paymentStatus: viewerPlayer?.payment_status ?? null,
        plan: resolvedPlan,
        isPrimaryAdmin,
        canCreateStream,
        canManageStream,
      },
      stream: normalizedStream,
    });
  } catch (err) {
    console.error('[Tournament GET] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
