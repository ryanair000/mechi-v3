import { NextRequest, NextResponse } from 'next/server';
import { requireModeratorTournamentScope } from '@/lib/moderator-tournament-access';
import { createServiceClient } from '@/lib/supabase';
import { WEEKEND_CUP_SLUG } from '@/lib/weekend-cup';
import {
  generateBracketMatches,
  shuffleArray,
  getNextRoundMatchNumber,
  isPlayer1InNextRound,
  WEEKEND_CUP_BRACKET_ROUNDS,
  type WeekendCupBracketMatch,
  type WeekendCupBracketStatus,
} from '@/lib/weekend-cup-match-day';

function cleanText(value: unknown, maxLength = 100): string {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function readInteger(value: unknown): number | null {
  if (typeof value === 'number' && Number.isInteger(value)) return value;
  if (typeof value === 'string' && /^\d+$/.test(value)) return parseInt(value, 10);
  return null;
}

const BRACKET_STATUSES: WeekendCupBracketStatus[] = ['pending', 'scheduled', 'active', 'completed', 'walkover', 'cancelled'];

function isBracketStatus(value: unknown): value is WeekendCupBracketStatus {
  return typeof value === 'string' && BRACKET_STATUSES.includes(value as WeekendCupBracketStatus);
}

export async function GET(request: NextRequest) {
  const scope = await requireModeratorTournamentScope(request);
  if (scope.response) return scope.response;

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('weekend_cup_brackets')
    .select('*')
    .eq('event_slug', WEEKEND_CUP_SLUG)
    .eq('game', 'efootball')
    .order('round', { ascending: true })
    .order('match_number', { ascending: true });

  if (error) {
    console.error('[WeekendCupBracket GET] Error:', error);
    return NextResponse.json({ error: 'Could not load bracket' }, { status: 500 });
  }

  return NextResponse.json({ matches: (data ?? []) as WeekendCupBracketMatch[] });
}

export async function POST(request: NextRequest) {
  const scope = await requireModeratorTournamentScope(request);
  if (scope.response) return scope.response;

  if (!scope.isAdmin && scope.assignment?.game !== 'efootball') {
    return NextResponse.json({ error: 'Only eFootball moderators can generate brackets' }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const shuffle = body.shuffle !== false;

  const supabase = createServiceClient();

  const { data: registrations, error: regError } = await supabase
    .from('online_tournament_registrations')
    .select('id, user_id, in_game_username')
    .eq('event_slug', WEEKEND_CUP_SLUG)
    .eq('game', 'efootball')
    .eq('check_in_status', 'checked_in')
    .eq('payment_status', 'paid')
    .neq('eligibility_status', 'disqualified');

  if (regError) {
    console.error('[WeekendCupBracket POST] Registrations error:', regError);
    return NextResponse.json({ error: 'Could not load registrations' }, { status: 500 });
  }

  const players = (registrations ?? []) as Array<{ id: string; user_id: string; in_game_username: string }>;
  if (players.length < 2) {
    return NextResponse.json({ error: 'Need at least 2 checked-in players to generate bracket' }, { status: 400 });
  }

  const orderedPlayers = shuffle ? shuffleArray(players) : players;
  const bracketTemplate = generateBracketMatches(orderedPlayers.length);

  const firstRound = bracketTemplate.filter((m) => m.round === Math.min(...bracketTemplate.map((b) => b.round)));
  const matchesToInsert: Array<{
    event_slug: string;
    game: string;
    round: number;
    match_number: number;
    player1_registration_id: string | null;
    player2_registration_id: string | null;
    is_bronze_match: boolean;
    status: WeekendCupBracketStatus;
  }> = [];

  let playerIndex = 0;
  for (const match of firstRound) {
    const player1 = orderedPlayers[playerIndex] ?? null;
    const player2 = orderedPlayers[playerIndex + 1] ?? null;
    playerIndex += 2;

    matchesToInsert.push({
      event_slug: WEEKEND_CUP_SLUG,
      game: 'efootball',
      round: match.round,
      match_number: match.match_number,
      player1_registration_id: player1?.id ?? null,
      player2_registration_id: player2?.id ?? null,
      is_bronze_match: match.is_bronze_match,
      status: player1 && player2 ? 'pending' : player1 || player2 ? 'walkover' : 'cancelled',
    });
  }

  for (const match of bracketTemplate) {
    if (match.round === firstRound[0]?.round) continue;
    matchesToInsert.push({
      event_slug: WEEKEND_CUP_SLUG,
      game: 'efootball',
      round: match.round,
      match_number: match.match_number,
      player1_registration_id: null,
      player2_registration_id: null,
      is_bronze_match: match.is_bronze_match,
      status: 'pending',
    });
  }

  await supabase
    .from('weekend_cup_brackets')
    .delete()
    .eq('event_slug', WEEKEND_CUP_SLUG)
    .eq('game', 'efootball');

  const { data: inserted, error: insertError } = await supabase
    .from('weekend_cup_brackets')
    .insert(matchesToInsert)
    .select();

  if (insertError) {
    console.error('[WeekendCupBracket POST] Insert error:', insertError);
    return NextResponse.json({ error: 'Could not create bracket' }, { status: 500 });
  }

  return NextResponse.json({
    matches: (inserted ?? []) as WeekendCupBracketMatch[],
    playerCount: orderedPlayers.length,
  });
}

export async function PATCH(request: NextRequest) {
  const scope = await requireModeratorTournamentScope(request);
  if (scope.response) return scope.response;

  if (!scope.isAdmin && scope.assignment?.game !== 'efootball') {
    return NextResponse.json({ error: 'Only eFootball moderators can update brackets' }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const matchId = cleanText(body.match_id, 50);
  if (!matchId) {
    return NextResponse.json({ error: 'Match ID is required' }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { data: existing, error: readError } = await supabase
    .from('weekend_cup_brackets')
    .select('*')
    .eq('id', matchId)
    .eq('event_slug', WEEKEND_CUP_SLUG)
    .maybeSingle();

  if (readError || !existing) {
    return NextResponse.json({ error: 'Match not found' }, { status: 404 });
  }

  const match = existing as WeekendCupBracketMatch;
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (Object.prototype.hasOwnProperty.call(body, 'player1_score')) {
    updates.player1_score = readInteger(body.player1_score);
  }
  if (Object.prototype.hasOwnProperty.call(body, 'player2_score')) {
    updates.player2_score = readInteger(body.player2_score);
  }
  if (Object.prototype.hasOwnProperty.call(body, 'status')) {
    if (!isBracketStatus(body.status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }
    updates.status = body.status;
    if (body.status === 'active') {
      updates.started_at = updates.updated_at;
    } else if (body.status === 'completed' || body.status === 'walkover') {
      updates.completed_at = updates.updated_at;
      updates.verified_by = scope.profile?.id ?? null;
    }
  }
  if (Object.prototype.hasOwnProperty.call(body, 'recording_url')) {
    updates.recording_url = cleanText(body.recording_url, 500) || null;
  }

  const p1Score = (updates.player1_score ?? match.player1_score) as number | null;
  const p2Score = (updates.player2_score ?? match.player2_score) as number | null;
  const newStatus = (updates.status ?? match.status) as WeekendCupBracketStatus;

  if (newStatus === 'completed' && p1Score !== null && p2Score !== null) {
    if (p1Score > p2Score) {
      updates.winner_registration_id = match.player1_registration_id;
      updates.loser_registration_id = match.player2_registration_id;
    } else if (p2Score > p1Score) {
      updates.winner_registration_id = match.player2_registration_id;
      updates.loser_registration_id = match.player1_registration_id;
    }
  } else if (newStatus === 'walkover') {
    if (match.player1_registration_id && !match.player2_registration_id) {
      updates.winner_registration_id = match.player1_registration_id;
    } else if (match.player2_registration_id && !match.player1_registration_id) {
      updates.winner_registration_id = match.player2_registration_id;
    }
  }

  const { data: updated, error: updateError } = await supabase
    .from('weekend_cup_brackets')
    .update(updates)
    .eq('id', matchId)
    .select()
    .single();

  if (updateError) {
    console.error('[WeekendCupBracket PATCH] Update error:', updateError);
    return NextResponse.json({ error: 'Could not update match' }, { status: 500 });
  }

  const updatedMatch = updated as WeekendCupBracketMatch;

  if (
    (updatedMatch.status === 'completed' || updatedMatch.status === 'walkover') &&
    updatedMatch.winner_registration_id &&
    updatedMatch.round < WEEKEND_CUP_BRACKET_ROUNDS.FINAL
  ) {
    const isSemiFinal = updatedMatch.round === WEEKEND_CUP_BRACKET_ROUNDS.SF;

    if (isSemiFinal && updatedMatch.loser_registration_id) {
      const bronzeSlot = updatedMatch.match_number === 1 ? 'player1_registration_id' : 'player2_registration_id';
      await supabase
        .from('weekend_cup_brackets')
        .update({ [bronzeSlot]: updatedMatch.loser_registration_id, updated_at: new Date().toISOString() })
        .eq('event_slug', WEEKEND_CUP_SLUG)
        .eq('game', 'efootball')
        .eq('round', WEEKEND_CUP_BRACKET_ROUNDS.BRONZE)
        .eq('match_number', 1);
    }

    if (!updatedMatch.is_bronze_match) {
      const nextRound = isSemiFinal ? WEEKEND_CUP_BRACKET_ROUNDS.FINAL : updatedMatch.round + 1;
      const nextMatchNumber = isSemiFinal ? 1 : getNextRoundMatchNumber(updatedMatch.round, updatedMatch.match_number);
      const isPlayer1 = isSemiFinal
        ? updatedMatch.match_number === 1
        : isPlayer1InNextRound(updatedMatch.match_number);
      const slotField = isPlayer1 ? 'player1_registration_id' : 'player2_registration_id';

      await supabase
        .from('weekend_cup_brackets')
        .update({ [slotField]: updatedMatch.winner_registration_id, updated_at: new Date().toISOString() })
        .eq('event_slug', WEEKEND_CUP_SLUG)
        .eq('game', 'efootball')
        .eq('round', nextRound)
        .eq('match_number', nextMatchNumber);
    }
  }

  const { data: allMatches } = await supabase
    .from('weekend_cup_brackets')
    .select('*')
    .eq('event_slug', WEEKEND_CUP_SLUG)
    .eq('game', 'efootball')
    .order('round', { ascending: true })
    .order('match_number', { ascending: true });

  return NextResponse.json({
    match: updatedMatch,
    matches: (allMatches ?? []) as WeekendCupBracketMatch[],
  });
}
