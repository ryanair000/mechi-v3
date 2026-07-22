import type { SupabaseClient } from '@supabase/supabase-js';
import { tryClaimBounty } from '@/lib/bounties';
import { generateBracket, getNextBracketPosition, type TournamentSize } from '@/lib/bracket';
import { GAMES } from '@/lib/config';
import {
  CONFIRMED_PAYMENT_STATUSES,
  getTournamentPaymentMetrics,
  getTournamentPrizeSnapshot,
} from '@/lib/tournament-metrics';
import { formatTournamentDateTime, parseTournamentSchedule } from '@/lib/tournament-schedule';
import {
  sendTournamentFullEmail,
  sendTournamentMatchReadyEmail,
  sendTournamentWinnerEmail,
} from '@/lib/email';
import { createNotifications } from '@/lib/notifications';
import { sendTournamentRegistrationTelegramNotification } from '@/lib/telegram';
import type { PaymentVerificationEvidence } from '@/lib/payment-verification';
import type {
  GameKey,
  Match,
  PlatformKey,
  Tournament,
  TournamentMatch,
  TournamentPlayer,
} from '@/types';
export {
  ACTIVE_TOURNAMENT_PLAYER_STATUSES,
  CONFIRMED_PAYMENT_STATUSES,
  getTournamentPaymentMetrics,
  getTournamentPrize,
  getTournamentPrizeSnapshot,
  isActiveTournamentPlayerStatus,
  resolveTournamentPrizePoolMode,
} from '@/lib/tournament-metrics';

const TOURNAMENT_PAYMENT_HOLD_MINUTES = 15;

type ProfileLite = {
  id: string;
  username: string;
  email?: string | null;
  phone?: string | null;
};

type TournamentPlayerRow = TournamentPlayer & {
  user?: ProfileLite | ProfileLite[] | null;
};

type TournamentMatchRow = TournamentMatch & {
  player1?: ProfileLite | ProfileLite[] | null;
  player2?: ProfileLite | ProfileLite[] | null;
  match?:
    | Pick<Match, 'id' | 'status' | 'player1_score' | 'player2_score'>
    | Array<Pick<Match, 'id' | 'status' | 'player1_score' | 'player2_score'>>
    | null;
};

export function getAppUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXT_PUBLIC_BASE_URL ??
    'https://mechi.club'
  ).replace(/\/$/, '');
}

export function getTournamentUrl(slug: string): string {
  return `${getAppUrl()}/t/${slug}`;
}

export async function releaseExpiredTournamentReservations(
  supabase: SupabaseClient,
  tournamentId: string
): Promise<void> {
  const cutoff = new Date(
    Date.now() - TOURNAMENT_PAYMENT_HOLD_MINUTES * 60 * 1000
  ).toISOString();

  await supabase
    .from('tournament_players')
    .update({ payment_status: 'failed' })
    .eq('tournament_id', tournamentId)
    .eq('payment_status', 'pending')
    .lt('joined_at', cutoff);

  const { data: tournamentRaw } = await supabase
    .from('tournaments')
    .select('id, size, status')
    .eq('id', tournamentId)
    .single();

  const tournament = tournamentRaw as Pick<Tournament, 'id' | 'size' | 'status'> | null;
  if (!tournament || tournament.status !== 'full') {
    return;
  }

  const { count: confirmedCount } = await supabase
    .from('tournament_players')
    .select('id', { count: 'exact', head: true })
    .eq('tournament_id', tournamentId)
    .in('payment_status', [...CONFIRMED_PAYMENT_STATUSES]);

  if ((confirmedCount ?? 0) < tournament.size) {
    await supabase
      .from('tournaments')
      .update({ status: 'open' })
      .eq('id', tournamentId)
      .eq('status', 'full');
  }
}

