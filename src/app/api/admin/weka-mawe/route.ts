import { NextRequest, NextResponse } from 'next/server';
import { getRequestAccessProfile, hasAdminAccess, hasModeratorAccess } from '@/lib/access';
import { readModeratorTournamentKeyFromGameIds } from '@/lib/moderator-tournaments';
import { createServiceClient } from '@/lib/supabase';
import {
  advanceWekaMaweWinner,
  cleanWekaMaweText,
  generateWekaMaweBracket,
  getCurrentWekaMaweEdition,
  getWekaMaweSummary,
  getWinnerRegistrationIdFromScore,
  type WekaMaweEligibilityStatus,
  type WekaMawePaymentStatus,
  type WekaMaweRecordingStatus,
  type WekaMaweRoundKey,
} from '@/lib/weka-mawe';

async function requireWekaMaweOperator(request: NextRequest) {
  const profile = await getRequestAccessProfile(request);
  if (!hasModeratorAccess(profile)) {
    return {
      profile: null,
      response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    };
  }

  if (hasAdminAccess(profile)) {
    return { profile, response: null };
  }

  const { data } = await createServiceClient()
    .from('profiles')
    .select('game_ids')
    .eq('id', profile?.id)
    .maybeSingle();
  const tournamentKey = readModeratorTournamentKeyFromGameIds(data?.game_ids);

  if (tournamentKey !== 'weka_mawe_efootball') {
    return {
      profile: null,
      response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    };
  }

  return { profile, response: null };
}

export async function GET(request: NextRequest) {
  const access = await requireWekaMaweOperator(request);
  if (access.response) return access.response;

  try {
    return NextResponse.json(await getWekaMaweSummary(createServiceClient()));
  } catch (error) {
    console.error('[Admin WekaMawe GET] Error:', error);
    return NextResponse.json({ error: 'Could not load Weka Mawe admin state.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const access = await requireWekaMaweOperator(request);
  if (access.response) return access.response;

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const action = cleanWekaMaweText(body.action, 60);
    const supabase = createServiceClient();
    const editionId = cleanWekaMaweText(body.editionId, 80);
    const currentEdition = editionId ? null : await getCurrentWekaMaweEdition(supabase);
    const targetEditionId = editionId || currentEdition?.id;

    if (action === 'update_edition_status') {
      if (!targetEditionId) {
        return NextResponse.json({ error: 'Edition is required.' }, { status: 400 });
      }
      const status = cleanWekaMaweText(body.status, 40);
      const allowed = ['draft', 'registration_open', 'check_in_open', 'locked', 'live', 'completed', 'cancelled'];
      if (!allowed.includes(status)) {
        return NextResponse.json({ error: 'Invalid edition status.' }, { status: 400 });
      }
      const updates: Record<string, unknown> = {
        status,
        completed_at: status === 'completed' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      };
      if (status === 'locked' || status === 'live') {
        updates.bracket_locked = true;
      }
      const { error } = await supabase
        .from('weka_mawe_editions')
        .update(updates)
        .eq('id', targetEditionId);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    } else if (action === 'update_registration') {
      const registrationId = cleanWekaMaweText(body.registrationId, 80);
      if (!registrationId) {
        return NextResponse.json({ error: 'Registration is required.' }, { status: 400 });
      }
      const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (body.paymentStatus) updates.payment_status = body.paymentStatus as WekaMawePaymentStatus;
      if (body.eligibilityStatus) updates.eligibility_status = body.eligibilityStatus as WekaMaweEligibilityStatus;
      if (body.adminNote !== undefined) updates.admin_note = cleanWekaMaweText(body.adminNote, 400);
      const { error } = await supabase
        .from('weka_mawe_registrations')
        .update(updates)
        .eq('id', registrationId);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    } else if (action === 'generate_bracket') {
      if (!targetEditionId) {
        return NextResponse.json({ error: 'Edition is required.' }, { status: 400 });
      }
      const result = await generateWekaMaweBracket(supabase, targetEditionId);
      if (!result.success) {
        return NextResponse.json({ error: result.error ?? 'Could not generate bracket.' }, { status: 400 });
      }
    } else if (action === 'update_match') {
      const matchId = cleanWekaMaweText(body.matchId, 80);
      if (!matchId) {
        return NextResponse.json({ error: 'Match is required.' }, { status: 400 });
      }
      const { data: match, error: loadError } = await supabase
        .from('weka_mawe_bracket_matches')
        .select('*')
        .eq('id', matchId)
        .maybeSingle();
      if (loadError || !match) {
        return NextResponse.json({ error: 'Match not found.' }, { status: 404 });
      }

      const playerOneScore =
        body.playerOneScore === '' || body.playerOneScore == null ? null : Number(body.playerOneScore);
      const playerTwoScore =
        body.playerTwoScore === '' || body.playerTwoScore == null ? null : Number(body.playerTwoScore);
      const recordingStatus = body.recordingStatus
        ? (body.recordingStatus as WekaMaweRecordingStatus)
        : match.recording_status;
      const recordingUrl =
        body.recordingUrl !== undefined ? cleanWekaMaweText(body.recordingUrl, 500) || null : match.recording_url;
      const winnerRegistrationId =
        playerOneScore != null && playerTwoScore != null
          ? getWinnerRegistrationIdFromScore(match, playerOneScore, playerTwoScore)
          : match.winner_registration_id;

      if (playerOneScore != null && playerTwoScore != null && !winnerRegistrationId) {
        return NextResponse.json({ error: 'Draws cannot advance in this bracket.' }, { status: 400 });
      }

      let winnerUserId = match.winner_user_id as string | null;
      if (winnerRegistrationId) {
        const { data: winner } = await supabase
          .from('weka_mawe_registrations')
          .select('user_id')
          .eq('id', winnerRegistrationId)
          .maybeSingle();
        winnerUserId = (winner?.user_id as string | null | undefined) ?? null;
      }

      const status =
        playerOneScore != null && playerTwoScore != null && winnerRegistrationId
          ? 'completed'
          : cleanWekaMaweText(body.status, 40) || match.status;
      const { error } = await supabase
        .from('weka_mawe_bracket_matches')
        .update({
          player_one_score: playerOneScore,
          player_two_score: playerTwoScore,
          winner_registration_id: winnerRegistrationId,
          winner_user_id: winnerUserId,
          status,
          completed_at: status === 'completed' ? new Date().toISOString() : null,
          recording_status: recordingStatus,
          recording_url: recordingUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', matchId);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });

      if (status === 'completed' && winnerRegistrationId) {
        await advanceWekaMaweWinner(supabase, {
          editionId: match.edition_id as string,
          roundKey: match.round_key as WekaMaweRoundKey,
          matchNumber: Number(match.match_number),
          winnerRegistrationId,
        });
        if (match.round_key === 'final') {
          await supabase
            .from('weka_mawe_editions')
            .update({
              status: 'completed',
              winner_user_id: winnerUserId,
              completed_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', match.edition_id);
        }
      }
    } else {
      return NextResponse.json({ error: 'Unsupported Weka Mawe admin action.' }, { status: 400 });
    }

    return NextResponse.json(await getWekaMaweSummary(supabase));
  } catch (error) {
    console.error('[Admin WekaMawe POST] Error:', error);
    return NextResponse.json({ error: 'Could not update Weka Mawe.' }, { status: 500 });
  }
}
