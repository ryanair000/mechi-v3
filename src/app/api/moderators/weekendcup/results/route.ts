import { NextRequest, NextResponse } from 'next/server';
import { requireModeratorTournamentScope } from '@/lib/moderator-tournament-access';
import { createServiceClient } from '@/lib/supabase';
import { WEEKEND_CUP_SLUG, WEEKEND_CUP_GAME_BY_KEY, isWeekendCupGame } from '@/lib/weekend-cup';
import type { WeekendCupResult, WeekendCupPrizeStatus } from '@/lib/weekend-cup-match-day';

function cleanText(value: unknown, maxLength = 100): string {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function readPrizeValueKes(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return 0;

  const parsed = parseInt(value.replace(/[^\d]/g, ''), 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

const PRIZE_STATUSES: WeekendCupPrizeStatus[] = ['pending', 'processing', 'paid', 'failed'];

function isPrizeStatus(value: unknown): value is WeekendCupPrizeStatus {
  return typeof value === 'string' && PRIZE_STATUSES.includes(value as WeekendCupPrizeStatus);
}

function requireWeekendCupAssignment(
  scope: Awaited<ReturnType<typeof requireModeratorTournamentScope>>
) {
  if (scope.response || scope.isAdmin) return null;
  if (scope.assignment?.key.startsWith('weekendcup_')) return null;
  return NextResponse.json(
    { error: 'Weekend Cup moderator assignment required' },
    { status: 403 }
  );
}

function isAllGamesModerator(scope: Awaited<ReturnType<typeof requireModeratorTournamentScope>>) {
  return scope.profile?.username.toLowerCase() === 'ranxxs';
}

export async function GET(request: NextRequest) {
  const scope = await requireModeratorTournamentScope(request);
  if (scope.response) return scope.response;
  const assignmentResponse = requireWeekendCupAssignment(scope);
  if (assignmentResponse) return assignmentResponse;

  const { searchParams } = new URL(request.url);
  const gameParam = cleanText(searchParams.get('game'), 20);
  const game = isWeekendCupGame(gameParam) ? gameParam : null;

  if (!scope.isAdmin && !isAllGamesModerator(scope) && game && scope.assignment?.game !== game) {
    return NextResponse.json({ error: 'Access limited to your assigned game' }, { status: 403 });
  }

  const supabase = createServiceClient();
  let query = supabase
    .from('weekend_cup_results')
    .select('*')
    .eq('event_slug', WEEKEND_CUP_SLUG)
    .order('final_rank', { ascending: true });

  if (game) {
    query = query.eq('game', game);
  }

  const { data, error } = await query;
  if (error) {
    console.error('[WeekendCupResults GET] Error:', error);
    return NextResponse.json({ error: 'Could not load results' }, { status: 500 });
  }

  return NextResponse.json({ results: (data ?? []) as WeekendCupResult[] });
}

export async function POST(request: NextRequest) {
  const scope = await requireModeratorTournamentScope(request);
  if (scope.response) return scope.response;
  const assignmentResponse = requireWeekendCupAssignment(scope);
  if (assignmentResponse) return assignmentResponse;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const game = cleanText(body.game, 20);
  if (!isWeekendCupGame(game)) {
    return NextResponse.json({ error: 'Invalid game' }, { status: 400 });
  }

  if (!scope.isAdmin && !isAllGamesModerator(scope) && scope.assignment?.game !== game) {
    return NextResponse.json({ error: 'You can only finalize results for your assigned game' }, { status: 403 });
  }

  const supabase = createServiceClient();

  const { data: scores, error: scoresError } = await supabase
    .from('weekend_cup_scores')
    .select('registration_id, kills, total_points')
    .eq('event_slug', WEEKEND_CUP_SLUG);

  if (scoresError) {
    console.error('[WeekendCupResults POST] Scores error:', scoresError);
    return NextResponse.json({ error: 'Could not load scores' }, { status: 500 });
  }

  const { data: registrations, error: regError } = await supabase
    .from('online_tournament_registrations')
    .select('id, user_id, in_game_username')
    .eq('event_slug', WEEKEND_CUP_SLUG)
    .eq('game', game)
    .eq('check_in_status', 'checked_in')
    .eq('payment_status', 'paid');

  if (regError) {
    console.error('[WeekendCupResults POST] Registrations error:', regError);
    return NextResponse.json({ error: 'Could not load registrations' }, { status: 500 });
  }

  const scoresByRegistration = new Map<string, { totalKills: number; totalPoints: number }>();
  for (const score of (scores ?? []) as Array<{ registration_id: string; kills: number; total_points: number }>) {
    const existing = scoresByRegistration.get(score.registration_id) ?? { totalKills: 0, totalPoints: 0 };
    existing.totalKills += score.kills ?? 0;
    existing.totalPoints += score.total_points ?? 0;
    scoresByRegistration.set(score.registration_id, existing);
  }

  const ranked = (registrations ?? [])
    .map((reg) => {
      const regId = (reg as { id: string }).id;
      const aggregated = scoresByRegistration.get(regId) ?? { totalKills: 0, totalPoints: 0 };
      return {
        registration_id: regId,
        total_kills: aggregated.totalKills,
        total_points: aggregated.totalPoints,
      };
    })
    .sort((a, b) => b.total_points - a.total_points || b.total_kills - a.total_kills);

  const gameConfig = WEEKEND_CUP_GAME_BY_KEY[game];
  const prizes = [
    { rank: 1, value: gameConfig.firstPrize },
    { rank: 2, value: gameConfig.secondPrize },
    { rank: 3, value: gameConfig.thirdPrize },
    { rank: 4, value: gameConfig.fourthPrize ?? 0 },
    { rank: 5, value: gameConfig.fifthPrize ?? 0 },
  ];

  const resultsToInsert = ranked.map((player, index) => {
    const rank = index + 1;
    const prize = prizes.find((p) => p.rank === rank);
    const prizeValueKes = readPrizeValueKes(prize?.value);
    return {
      event_slug: WEEKEND_CUP_SLUG,
      game,
      registration_id: player.registration_id,
      final_rank: rank,
      total_kills: player.total_kills,
      total_points: player.total_points,
      prize_type: prizeValueKes > 0 ? 'cash' : 'none',
      prize_value_kes: prizeValueKes,
      prize_status: 'pending' as const,
    };
  });

  const { data: existingResults } = await supabase
    .from('weekend_cup_results')
    .select('id')
    .eq('event_slug', WEEKEND_CUP_SLUG)
    .eq('game', game);

  if ((existingResults ?? []).length > 0) {
    await supabase
      .from('weekend_cup_results')
      .delete()
      .eq('event_slug', WEEKEND_CUP_SLUG)
      .eq('game', game);
  }

  const { data: inserted, error: insertError } = await supabase
    .from('weekend_cup_results')
    .insert(resultsToInsert)
    .select();

  if (insertError) {
    console.error('[WeekendCupResults POST] Insert error:', insertError);
    return NextResponse.json({ error: 'Could not save results' }, { status: 500 });
  }

  return NextResponse.json({ results: (inserted ?? []) as WeekendCupResult[], count: inserted?.length ?? 0 });
}

export async function PATCH(request: NextRequest) {
  const scope = await requireModeratorTournamentScope(request);
  if (scope.response) return scope.response;
  const assignmentResponse = requireWeekendCupAssignment(scope);
  if (assignmentResponse) return assignmentResponse;

  if (!scope.isAdmin) {
    return NextResponse.json({ error: 'Admin access required for prize updates' }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const resultId = cleanText(body.result_id, 50);
  if (!resultId) {
    return NextResponse.json({ error: 'Result ID is required' }, { status: 400 });
  }

  const supabase = createServiceClient();
  const updates: Record<string, unknown> = {};

  if (Object.prototype.hasOwnProperty.call(body, 'prize_status')) {
    if (!isPrizeStatus(body.prize_status)) {
      return NextResponse.json({ error: 'Invalid prize status' }, { status: 400 });
    }
    if (body.prize_status === 'paid') {
      return NextResponse.json(
        { error: 'Prize release is disabled until recipient and eligibility verification are implemented.' },
        { status: 409 }
      );
    }
    updates.prize_status = body.prize_status;
  }

  if (Object.prototype.hasOwnProperty.call(body, 'payout_reference')) {
    updates.payout_reference = cleanText(body.payout_reference, 100) || null;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('weekend_cup_results')
    .update(updates)
    .eq('id', resultId)
    .select()
    .single();

  if (error) {
    console.error('[WeekendCupResults PATCH] Error:', error);
    return NextResponse.json({ error: 'Could not update result' }, { status: 500 });
  }

  return NextResponse.json({ result: data as WeekendCupResult });
}