export async function maybeMarkTournamentFull(
  supabase: SupabaseClient,
  tournamentId: string
): Promise<void> {
  const { data: tournament } = await supabase
    .from('tournaments')
    .select('id, slug, title, status, size, organizer:organizer_id(id, username, email)')
    .eq('id', tournamentId)
    .single();

  const row = tournament as
    | (Pick<Tournament, 'id' | 'slug' | 'title' | 'status' | 'size'> & {
        organizer?: ProfileLite | ProfileLite[] | null;
      })
    | null;

  if (!row || row.status !== 'open') return;

  const { count } = await supabase
    .from('tournament_players')
    .select('id', { count: 'exact', head: true })
    .eq('tournament_id', tournamentId)
    .in('payment_status', [...CONFIRMED_PAYMENT_STATUSES]);

  if ((count ?? 0) < row.size) return;

  const { error } = await supabase
    .from('tournaments')
    .update({ status: 'full' })
    .eq('id', tournamentId)
    .eq('status', 'open');

  if (error) return;

  const organizer = firstRelation(row.organizer);
  if (organizer?.email) {
    sendTournamentFullEmail({
      to: organizer.email,
      organizerName: organizer.username,
      tournamentTitle: row.title,
      tournamentUrl: getTournamentUrl(row.slug),
    }).catch(console.error);
  }
}

export async function markTournamentPaymentPaidByReference(
  supabase: SupabaseClient,
  reference: string,
  evidence?: PaymentVerificationEvidence | null
): Promise<{ success: boolean; tournamentId?: string; error?: string }> {
  const { data: playerRaw, error: playerError } = await supabase
    .from('tournament_players')
    .select('id, tournament_id, user_id, payment_status')
    .eq('payment_ref', reference)
    .maybeSingle();

  const player = playerRaw as
    | { id: string; tournament_id: string; user_id: string; payment_status: string }
    | null;

  if (playerError || !player) {
    return { success: false, error: 'Tournament payment record not found' };
  }

  if (player.payment_status === 'paid' || player.payment_status === 'free') {
    if (player.payment_status === 'paid' && evidence) {
      await supabase
        .from('tournament_players')
        .update({
          payment_provider_transaction_id: evidence.transactionId,
          payment_verified_at: evidence.verifiedAt,
          payment_currency: evidence.currency,
        })
        .eq('id', player.id)
        .is('payment_provider_transaction_id', null);
    }
    await maybeMarkTournamentFull(supabase, player.tournament_id);
    return { success: true, tournamentId: player.tournament_id };
  }

  const { error: updateError } = await supabase
    .from('tournament_players')
    .update({
      payment_status: 'paid',
      ...(evidence
        ? {
            payment_provider_transaction_id: evidence.transactionId,
            payment_verified_at: evidence.verifiedAt,
            payment_currency: evidence.currency,
          }
        : {}),
    })
    .eq('id', player.id)
    .in('payment_status', ['pending', 'failed']);

  if (updateError) {
    return { success: false, error: 'Could not confirm tournament payment' };
  }

  await maybeMarkTournamentFull(supabase, player.tournament_id);
  await sendTournamentPaymentConfirmedTelegramNotification(supabase, {
    tournamentId: player.tournament_id,
    userId: player.user_id,
    reference,
  });
  return { success: true, tournamentId: player.tournament_id };
}

async function sendTournamentPaymentConfirmedTelegramNotification(
  supabase: SupabaseClient,
  params: {
    tournamentId: string;
    userId: string;
    reference: string;
  }
) {
  try {
    const [tournamentResult, profileResult, countResult, confirmedResult] = await Promise.all([
      supabase
        .from('tournaments')
        .select('id, slug, title, game, platform, entry_fee, size')
        .eq('id', params.tournamentId)
        .maybeSingle(),
      supabase
        .from('profiles')
        .select('username, email, phone')
        .eq('id', params.userId)
        .maybeSingle(),
      supabase
        .from('tournament_players')
        .select('id', { count: 'exact', head: true })
        .eq('tournament_id', params.tournamentId),
      supabase
        .from('tournament_players')
        .select('id', { count: 'exact', head: true })
        .eq('tournament_id', params.tournamentId)
        .in('payment_status', [...CONFIRMED_PAYMENT_STATUSES]),
    ]);

    const tournament = tournamentResult.data as
      | Pick<Tournament, 'id' | 'slug' | 'title' | 'game' | 'platform' | 'entry_fee' | 'size'>
      | null;
    const profile = profileResult.data as
      | { username?: string | null; email?: string | null; phone?: string | null }
      | null;

    if (!tournament || !profile?.username) {
      return;
    }

    await sendTournamentRegistrationTelegramNotification({
      eventTitle: tournament.title,
      eventSlug: tournament.slug,
      username: profile.username,
      gameLabel: GAMES[tournament.game]?.label ?? tournament.game,
      platform: tournament.platform,
      email: profile.email,
      phone: profile.phone,
      paymentStatus: 'paid',
      paymentEvent: 'confirmed',
      paymentReference: params.reference,
      entryFeeKes: tournament.entry_fee,
      registered: countResult.count ?? null,
      confirmed: confirmedResult.count ?? null,
      slots: tournament.size,
      tournamentId: tournament.id,
    });
  } catch (error) {
    console.error('[TournamentPayment Telegram] Notification error:', error);
  }
}

