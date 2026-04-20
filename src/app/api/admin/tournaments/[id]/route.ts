import { NextRequest, NextResponse } from 'next/server';
import { getRequestAccessProfile, hasAdminAccess, hasModeratorAccess } from '@/lib/access';
import { writeAuditLog } from '@/lib/audit';
import { isTournamentSize } from '@/lib/bracket';
import { GAMES, getCanonicalGameKey, isValidGamePlatform } from '@/lib/config';
import { getClientIp } from '@/lib/rateLimit';
import { createServiceClient } from '@/lib/supabase';
import {
  ACTIVE_TOURNAMENT_PLAYER_STATUSES,
  getTournamentPaymentMetrics,
  getTournamentPrizeSnapshot,
  isTournamentReviewSchemaMissing,
  mapTournamentMatchRelations,
  withTournamentReviewDefaults,
} from '@/lib/tournaments';
import type { GameKey, PlatformKey, TournamentApprovalStatus, TournamentPaymentStatus } from '@/types';

const ADMIN_TOURNAMENT_DETAIL_SELECT =
  'id, slug, title, game, platform, region, size, entry_fee, prize_pool, platform_fee, platform_fee_rate, status, bracket, winner_id, organizer_id, rules, approval_status, approved_at, approved_by, is_featured, payout_status, payout_ref, payout_error, created_at, started_at, ended_at, organizer:organizer_id(id, username, email), winner:winner_id(id, username)';
const ADMIN_TOURNAMENT_DETAIL_LEGACY_SELECT =
  'id, slug, title, game, platform, region, size, entry_fee, prize_pool, platform_fee, platform_fee_rate, status, bracket, winner_id, organizer_id, rules, payout_status, payout_ref, payout_error, created_at, started_at, ended_at, organizer:organizer_id(id, username, email), winner:winner_id(id, username)';
const ADMIN_TOURNAMENT_SUMMARY_SELECT =
  'id, title, slug, game, platform, region, size, entry_fee, prize_pool, platform_fee, platform_fee_rate, status, winner_id, rules, approval_status, approved_at, approved_by, is_featured';
const ADMIN_TOURNAMENT_SUMMARY_LEGACY_SELECT =
  'id, title, slug, game, platform, region, size, entry_fee, prize_pool, platform_fee, platform_fee_rate, status, winner_id, rules';
