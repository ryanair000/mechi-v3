import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase';
import { calculateElo } from '@/lib/elo';
import { notifyResultConfirmed, notifyMatchDisputed } from '@/lib/whatsapp';
import { sendResultConfirmedEmail, sendMatchDisputeEmail } from '@/lib/email';
import type { GameKey } from '@/types';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const { winner_id } = body;

    if (!winner_id) {
      return NextResponse.json({ error: 'winner_id is required' }, { status: 400 });
    }

    const supabase = createServiceClient();

    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select('*')
      .eq('id', id)
      .single();

    if (matchError || !match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    if (match.player1_id !== authUser.sub && match.player2_id !== authUser.sub) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (match.status !== 'pending') {
      return NextResponse.json({ error: 'Match is not active' }, { status: 400 });
    }

    if (winner_id !== match.player1_id && winner_id !== match.player2_id) {
      return NextResponse.json({ error: 'Invalid winner' }, { status: 400 });
    }

    const isPlayer1 = authUser.sub === match.player1_id;
    const reportField = isPlayer1 ? 'player1_reported_winner' : 'player2_reported_winner';

    // Update the report field
    const { data: updatedMatch, error: updateError } = await supabase
      .from('matches')
      .update({ [reportField]: winner_id })
      .eq('id', id)
      .select()
      .single();

    if (updateError || !updatedMatch) {
      return NextResponse.json({ error: 'Failed to submit report' }, { status: 500 });
    }

    const p1Reported = updatedMatch.player1_reported_winner;
    const p2Reported = updatedMatch.player2_reported_winner;

    // Both reported
    if (p1Reported && p2Reported) {
      if (p1Reported === p2Reported) {
        // Agreement — finalize match
        const winnerId = p1Reported;
        const loserId = winnerId === match.player1_id ? match.player2_id : match.player1_id;
        const game = match.game as GameKey;
        const ratingKey = `rating_${game}`;

        const { data: profilesRaw } = await supabase
          .from('profiles')
          .select('id, rating_efootball, rating_fc26, rating_mk11, rating_nba2k26, rating_tekken8, rating_sf6, wins_efootball, wins_fc26, wins_mk11, wins_nba2k26, wins_tekken8, wins_sf6, losses_efootball, losses_fc26, losses_mk11, losses_nba2k26, losses_tekken8, losses_sf6, phone, email, username, whatsapp_number, whatsapp_notifications')
          .in('id', [winnerId, loserId]);

        const profiles = profilesRaw as Record<string, unknown>[] | null;
        const winnerProfile = profiles?.find((p) => p.id === winnerId);
        const loserProfile = profiles?.find((p) => p.id === loserId);

        if (winnerProfile && loserProfile) {
          const winnerRating = (winnerProfile[ratingKey] as number) ?? 1000;
          const loserRating = (loserProfile[ratingKey] as number) ?? 1000;

          const { newRatingWinner, newRatingLoser, changeWinner, changeLoser } = calculateElo(
            winnerRating,
            loserRating
          );

          // Update profiles
          await supabase
            .from('profiles')
            .update({
              [ratingKey]: newRatingWinner,
              [`wins_${game}`]: (winnerProfile[`wins_${game}`] as number ?? 0) + 1,
            })
            .eq('id', winnerId);

          await supabase
            .from('profiles')
            .update({
              [ratingKey]: newRatingLoser,
              [`losses_${game}`]: (loserProfile[`losses_${game}`] as number ?? 0) + 1,
            })
            .eq('id', loserId);

          // Finalize match
          await supabase
            .from('matches')
            .update({
              status: 'completed',
              winner_id: winnerId,
              rating_change_p1: isPlayer1 ? changeWinner : changeLoser,
              rating_change_p2: isPlayer1 ? changeLoser : changeWinner,
              completed_at: new Date().toISOString(),
            })
            .eq('id', id);

          const gameLabel = game as string;

          // Notify winner
          if (winnerProfile.whatsapp_notifications && winnerProfile.whatsapp_number) {
            notifyResultConfirmed({
              phone: winnerProfile.whatsapp_number as string,
              ratingChange: changeWinner,
              won: true,
            }).catch(console.error);
          }
          if (winnerProfile.email) {
            sendResultConfirmedEmail({
              to: winnerProfile.email as string,
              username: winnerProfile.username as string,
              opponentUsername: loserProfile.username as string,
              game: gameLabel,
              won: true,
              ratingChange: changeWinner,
              newRating: newRatingWinner,
            }).catch(console.error);
          }

          // Notify loser
          if (loserProfile.whatsapp_notifications && loserProfile.whatsapp_number) {
            notifyResultConfirmed({
              phone: loserProfile.whatsapp_number as string,
              ratingChange: changeLoser,
              won: false,
            }).catch(console.error);
          }
          if (loserProfile.email) {
            sendResultConfirmedEmail({
              to: loserProfile.email as string,
              username: loserProfile.username as string,
              opponentUsername: winnerProfile.username as string,
              game: gameLabel,
              won: false,
              ratingChange: changeLoser,
              newRating: newRatingLoser,
            }).catch(console.error);
          }
        }

        return NextResponse.json({ status: 'completed', winner_id: winnerId });
      } else {
        // Disagreement — mark as disputed
        await supabase
          .from('matches')
          .update({
            status: 'disputed',
            dispute_requested_by: authUser.sub,
          })
          .eq('id', id);

        // Notify both players of the dispute
        const { data: disputeProfiles } = await supabase
          .from('profiles')
          .select('id, username, email, whatsapp_number, whatsapp_notifications')
          .in('id', [match.player1_id, match.player2_id]);

        if (disputeProfiles) {
          const dp1 = disputeProfiles.find((p: Record<string, unknown>) => p.id === match.player1_id);
          const dp2 = disputeProfiles.find((p: Record<string, unknown>) => p.id === match.player2_id);
          if (dp1 && dp2) {
            if (dp1.email) sendMatchDisputeEmail({ to: dp1.email as string, username: dp1.username as string, opponentUsername: dp2.username as string, game: match.game, matchId: id }).catch(console.error);
            if (dp2.email) sendMatchDisputeEmail({ to: dp2.email as string, username: dp2.username as string, opponentUsername: dp1.username as string, game: match.game, matchId: id }).catch(console.error);
            if (dp1.whatsapp_notifications && dp1.whatsapp_number) notifyMatchDisputed({ phone: dp1.whatsapp_number as string, game: match.game, opponentUsername: dp2.username as string, matchId: id }).catch(console.error);
            if (dp2.whatsapp_notifications && dp2.whatsapp_number) notifyMatchDisputed({ phone: dp2.whatsapp_number as string, game: match.game, opponentUsername: dp1.username as string, matchId: id }).catch(console.error);
          }
        }

        return NextResponse.json({ status: 'disputed' });
      }
    }

    return NextResponse.json({ status: 'waiting_for_opponent' });
  } catch (err) {
    console.error('[Match Report] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