export async function markTournamentPaymentFailedByReference(
  supabase: SupabaseClient,
  reference: string
): Promise<{ success: boolean; tournamentId?: string; error?: string }> {
  const { data: playerRaw, error: playerError } = await supabase
    .from('tournament_players')
    .select('id, tournament_id, payment_status')
    .eq('payment_ref', reference)
    .maybeSingle();

  const player = playerRaw as
    | { id: string; tournament_id: string; payment_status: string }
    | null;

  if (playerError || !player) {
    return { success: false, error: 'Tournament payment record not found' };
  }

  if (player.payment_status === 'paid' || player.payment_status === 'free') {
    return { success: true, tournamentId: player.tournament_id };
  }

  const { error: updateError } = await supabase
    .from('tournament_players')
    .update({ payment_status: 'failed' })
    .eq('id', player.id)
    .eq('payment_status', 'pending');

  if (updateError) {
    return { success: false, error: 'Could not mark tournament payment failed' };
  }

  return { success: true, tournamentId: player.tournament_id };
}

export async function startTournament(params: {
  supabase: SupabaseClient;
  tournamentId: string;
  requesterId: string;
}) {
  const { supabase, tournamentId, requesterId } = params;

  const { data: tournamentRaw, error: tournamentError } = await supabase
    .from('tournaments')
    .select('*')
    .eq('id', tournamentId)
    .single();

  const tournament = tournamentRaw as Tournament | null;
  if (tournamentError || !tournament) {
    return { success: false, error: 'Tournament not found' };
  }

  if (tournament.organizer_id !== requesterId) {
    return { success: false, error: 'Only the organizer can start this tournament' };
  }

  if (tournament.participant_type === 'team') {
    return {
      success: false,
      error: 'Team bracket operation is not enabled yet; entries remain safely locked.',
    };
  }

  if (tournament.status !== 'full') {
    return { success: false, error: 'Tournament must be full before it starts' };
  }

  const scheduledAt = parseTournamentSchedule(tournament.scheduled_for);
  if (scheduledAt && Date.now() < scheduledAt.getTime()) {
    return {
      success: false,
      error: `Tournament is scheduled for ${formatTournamentDateTime(scheduledAt, 'later', {
        day: 'numeric',
        month: 'short',
        hour: 'numeric',
        minute: '2-digit',
        timeZone: 'Africa/Nairobi',
      })}`,
    };
  }

  const { data: playersRaw, error: playersError } = await supabase
    .from('tournament_players')
    .select('*, user:user_id(id, username, email, phone)')
    .eq('tournament_id', tournamentId)
    .in('payment_status', [...CONFIRMED_PAYMENT_STATUSES])
    .order('joined_at', { ascending: true });

  const players = ((playersRaw ?? []) as TournamentPlayerRow[]).slice(0, tournament.size);
  if (playersError || players.length !== tournament.size) {
    return { success: false, error: 'Not enough confirmed players' };
  }

  const bracket = generateBracket(tournament.size as TournamentSize);
  const seededPlayers = players.map((player, index) => ({ ...player, seed: index + 1 }));

  for (const player of seededPlayers) {
    const { error } = await supabase
      .from('tournament_players')
      .update({ seed: player.seed })
      .eq('id', player.id);

    if (error) return { success: false, error: 'Could not seed players' };
  }

  const { paidCount } = getTournamentPaymentMetrics(players);
  const { prizePool, platformFee } = getTournamentPrizeSnapshot({
    entryFee: tournament.entry_fee,
    paidPlayerCount: paidCount,
    feeRate: tournament.platform_fee_rate,
    prizePoolMode: tournament.prize_pool_mode,
    storedPrizePool: tournament.prize_pool,
    storedPlatformFee: tournament.platform_fee,
  });

  const { error: updateError } = await supabase
    .from('tournaments')
    .update({
      status: 'active',
      bracket,
      prize_pool: prizePool,
      platform_fee: platformFee,
      started_at: new Date().toISOString(),
    })
    .eq('id', tournamentId);

  if (updateError) {
    return { success: false, error: 'Could not start tournament' };
  }

  for (const slot of bracket.slots) {
    const player1 = seededPlayers.find((player) => player.seed === slot.p1Seed);
    const player2 = seededPlayers.find((player) => player.seed === slot.p2Seed);

    const { data: tournamentMatchRaw, error: insertError } = await supabase
      .from('tournament_matches')
      .insert({
        tournament_id: tournamentId,
        round: slot.round,
        slot: slot.slot,
        player1_id: player1?.user_id ?? null,
        player2_id: player2?.user_id ?? null,
        status: slot.round === 1 ? 'ready' : 'pending',
      })
      .select('*')
      .single();

    const tournamentMatch = tournamentMatchRaw as TournamentMatch | null;
    if (insertError || !tournamentMatch) {
      return { success: false, error: 'Could not create bracket' };
    }

    if (slot.round === 1 && tournamentMatch.player1_id && tournamentMatch.player2_id) {
      const created = await createMatchForTournamentSlot({
        supabase,
        tournament: { ...tournament, status: 'active', prize_pool: prizePool },
        tournamentMatch,
      });

      if (!created.success) return created;
    }
  }

  await createNotifications(
    players.map((player) => ({
      user_id: player.user_id,
      type: 'tournament_started' as const,
      title: `${tournament.title} is live`,
      body: `Bracket locked. Your ${GAMES[tournament.game as GameKey]?.label ?? tournament.game} run has started.`,
      href: `/t/${tournament.slug}`,
      metadata: {
        tournament_id: tournament.id,
        slug: tournament.slug,
        game: tournament.game,
      },
    })),
    supabase
  );

  return { success: true };
}