const REVIEW_CONTROLS_UNAVAILABLE_MESSAGE =
  'Tournament review controls are unavailable until the latest database migration is applied.';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getRequestAccessProfile(request);
  if (!admin || !hasModeratorAccess(admin) || admin.is_banned) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;

  try {
    const supabase = createServiceClient();
    let supportsReviewControls = true;
    let tournamentResult = await supabase
      .from('tournaments')
      .select(ADMIN_TOURNAMENT_DETAIL_SELECT)
      .eq('id', id)
      .single();

    if (isTournamentReviewSchemaMissing(tournamentResult.error)) {
      supportsReviewControls = false;
      tournamentResult = await supabase
        .from('tournaments')
        .select(ADMIN_TOURNAMENT_DETAIL_LEGACY_SELECT)
        .eq('id', id)
        .single();
    }

    const { data: tournamentRaw, error: tournamentError } = tournamentResult;

    if (tournamentError || !tournamentRaw) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }

    const tournament = withTournamentReviewDefaults(
      tournamentRaw as unknown as Record<string, unknown> & {
        entry_fee?: number | null;
        platform_fee?: number | null;
        platform_fee_rate?: number | null;
        prize_pool?: number | null;
      },
      supportsReviewControls
    );

    const [playersResult, bracketMatchesResult, liveMatchesResult] = await Promise.all([
      supabase
        .from('tournament_players')
        .select('*, user:user_id(id, username, email, phone)')
        .eq('tournament_id', id)
        .order('joined_at', { ascending: true }),
      supabase
        .from('tournament_matches')
        .select('*, player1:player1_id(id, username), player2:player2_id(id, username), winner:winner_id(id, username), match:match_id(id, status, player1_score, player2_score)')
        .eq('tournament_id', id)
        .order('round', { ascending: true })
        .order('slot', { ascending: true }),
      supabase
        .from('matches')
        .select('id, game, status, winner_id, player1_score, player2_score, created_at, completed_at, player1:player1_id(id, username), player2:player2_id(id, username)')
        .eq('tournament_id', id)
        .order('created_at', { ascending: false }),
    ]);

    if (playersResult.error || bracketMatchesResult.error || liveMatchesResult.error) {
      return NextResponse.json({ error: 'Failed to load tournament detail' }, { status: 500 });
    }

    const paymentBreakdown = ((playersResult.data ?? []) as Array<{ payment_status: TournamentPaymentStatus }>)
      .reduce<Record<TournamentPaymentStatus, number>>(
        (counts, player) => {
          counts[player.payment_status] = (counts[player.payment_status] ?? 0) + 1;
          return counts;
        },
        {
          pending: 0,
          paid: 0,
          free: 0,
          failed: 0,
          refunded: 0,
        }
      );

    const prize = getTournamentPrizeSnapshot({
      entryFee: Number(tournament.entry_fee ?? 0),
      paidPlayerCount: paymentBreakdown.paid ?? 0,
      feeRate: Number(tournament.platform_fee_rate ?? 5),
      storedPrizePool: Number(tournament.prize_pool ?? 0),
      storedPlatformFee: Number(tournament.platform_fee ?? 0),
    });

    return NextResponse.json({
      tournament: {
        ...tournament,
        prize_pool: prize.prizePool,
        platform_fee: prize.platformFee,
        confirmed_count: (paymentBreakdown.paid ?? 0) + (paymentBreakdown.free ?? 0),
        paid_count: paymentBreakdown.paid ?? 0,
      },
      players: playersResult.data ?? [],
      bracketMatches: (bracketMatchesResult.data ?? []).map(mapTournamentMatchRelations),
      liveMatches: liveMatchesResult.data ?? [],
      paymentBreakdown,
      supportsReviewControls,
    });
  } catch (err) {
    console.error('[Admin Tournament GET] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getRequestAccessProfile(request);
  if (!admin || !hasModeratorAccess(admin) || admin.is_banned) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;

  try {
    const body = (await request.json()) as {
      action?: string;
      winner_id?: string;
      reason?: string;
      approval_status?: TournamentApprovalStatus;
      is_featured?: boolean;
      title?: string;
      game?: string;
      platform?: PlatformKey | '' | null;
      region?: string;
      size?: number;
      entry_fee?: number;
      rules?: string | null;
    };
    const supabase = createServiceClient();

    let supportsReviewControls = true;
    let tournamentResult = await supabase
      .from('tournaments')
      .select(ADMIN_TOURNAMENT_SUMMARY_SELECT)
      .eq('id', id)
      .single();

    if (isTournamentReviewSchemaMissing(tournamentResult.error)) {
      supportsReviewControls = false;
      tournamentResult = await supabase
        .from('tournaments')
        .select(ADMIN_TOURNAMENT_SUMMARY_LEGACY_SELECT)
        .eq('id', id)
        .single();
    }

    const { data: tournamentRaw, error: tournamentError } = tournamentResult;

    if (tournamentError || !tournamentRaw) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }

    const tournament = withTournamentReviewDefaults(
      tournamentRaw as unknown as Record<string, unknown> & {
        title: string;
        slug: string;
        game: string;
        platform?: PlatformKey | null;
        region: string;
        size: number;
        entry_fee: number;
        prize_pool?: number | null;
        platform_fee?: number | null;
        platform_fee_rate?: number | null;
        status: string;
        winner_id?: string | null;
        rules?: string | null;
      },
      supportsReviewControls
    );

    if (body.action === 'cancel') {
      if (!hasAdminAccess(admin)) {
        return NextResponse.json({ error: 'Only admins can cancel tournaments' }, { status: 403 });
      }

      const { error } = await supabase
        .from('tournaments')
        .update({ status: 'cancelled' })
        .eq('id', id);

      if (error) return NextResponse.json({ error: 'Failed to cancel tournament' }, { status: 500 });

      await writeAuditLog({
        adminId: admin.id,
        action: 'cancel_tournament',
        targetType: 'tournament',
        targetId: id,
        details: { title: tournament.title, previousStatus: tournament.status, reason: body.reason ?? null },
        ipAddress: getClientIp(request),
      });

      return NextResponse.json({ success: true });
    }

    if (body.action === 'set_approval') {
      if (!hasAdminAccess(admin)) {
        return NextResponse.json({ error: 'Only admins can review tournaments' }, { status: 403 });
      }
      if (!supportsReviewControls) {
        return NextResponse.json(
          { error: REVIEW_CONTROLS_UNAVAILABLE_MESSAGE },
          { status: 409 }
        );
      }

      const approvalStatus = body.approval_status;
      if (!approvalStatus || !['pending', 'approved', 'rejected'].includes(approvalStatus)) {
        return NextResponse.json({ error: 'approval_status is required' }, { status: 400 });
      }

      const approvedAt = approvalStatus === 'approved' ? new Date().toISOString() : null;
      const approvedBy = approvalStatus === 'approved' ? admin.id : null;
      const shouldKeepFeatured = approvalStatus === 'approved' ? tournament.is_featured : false;

      const { error } = await supabase
        .from('tournaments')
        .update({
          approval_status: approvalStatus,
          approved_at: approvedAt,
          approved_by: approvedBy,
          is_featured: shouldKeepFeatured,
        })
        .eq('id', id);

      if (error) return NextResponse.json({ error: 'Failed to update tournament review' }, { status: 500 });

      await writeAuditLog({
        adminId: admin.id,
        action: 'review_tournament',
        targetType: 'tournament',
        targetId: id,
        details: {
          title: tournament.title,
          previousApprovalStatus: tournament.approval_status,
          nextApprovalStatus: approvalStatus,
          featuredRemoved: tournament.is_featured && !shouldKeepFeatured,
          reason: body.reason ?? null,
        },
        ipAddress: getClientIp(request),
      });

      return NextResponse.json({ success: true });
    }

    if (body.action === 'set_featured') {
      if (!hasAdminAccess(admin)) {
        return NextResponse.json({ error: 'Only admins can feature tournaments' }, { status: 403 });
      }
      if (!supportsReviewControls) {
        return NextResponse.json(
          { error: REVIEW_CONTROLS_UNAVAILABLE_MESSAGE },
          { status: 409 }
        );
      }

      const isFeatured = Boolean(body.is_featured);
      if (isFeatured && tournament.approval_status !== 'approved') {
        return NextResponse.json(
          { error: 'Approve the tournament before featuring it' },
          { status: 400 }
        );
      }

      const { error } = await supabase
        .from('tournaments')
        .update({ is_featured: isFeatured })
        .eq('id', id);

      if (error) {
        return NextResponse.json({ error: 'Failed to update featured status' }, { status: 500 });
      }

      await writeAuditLog({
        adminId: admin.id,
        action: isFeatured ? 'feature_tournament' : 'unfeature_tournament',
        targetType: 'tournament',
        targetId: id,
        details: {
          title: tournament.title,
          previousFeatured: tournament.is_featured,
          nextFeatured: isFeatured,
          reason: body.reason ?? null,
        },
        ipAddress: getClientIp(request),
      });

      return NextResponse.json({ success: true });
    }

    if (body.action === 'update_details') {
      if (!hasAdminAccess(admin)) {
        return NextResponse.json({ error: 'Only admins can edit tournaments' }, { status: 403 });
      }

      const { data: editablePlayers, error: playerError } = await supabase
        .from('tournament_players')
        .select('payment_status')
        .eq('tournament_id', id)
        .in('payment_status', [...ACTIVE_TOURNAMENT_PLAYER_STATUSES]);

      if (playerError) {
        return NextResponse.json({ error: 'Failed to inspect tournament players' }, { status: 500 });
      }

      const { activeCount, paidCount } = getTournamentPaymentMetrics(
        ((editablePlayers ?? []) as Array<{ payment_status: string | null | undefined }>).map((player) => ({
          payment_status: player.payment_status,
        }))
      );

      const canEditStructure = tournament.status === 'open' && activeCount <= 1 && paidCount === 0;
      const title = String(body.title ?? tournament.title).trim();
      const region = String(body.region ?? tournament.region).trim();
      const rules =
        body.rules === null
          ? null
          : typeof body.rules === 'string'
            ? body.rules.trim() || null
            : tournament.rules ?? null;

      if (title.length < 3) {
        return NextResponse.json({ error: 'Tournament title is too short' }, { status: 400 });
      }

      if (!region) {
        return NextResponse.json({ error: 'Region is required' }, { status: 400 });
      }

      const requestedGame = String(body.game ?? tournament.game) as GameKey;
      const game = GAMES[requestedGame] ? getCanonicalGameKey(requestedGame) : requestedGame;
      const gameConfig = GAMES[game as GameKey];
      if (!gameConfig || gameConfig.mode !== '1v1') {
        return NextResponse.json({ error: 'Pick a supported 1v1 game' }, { status: 400 });
      }

      const platformInput =
        body.platform === '' || body.platform === undefined
          ? tournament.platform ?? null
          : body.platform;
      const platform = platformInput ? (String(platformInput) as PlatformKey) : null;
      if (!platform || !isValidGamePlatform(game as GameKey, platform)) {
        return NextResponse.json({ error: 'Pick a valid platform for this game' }, { status: 400 });
      }

      const size = Number(body.size ?? tournament.size);
      if (!isTournamentSize(size)) {
        return NextResponse.json({ error: 'Tournament size must be 4, 8, or 16' }, { status: 400 });
      }

      const entryFee = Math.max(0, Math.round(Number(body.entry_fee ?? tournament.entry_fee)));
      const structureChanged =
        game !== tournament.game ||
        platform !== (tournament.platform ?? null) ||
        size !== tournament.size ||
        entryFee !== tournament.entry_fee;

      if (structureChanged && !canEditStructure) {
        return NextResponse.json(
          {
            error:
              'Game, platform, size, and entry fee lock once other players join or payments start.',
          },
          { status: 400 }
        );
      }

      if (size < activeCount) {
        return NextResponse.json(
          { error: 'Tournament size cannot be smaller than the players already holding slots' },
          { status: 400 }
        );
      }

      const updatePayload: Record<string, unknown> = {
        title,
        region,
        rules,
      };

      if (structureChanged || canEditStructure) {
        updatePayload.game = game;
        updatePayload.platform = platform;
        updatePayload.size = size;
        updatePayload.entry_fee = entryFee;
        if (entryFee <= 0) {
          updatePayload.prize_pool = 0;
          updatePayload.platform_fee = 0;
        }
      }

      const { error } = await supabase.from('tournaments').update(updatePayload).eq('id', id);
      if (error) {
        return NextResponse.json({ error: 'Failed to update tournament' }, { status: 500 });
      }

      await writeAuditLog({
        adminId: admin.id,
        action: 'update_tournament_details',
        targetType: 'tournament',
        targetId: id,
        details: {
          title: tournament.title,
          previous: {
            title: tournament.title,
            game: tournament.game,
            platform: tournament.platform,
            region: tournament.region,
            size: tournament.size,
            entry_fee: tournament.entry_fee,
            rules: tournament.rules,
          },
          next: {
            title,
            game,
            platform,
            region,
            size,
            entry_fee: entryFee,
            rules,
          },
          reason: body.reason ?? null,
        },
        ipAddress: getClientIp(request),
      });

      return NextResponse.json({ success: true });
    }

    if (body.action === 'override_winner') {
      if (!hasAdminAccess(admin)) {
        return NextResponse.json(
          { error: 'Only admins can override tournament winners' },
          { status: 403 }
        );
      }

      if (!body.winner_id) {
        return NextResponse.json({ error: 'winner_id is required' }, { status: 400 });
      }

      const { error } = await supabase
        .from('tournaments')
        .update({
          status: 'completed',
          winner_id: body.winner_id,
          ended_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) return NextResponse.json({ error: 'Failed to update tournament' }, { status: 500 });

      await writeAuditLog({
        adminId: admin.id,
        action: 'override_tournament_winner',
        targetType: 'tournament',
        targetId: id,
        details: {
          title: tournament.title,
          previousStatus: tournament.status,
          previousWinner: tournament.winner_id,
          newWinner: body.winner_id,
          reason: body.reason ?? null,
        },
        ipAddress: getClientIp(request),
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    console.error('[Admin Tournament PATCH] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
