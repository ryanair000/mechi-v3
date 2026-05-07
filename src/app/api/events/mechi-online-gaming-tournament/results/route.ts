import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import { uploadImageDataUri } from '@/lib/cloudinary';
import {
  ONLINE_TOURNAMENT_SLUG,
  isOnlineTournamentGame,
} from '@/lib/online-tournament';
import {
  isBattleRoyaleTournamentGame,
  type OnlineTournamentFixture,
} from '@/lib/online-tournament-ops';
import {
  buildPlayerTournamentState,
  loadOnlineTournamentOpsState,
} from '@/lib/online-tournament-store';
import { checkPersistentRateLimit, getClientIp, rateLimitResponse } from '@/lib/rateLimit';
import { createServiceClient } from '@/lib/supabase';

type ReadableFormData = {
  get(name: string): FormDataEntryValue | null;
};

function readPositiveInteger(value: FormDataEntryValue | null): number | null {
  const text = String(value ?? '').trim();
  if (!/^\d+$/.test(text)) return null;
  const number = Number(text);
  return Number.isSafeInteger(number) && number >= 0 ? number : null;
}

function readStrictPositiveInteger(value: FormDataEntryValue | null): number | null {
  const number = readPositiveInteger(value);
  return number !== null && number > 0 ? number : null;
}

async function uploadScreenshot(params: {
  file: File;
  game: string;
  userId: string;
}) {
  if (!params.file.type.startsWith('image/')) {
    return { error: 'Upload a PNG, JPG, or WEBP screenshot' };
  }

  if (params.file.size > 10 * 1024 * 1024) {
    return { error: 'Screenshot must be under 10MB' };
  }

  const arrayBuffer = await params.file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const dataUri = `data:${params.file.type};base64,${buffer.toString('base64')}`;
  const publicId = `playmechi_${params.game}_${params.userId}_${Date.now()}`;
  const uploaded = await uploadImageDataUri({
    dataUri,
    folder: 'mechi/playmechi-results',
    publicId,
    transformation: [{ quality: 'auto', fetch_format: 'auto' }],
  });

  return {
    secureUrl: uploaded.secure_url,
    publicId: uploaded.public_id,
  };
}

export async function POST(request: NextRequest) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) {
    return access.response;
  }

  try {
    const resultRateLimit = await checkPersistentRateLimit(
      `online-tournament-result:${access.profile.id}:${getClientIp(request)}`,
      12,
      30 * 60 * 1000
    );
    if (!resultRateLimit.allowed) {
      return rateLimitResponse(resultRateLimit.retryAfterSeconds);
    }

    const formData = (await request.formData()) as unknown as ReadableFormData;
    const game = String(formData.get('game') ?? '').trim();

    if (!isOnlineTournamentGame(game)) {
      return NextResponse.json({ error: 'Pick a valid game' }, { status: 400 });
    }

    const screenshot = formData.get('screenshot');
    if (!(screenshot instanceof File)) {
      return NextResponse.json({ error: 'Screenshot is required' }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { data: registrationRaw, error: registrationError } = await supabase
      .from('online_tournament_registrations')
      .select('id, game, user_id, eligibility_status')
      .eq('event_slug', ONLINE_TOURNAMENT_SLUG)
      .eq('user_id', access.profile.id)
      .eq('game', game)
      .maybeSingle();

    const registration = registrationRaw as
      | { id: string; game: string; user_id: string; eligibility_status: string }
      | null;

    if (registrationError) {
      return NextResponse.json({ error: 'Could not load registration' }, { status: 500 });
    }

    if (!registration || registration.eligibility_status === 'disqualified') {
      return NextResponse.json(
        { error: 'Register for this game before uploading results' },
        { status: 403 }
      );
    }

    const uploaded = await uploadScreenshot({
      file: screenshot,
      game,
      userId: access.profile.id,
    });

    if ('error' in uploaded) {
      return NextResponse.json({ error: uploaded.error }, { status: 400 });
    }

    const basePayload = {
      event_slug: ONLINE_TOURNAMENT_SLUG,
      game,
      registration_id: registration.id,
      user_id: access.profile.id,
      screenshot_url: uploaded.secureUrl,
      screenshot_public_id: uploaded.publicId,
      status: 'pending',
      submitted_by: access.profile.id,
      updated_at: new Date().toISOString(),
    };

    if (isBattleRoyaleTournamentGame(game)) {
      const matchNumber = readStrictPositiveInteger(formData.get('match_number'));
      const kills = readPositiveInteger(formData.get('kills'));
      const placement = readStrictPositiveInteger(formData.get('placement'));

      if (!matchNumber || matchNumber > 3 || kills === null || !placement) {
        return NextResponse.json(
          { error: 'Match number, kills, and placement are required' },
          { status: 400 }
        );
      }

      const { data: room } = await supabase
        .from('online_tournament_rooms')
        .select('id')
        .eq('event_slug', ONLINE_TOURNAMENT_SLUG)
        .eq('game', game)
        .eq('match_number', matchNumber)
        .maybeSingle();

      const { error } = await supabase
        .from('online_tournament_result_submissions')
        .insert({
          ...basePayload,
          room_id: (room as { id?: string } | null)?.id ?? null,
          match_number: matchNumber,
          kills,
          placement,
        });

      if (error) {
        return NextResponse.json({ error: 'Could not save result' }, { status: 500 });
      }
    } else {
      const fixtureId = String(formData.get('fixture_id') ?? '').trim();
      const player1Score = readPositiveInteger(formData.get('player1_score'));
      const player2Score = readPositiveInteger(formData.get('player2_score'));

      if (!fixtureId || player1Score === null || player2Score === null) {
        return NextResponse.json(
          { error: 'Fixture and scoreline are required' },
          { status: 400 }
        );
      }

      const { data: fixtureRaw, error: fixtureError } = await supabase
        .from('online_tournament_fixtures')
        .select('*')
        .eq('id', fixtureId)
        .eq('event_slug', ONLINE_TOURNAMENT_SLUG)
        .maybeSingle();

      const fixture = fixtureRaw as OnlineTournamentFixture | null;
      if (fixtureError || !fixture) {
        return NextResponse.json({ error: 'Fixture not found' }, { status: 404 });
      }

      if (
        fixture.player1_registration_id !== registration.id &&
        fixture.player2_registration_id !== registration.id
      ) {
        return NextResponse.json({ error: 'You are not in this fixture' }, { status: 403 });
      }

      const reportedWinnerRegistrationId =
        player1Score > player2Score
          ? fixture.player1_registration_id
          : player2Score > player1Score
            ? fixture.player2_registration_id
            : null;

      const { error } = await supabase
        .from('online_tournament_result_submissions')
        .insert({
          ...basePayload,
          fixture_id: fixture.id,
          player1_score: player1Score,
          player2_score: player2Score,
          reported_winner_registration_id: reportedWinnerRegistrationId,
        });

      if (error) {
        return NextResponse.json({ error: 'Could not save result' }, { status: 500 });
      }
    }

    const state = await loadOnlineTournamentOpsState(supabase);
    return NextResponse.json(
      buildPlayerTournamentState({
        state,
        userId: access.profile.id,
      }),
      { status: 201 }
    );
  } catch (error) {
    console.error('[OnlineTournamentResults POST] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