export async function advanceTournamentAfterMatch(params: {
  supabase: SupabaseClient;
  matchId: string;
  winnerId: string;
}): Promise<void> {
  const { supabase, matchId, winnerId } = params;

  const { data: tournamentMatchRaw } = await supabase
    .from('tournament_matches')
    .select('*')
    .eq('match_id', matchId)
    .maybeSingle();

  const tournamentMatch = tournamentMatchRaw as TournamentMatch | null;
  if (!tournamentMatch || tournamentMatch.status === 'completed') return;

  const { data: tournamentRaw } = await supabase
    .from('tournaments')
    .select('*')
    .eq('id', tournamentMatch.tournament_id)
    .single();

  const tournament = tournamentRaw as Tournament | null;
  if (!tournament || tournament.status !== 'active') return;

  await supabase
    .from('tournament_matches')
    .update({
      winner_id: winnerId,
      status: 'completed',
    })
    .eq('id', tournamentMatch.id);

  void tryClaimBounty(supabase, winnerId, 'tournament_match_win').catch(() => null);

  const totalRounds = Math.log2(tournament.size);
  if (tournamentMatch.round >= totalRounds) {
    await completeTournament({ supabase, tournament, winnerId });
    return;
  }

  const next = getNextBracketPosition(tournamentMatch.round, tournamentMatch.slot);
  const { data: nextMatchRaw } = await supabase
    .from('tournament_matches')
    .update({ [next.side]: winnerId })
    .eq('tournament_id', tournament.id)
    .eq('round', next.round)
    .eq('slot', next.slot)
    .select('*')
    .single();

  const nextMatch = nextMatchRaw as TournamentMatch | null;
  if (!nextMatch?.player1_id || !nextMatch.player2_id || nextMatch.match_id) return;

  await createMatchForTournamentSlot({
    supabase,
    tournament,
    tournamentMatch: nextMatch,
  });
}

async function createMatchForTournamentSlot(params: {
  supabase: SupabaseClient;
  tournament: Tournament;
  tournamentMatch: TournamentMatch;
}) {
  const { supabase, tournament, tournamentMatch } = params;

  if (!tournamentMatch.player1_id || !tournamentMatch.player2_id) {
    return { success: false, error: 'Bracket match is not ready' };
  }

  const { data: match, error: matchError } = await supabase
    .from('matches')
    .insert({
      player1_id: tournamentMatch.player1_id,
      player2_id: tournamentMatch.player2_id,
      game: tournament.game,
      platform: tournament.platform,
      region: tournament.region,
      status: 'pending',
      tournament_id: tournament.id,
    })
    .select('id')
    .single();

  const createdMatch = match as { id: string } | null;
  if (matchError || !createdMatch) {
    return { success: false, error: 'Could not create match room' };
  }

  const { error: updateError } = await supabase
    .from('tournament_matches')
    .update({
      match_id: createdMatch.id,
      status: 'active',
    })
    .eq('id', tournamentMatch.id);

  if (updateError) {
    return { success: false, error: 'Could not link match room' };
  }

  await notifyTournamentMatchReady({
    supabase,
    tournament,
    player1Id: tournamentMatch.player1_id,
    player2Id: tournamentMatch.player2_id,
    matchId: createdMatch.id,
  });

  return { success: true };
}

