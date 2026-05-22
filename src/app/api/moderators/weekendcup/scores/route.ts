import { NextRequest, NextResponse } from 'next/server';
import { requireModeratorTournamentScope } from '@/lib/moderator-tournament-access';
import { createServiceClient } from '@/lib/supabase';
import { WEEKEND_CUP_SLUG, isWeekendCupGame } from '@/lib/weekend-cup';
import { calculateBRMatchPoints, type WeekendCupScore } from '@/lib/weekend-cup-match-day';
import type { OnlineTournamentGameKey } from '@/lib/online-tournament';

function cleanText(value: unknown, maxLength = 100): string {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function readInteger(value: unknown): number | null {
  if (typeof value === 'number' && Number.isInteger(value)) return value;
  if (typeof value === 'string' && /^\d+$/.test(value)) return parseInt(value, 10);
  return null;
}

export async function GET(request: NextRequest) {
  const scope = await requireModeratorTournamentScope(request);
  if (scope.response) return scope.response;

  const { searchParams } = new URL(request.url);
  const gameParam = cleanText(searchParams.get('game'), 20);
  const matchNumber = readInteger(searchParams.get('match_number'));
  const lobbyId = cleanText(searchParams.get('lobby_id'), 50);

  const supabase = createServiceClient();

  let registrationIds: string[] = [];
  if (gameParam && isWeekendCupGame(gameParam)) {
    if (!scope.isAdmin && scope.assignment?.game !== gameParam) {
      return NextResponse.json({ error: 'Access limited to your assigned game' }, { status: 403 });
    }

    const { data: registrations } = await supabase
      .from('online_tournament_registrations')
      .select('id')
      .eq('event_slug', WEEKEND_CUP_SLUG)
      .eq('game', gameParam)
      .eq('check_in_status', 'checked_in');

    registrationIds = (registrations ?? []).map((r) => (r as { id: string }).id);
  }

  let query = supabase
    .from('weekend_cup_scores')
    .select('*')
    .eq('event_slug', WEEKEND_CUP_SLUG)
    .order('match_number', { ascending: true });

  if (registrationIds.length > 0) {
    query = query.in('registration_id', registrationIds);
  }
  if (matchNumber) {
    query = query.eq('match_number', matchNumber);
  }
  if (lobbyId) {
    query = query.eq('lobby_id', lobbyId);
  }

  const { data, error } = await query;
  if (error) {
    console.error('[WeekendCupScores GET] Error:', error);
    return NextResponse.json({ error: 'Could not load scores' }, { status: 500 });
  }

  return NextResponse.json({ scores: (data ?? []) as WeekendCupScore[] });
}

export async function POST(request: NextRequest) {
  const scope = await requireModeratorTournamentScope(request);
  if (scope.response) return scope.response;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const registrationId = cleanText(body.registration_id, 50);
  const matchNumber = readInteger(body.match_number) ?? 1;
  const kills = readInteger(body.kills) ?? 0;
  const placement = readInteger(body.placement);
  const lobbyId = cleanText(body.lobby_id, 50) || null;
  const screenshotUrl = cleanText(body.screenshot_url, 500) || null;

  if (!registrationId) {
    return NextResponse.json({ error: 'Registration ID is required' }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { data: registration, error: regError } = await supabase
    .from('online_tournament_registrations')
    .select('id, game, user_id')
    .eq('id', registrationId)
    .eq('event_slug', WEEKEND_CUP_SLUG)
    .maybeSingle();

  if (regError || !registration) {
    return NextResponse.json({ error: 'Registration not found' }, { status: 404 });
  }

  const game = (registration as { game?: string }).game;
  if (!isWeekendCupGame(game)) {
    return NextResponse.json({ error: 'Invalid game for registration' }, { status: 400 });
  }

  if (!scope.isAdmin && scope.assignment?.game !== game) {
    return NextResponse.json({ error: 'You can only enter scores for your assigned game' }, { status: 403 });
  }

  const points = calculateBRMatchPoints(game as OnlineTournamentGameKey, kills, placement);

  const { data, error } = await supabase
    .from('weekend_cup_scores')
    .upsert(
      {
        event_slug: WEEKEND_CUP_SLUG,
        registration_id: registrationId,
        lobby_id: lobbyId,
        match_number: matchNumber,
        kills,
        placement,
        placement_points: points.placementPoints,
        total_points: points.totalPoints,
        screenshot_url: screenshotUrl,
        verified_by: scope.profile?.id ?? null,
        verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'registration_id,match_number' }
    )
    .select()
    .single();

  if (error) {
    console.error('[WeekendCupScores POST] Error:', error);
    return NextResponse.json({ error: 'Could not save score' }, { status: 500 });
  }

  return NextResponse.json({ score: data as WeekendCupScore });
}

export async function PATCH(request: NextRequest) {
  const scope = await requireModeratorTournamentScope(request);
  if (scope.response) return scope.response;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const scores = Array.isArray(body.scores) ? body.scores : [];
  if (scores.length === 0) {
    return NextResponse.json({ error: 'No scores provided' }, { status: 400 });
  }

  const supabase = createServiceClient();
  const results: WeekendCupScore[] = [];

  for (const scoreEntry of scores) {
    const entry = scoreEntry as Record<string, unknown>;
    const registrationId = cleanText(entry.registration_id, 50);
    const matchNumber = readInteger(entry.match_number) ?? 1;
    const kills = readInteger(entry.kills) ?? 0;
    const placement = readInteger(entry.placement);
    const lobbyId = cleanText(entry.lobby_id, 50) || null;

    if (!registrationId) continue;

    const { data: registration } = await supabase
      .from('online_tournament_registrations')
      .select('id, game')
      .eq('id', registrationId)
      .eq('event_slug', WEEKEND_CUP_SLUG)
      .maybeSingle();

    if (!registration) continue;

    const game = (registration as { game?: string }).game;
    if (!isWeekendCupGame(game)) continue;
    if (!scope.isAdmin && scope.assignment?.game !== game) continue;

    const points = calculateBRMatchPoints(game as OnlineTournamentGameKey, kills, placement);

    const { data } = await supabase
      .from('weekend_cup_scores')
      .upsert(
        {
          event_slug: WEEKEND_CUP_SLUG,
          registration_id: registrationId,
          lobby_id: lobbyId,
          match_number: matchNumber,
          kills,
          placement,
          placement_points: points.placementPoints,
          total_points: points.totalPoints,
          verified_by: scope.profile?.id ?? null,
          verified_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'registration_id,match_number' }
      )
      .select()
      .single();

    if (data) {
      results.push(data as WeekendCupScore);
    }
  }

  return NextResponse.json({ scores: results, count: results.length });
}