async function completeTournament(params: {
  supabase: SupabaseClient;
  tournament: Tournament;
  winnerId: string;
}) {
  const { supabase, tournament, winnerId } = params;

  const { data: winnerRaw } = await supabase
    .from('profiles')
    .select('id, username, email, phone')
    .eq('id', winnerId)
    .single();

  const winner = winnerRaw as ProfileLite | null;
  // Tournament completion records eligibility; it never moves money. Prize
  // release requires a separate Mechi operations decision with recipient,
  // dispute, duplicate, and funding checks visible together.
  const payoutStatus: 'none' | 'pending' = tournament.prize_pool > 0 ? 'pending' : 'none';

  await supabase
    .from('tournaments')
    .update({
      status: 'completed',
      winner_id: winnerId,
      payout_status: payoutStatus,
      payout_ref: null,
      payout_error: tournament.prize_pool > 0 ? 'Awaiting Mechi payout eligibility review' : null,
      ended_at: new Date().toISOString(),
    })
    .eq('id', tournament.id);

  if (winner?.email) {
    sendTournamentWinnerEmail({
      to: winner.email,
      winnerName: winner.username,
      tournamentTitle: tournament.title,
      prizeAmount: tournament.prize_pool,
      tournamentUrl: getTournamentUrl(tournament.slug),
    }).catch(console.error);
  }
}

async function notifyTournamentMatchReady(params: {
  supabase: SupabaseClient;
  tournament: Tournament;
  player1Id: string;
  player2Id: string;
  matchId: string;
}) {
  const { supabase, tournament, player1Id, player2Id, matchId } = params;
  const { data: profilesRaw } = await supabase
    .from('profiles')
    .select('id, username, email')
    .in('id', [player1Id, player2Id]);

  const profiles = (profilesRaw ?? []) as ProfileLite[];
  const player1 = profiles.find((profile) => profile.id === player1Id);
  const player2 = profiles.find((profile) => profile.id === player2Id);
  const matchUrl = `${getAppUrl()}/match/${matchId}`;
  const gameLabel = GAMES[tournament.game as GameKey]?.label ?? tournament.game;

  if (player1?.email && player2) {
    sendTournamentMatchReadyEmail({
      to: player1.email,
      playerName: player1.username,
      opponentName: player2.username,
      tournamentTitle: tournament.title,
      game: gameLabel,
      matchUrl,
    }).catch(console.error);
  }

  if (player2?.email && player1) {
    sendTournamentMatchReadyEmail({
      to: player2.email,
      playerName: player2.username,
      opponentName: player1.username,
      tournamentTitle: tournament.title,
      game: gameLabel,
      matchUrl,
    }).catch(console.error);
  }

  await createNotifications(
    [player1, player2]
      .filter((profile): profile is ProfileLite => Boolean(profile))
      .map((profile) => {
        const opponent = profile.id === player1Id ? player2 : player1;
        return {
          user_id: profile.id,
          type: 'match_found' as const,
          title: `${tournament.title}: match ready`,
          body: `${opponent?.username ?? 'Your opponent'} is set for your ${gameLabel} bracket match.`,
          href: `/match/${matchId}`,
          metadata: {
            tournament_id: tournament.id,
            match_id: matchId,
            game: tournament.game,
            opponent_id: opponent?.id ?? null,
          },
        };
      }),
    supabase
  );
}

export function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export function mapTournamentMatchRelations(match: TournamentMatchRow): TournamentMatch {
  return {
    ...match,
    player1: firstRelation(match.player1),
    player2: firstRelation(match.player2),
    match: firstRelation(match.match),
  };
}

export function getPlatformForTournament(
  game: GameKey,
  requestedPlatform?: PlatformKey | null
): PlatformKey | null {
  const platforms = GAMES[game]?.platforms ?? [];
  if (requestedPlatform && platforms.includes(requestedPlatform)) return requestedPlatform;
  return platforms.length === 1 ? platforms[0] : null;
}
