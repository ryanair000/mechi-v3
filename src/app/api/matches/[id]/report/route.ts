import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import { tryClaimBounty } from '@/lib/bounties';
import { calculateElo } from '@/lib/elo';
import {
  evaluateAchievements,
  getLevelFromXp,
  getNairobiDateStamp,
  getRankDivision,
  MP_RULES,
  toAchievementUnlock,
  TRACKED_RANKED_GAMES,
  XP_RULES,
} from '@/lib/gamification';
import { processMatchRewardMilestones } from '@/lib/rewards';
import { createServiceClient } from '@/lib/supabase';
import { sendMatchDisputeEmail, sendResultConfirmedEmail } from '@/lib/email';
import { notifyMatchDispute, notifyResultConfirmed } from '@/lib/whatsapp';
import {
  GAMES,
  getCanonicalGameKey,
  getGameLossesKey,
  getGameRatingKey,
  getGameWinsKey,
  requiresMatchScoreReport,
} from '@/lib/config';
import { createMatchChatMessage } from '@/lib/match-chat';
import { createNotifications } from '@/lib/notifications';
import { advanceTournamentAfterMatch } from '@/lib/tournaments';
import type { GameKey, GamificationResult, Match } from '@/types';

type ProfileRow = Record<string, unknown> & {
  id: string;
  username: string;
  phone?: string | null;
  email?: string | null;
  invited_by?: string | null;
  chezahub_user_id?: string | null;
  whatsapp_number?: string | null;
  whatsapp_notifications?: boolean | null;
  xp?: number | null;
  level?: number | null;
  mp?: number | null;
  win_streak?: number | null;
  max_win_streak?: number | null;
  last_match_date?: string | null;
};

type RpcResult = {
  status: 'completed';
  winner_id: string | null;
  gamification_summary_p1?: GamificationResult | null;
  gamification_summary_p2?: GamificationResult | null;
};

type LeaderboardResponse = {
  leaderboard?: Array<{
    id?: string;
    rank?: number;
  }>;
};

function getNumericValue(profile: ProfileRow, key: string, fallback = 0): number {
  const value = profile[key];
  return typeof value === 'number' ? value : fallback;
}

function getDateStamp(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === 'string') return value.slice(0, 10);
  return null;
}

function getTotalWins(profile: ProfileRow): number {
  return TRACKED_RANKED_GAMES.reduce(
    (total, game) => total + getNumericValue(profile, getGameWinsKey(game)),
    0
  );
}

function getTotalLosses(profile: ProfileRow): number {
  return TRACKED_RANKED_GAMES.reduce(
    (total, game) => total + getNumericValue(profile, getGameLossesKey(game)),
    0
  );
}

function getGameWinsMap(profile: ProfileRow, game: GameKey, didWin: boolean) {
  const winsByGame: Record<string, number> = {};

  for (const currentGame of TRACKED_RANKED_GAMES) {
    const wins = getNumericValue(profile, getGameWinsKey(currentGame));
    winsByGame[currentGame] =
      didWin && currentGame === game ? wins + 1 : wins;
  }

  return winsByGame;
}

function getGamificationSummaryForUser(match: Match, userId: string) {
  if (userId === match.player1_id) {
    return match.gamification_summary_p1 ?? null;
  }

  if (userId === match.player2_id) {
    return match.gamification_summary_p2 ?? null;
  }

  return null;
}

function shouldUseLegacyFallback(error: { message?: string; code?: string } | null) {
  const message = error?.message?.toLowerCase() ?? '';
  return (
    message.includes('finalize_match_with_gamification') ||
    message.includes('gamification_summary') ||
    message.includes('column') ||
    error?.code === 'PGRST202'
  );
}

function parseReportedScore(value: unknown): number | null | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (typeof value === 'number' && Number.isInteger(value) && value >= 0) {
    return value;
  }

  if (typeof value === 'string' && /^\d+$/.test(value.trim())) {
    return Number(value.trim());
  }

  return null;
}

async function maybeClaimLeaderboardTop3Bounty(params: {
  requestOrigin: string;
  supabase: ReturnType<typeof createServiceClient>;
  winnerId: string;
  game: GameKey;
}) {
  try {
    const response = await fetch(
      `${params.requestOrigin}/api/users/leaderboard/${encodeURIComponent(params.game)}`,
      {
        cache: 'no-store',
      }
    );

    if (!response.ok) {
      return;
    }

    const payload = (await response.json().catch(() => null)) as LeaderboardResponse | null;
    const winnerEntry = (payload?.leaderboard ?? []).find((entry) => entry.id === params.winnerId);

    if (winnerEntry?.rank && winnerEntry.rank <= 3) {
      void tryClaimBounty(params.supabase, params.winnerId, 'leaderboard_top3').catch(() => null);
    }
  } catch (error) {
    console.error('[Match Report] Failed to evaluate leaderboard_top3 bounty:', error);
  }
}

function formatScoreline(player1Score: number, player2Score: number) {
  return `${player1Score}-${player2Score}`;
}

async function finalizeLegacyMatch(params: {
  supabase: ReturnType<typeof createServiceClient>;
  matchId: string;
  winnerId: string;
  loserId: string;
  game: GameKey;
  newRatingWinner: number;
  newRatingLoser: number;
  ratingChangeP1: number;
  ratingChangeP2: number;
  finalPlayer1Score?: number | null;
  finalPlayer2Score?: number | null;
}) {
  const {
    supabase,
    matchId,
    winnerId,
    loserId,
    game,
    newRatingWinner,
    newRatingLoser,
    ratingChangeP1,
    ratingChangeP2,
    finalPlayer1Score,
    finalPlayer2Score,
  } = params;
  const ratingKey = getGameRatingKey(game);
  const winsKey = getGameWinsKey(game);
  const lossesKey = getGameLossesKey(game);

  const { data: profilesRaw } = await supabase
    .from('profiles')
    .select('*')
    .in('id', [winnerId, loserId]);

  const profiles = (profilesRaw ?? []) as ProfileRow[];
  const winnerProfile = profiles.find((profile) => profile.id === winnerId);
  const loserProfile = profiles.find((profile) => profile.id === loserId);

  if (!winnerProfile || !loserProfile) {
    return false;
  }

  const { error: winnerError } = await supabase
    .from('profiles')
    .update({
      [ratingKey]: newRatingWinner,
      [winsKey]: getNumericValue(winnerProfile, winsKey) + 1,
    })
    .eq('id', winnerId);

  if (winnerError) {
    return false;
  }

  const { error: loserError } = await supabase
    .from('profiles')
    .update({
      [ratingKey]: newRatingLoser,
      [lossesKey]: getNumericValue(loserProfile, lossesKey) + 1,
    })
    .eq('id', loserId);

  if (loserError) {
    return false;
  }

  const matchUpdate: Record<string, string | number | null> = {
    status: 'completed',
    winner_id: winnerId,
    rating_change_p1: ratingChangeP1,
    rating_change_p2: ratingChangeP2,
    completed_at: new Date().toISOString(),
  };

  if (finalPlayer1Score !== undefined) {
    matchUpdate.player1_score = finalPlayer1Score;
  }

  if (finalPlayer2Score !== undefined) {
    matchUpdate.player2_score = finalPlayer2Score;
  }

  const { error: matchError } = await supabase
    .from('matches')
    .update(matchUpdate)
    .eq('id', matchId);

  return !matchError;
}

async function sendCompletionNotifications(params: {
  winnerProfile: ProfileRow;
  loserProfile: ProfileRow;
  gameLabel: string;
  winnerRankLabel: string;
  loserRankLabel: string;
  winnerLevel: number;
  loserLevel: number;
}) {
  const {
    winnerProfile,
    loserProfile,
    gameLabel,
    winnerRankLabel,
    loserRankLabel,
    winnerLevel,
    loserLevel,
  } = params;

  if (winnerProfile.whatsapp_notifications && winnerProfile.whatsapp_number) {
    notifyResultConfirmed({
      whatsappNumber: winnerProfile.whatsapp_number,
      username: winnerProfile.username,
      opponentUsername: loserProfile.username,
      game: gameLabel,
      won: true,
      rankLabel: winnerRankLabel,
      level: winnerLevel,
    }).catch(console.error);
  }

  if (winnerProfile.email) {
    sendResultConfirmedEmail({
      to: winnerProfile.email,
      username: winnerProfile.username,
      opponentUsername: loserProfile.username,
      game: gameLabel,
      won: true,
      rankLabel: winnerRankLabel,
      level: winnerLevel,
    }).catch(console.error);
  }

  if (loserProfile.whatsapp_notifications && loserProfile.whatsapp_number) {
    notifyResultConfirmed({
      whatsappNumber: loserProfile.whatsapp_number,
      username: loserProfile.username,
      opponentUsername: winnerProfile.username,
      game: gameLabel,
      won: false,
      rankLabel: loserRankLabel,
      level: loserLevel,
    }).catch(console.error);
  }

  if (loserProfile.email) {
    sendResultConfirmedEmail({
      to: loserProfile.email,
      username: loserProfile.username,
      opponentUsername: winnerProfile.username,
      game: gameLabel,
      won: false,
      rankLabel: loserRankLabel,
      level: loserLevel,
    }).catch(console.error);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) {
    return access.response;
  }

  const authUser = access.profile;
  const { id } = await params;

  try {
    const body = (await request.json()) as Record<string, unknown>;

    const supabase = createServiceClient();

    const { data: matchRaw, error: matchError } = await supabase
      .from('matches')
      .select('*')
      .eq('id', id)
      .single();

    const match = matchRaw as Match | null;

    if (matchError || !match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    if (match.player1_id !== authUser.id && match.player2_id !== authUser.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (match.status === 'completed') {
      return NextResponse.json({
        status: 'completed',
        winner_id: match.winner_id,
        player1_score: match.player1_score ?? null,
        player2_score: match.player2_score ?? null,
        gamification: getGamificationSummaryForUser(match, authUser.id),
      });
    }

    if (match.status !== 'pending') {
      return NextResponse.json({ error: 'Match is not active' }, { status: 400 });
    }

    const game = getCanonicalGameKey(match.game as GameKey);
    const usesScoreReport = requiresMatchScoreReport(game);
    const rawPlayer1Score = parseReportedScore(body.player1_score);
    const rawPlayer2Score = parseReportedScore(body.player2_score);
    let winnerId: string | null = String(body.winner_id ?? '').trim() || null;
    let reportedPlayer1Score: number | null = null;
    let reportedPlayer2Score: number | null = null;

    if (usesScoreReport) {
      if (rawPlayer1Score === undefined || rawPlayer2Score === undefined) {
        return NextResponse.json(
          { error: 'player1_score and player2_score are required for this match' },
          { status: 400 }
        );
      }

      if (rawPlayer1Score === null || rawPlayer2Score === null) {
        return NextResponse.json(
          { error: 'Scores must be whole numbers that are 0 or higher' },
          { status: 400 }
        );
      }

      reportedPlayer1Score = rawPlayer1Score;
      reportedPlayer2Score = rawPlayer2Score;

      winnerId =
        reportedPlayer1Score > reportedPlayer2Score
          ? match.player1_id
          : reportedPlayer1Score < reportedPlayer2Score
            ? match.player2_id
            : null;
    } else {
      if (!winnerId) {
        return NextResponse.json({ error: 'winner_id is required' }, { status: 400 });
      }

      if (winnerId !== match.player1_id && winnerId !== match.player2_id) {
        return NextResponse.json({ error: 'Invalid winner' }, { status: 400 });
      }
    }

    const isPlayer1 = authUser.id === match.player1_id;
    const reportField = isPlayer1 ? 'player1_reported_winner' : 'player2_reported_winner';
    const reportUpdate: Record<string, string | number | null> = { [reportField]: winnerId };

    if (usesScoreReport && reportedPlayer1Score !== null && reportedPlayer2Score !== null) {
      if (isPlayer1) {
        reportUpdate.player1_reported_player1_score = reportedPlayer1Score;
        reportUpdate.player1_reported_player2_score = reportedPlayer2Score;
      } else {
        reportUpdate.player2_reported_player1_score = reportedPlayer1Score;
        reportUpdate.player2_reported_player2_score = reportedPlayer2Score;
      }
    }

    const { data: updatedMatchRaw, error: updateError } = await supabase
      .from('matches')
      .update(reportUpdate)
      .eq('id', id)
      .select('*')
      .single();

    const updatedMatch = updatedMatchRaw as Match | null;

    if (updateError || !updatedMatch) {
      return NextResponse.json({ error: 'Failed to submit report' }, { status: 500 });
    }

    const p1Reported = updatedMatch.player1_reported_winner;
    const p2Reported = updatedMatch.player2_reported_winner;
    const p1ScoreReady =
      updatedMatch.player1_reported_player1_score !== null &&
      updatedMatch.player1_reported_player1_score !== undefined &&
      updatedMatch.player1_reported_player2_score !== null &&
      updatedMatch.player1_reported_player2_score !== undefined;
    const p2ScoreReady =
      updatedMatch.player2_reported_player1_score !== null &&
      updatedMatch.player2_reported_player1_score !== undefined &&
      updatedMatch.player2_reported_player2_score !== null &&
      updatedMatch.player2_reported_player2_score !== undefined;

    const scoreReportsReady = usesScoreReport && p1ScoreReady && p2ScoreReady;
    const winnerReportsReady = !usesScoreReport && Boolean(p1Reported && p2Reported);

    if (scoreReportsReady || winnerReportsReady) {
      const scoreMismatch =
        usesScoreReport &&
        (!p1ScoreReady ||
          !p2ScoreReady ||
          updatedMatch.player1_reported_player1_score !==
            updatedMatch.player2_reported_player1_score ||
          updatedMatch.player1_reported_player2_score !==
            updatedMatch.player2_reported_player2_score);

      if ((!usesScoreReport && p1Reported !== p2Reported) || scoreMismatch) {
        await supabase
          .from('matches')
          .update({
            status: 'disputed',
            dispute_requested_by: authUser.id,
          })
          .eq('id', id);

        const gameLabel = GAMES[updatedMatch.game as GameKey]?.label ?? updatedMatch.game;
        const { data: disputeProfilesRaw } = await supabase
          .from('profiles')
          .select('id, username, email, whatsapp_number, whatsapp_notifications')
          .in('id', [match.player1_id, match.player2_id]);

        const disputeProfiles = (disputeProfilesRaw ?? []) as Array<
          Pick<ProfileRow, 'id' | 'username' | 'email' | 'whatsapp_number' | 'whatsapp_notifications'>
        >;
        const player1 = disputeProfiles.find((profile) => profile.id === match.player1_id);
        const player2 = disputeProfiles.find((profile) => profile.id === match.player2_id);

        if (player1?.email && player2) {
          sendMatchDisputeEmail({
            to: player1.email,
            username: player1.username,
            opponentUsername: player2.username,
            game: gameLabel,
            matchId: id,
          }).catch(console.error);
        }

        if (
          player1?.whatsapp_notifications &&
          player1.whatsapp_number &&
          player2
        ) {
          notifyMatchDispute({
            whatsappNumber: player1.whatsapp_number,
            username: player1.username,
            opponentUsername: player2.username,
            game: gameLabel,
            matchId: id,
          }).catch(console.error);
        }

        if (player2?.email && player1) {
          sendMatchDisputeEmail({
            to: player2.email,
            username: player2.username,
            opponentUsername: player1.username,
            game: gameLabel,
            matchId: id,
          }).catch(console.error);
        }

        if (
          player2?.whatsapp_notifications &&
          player2.whatsapp_number &&
          player1
        ) {
          notifyMatchDispute({
            whatsappNumber: player2.whatsapp_number,
            username: player2.username,
            opponentUsername: player1.username,
            game: gameLabel,
            matchId: id,
          }).catch(console.error);
        }

        await createNotifications(
          [match.player1_id, match.player2_id].map((userId) => ({
            user_id: userId,
            type: 'match_disputed' as const,
            title: 'Match sent to review',
            body: 'Your reports did not match. Upload proof if needed and we will sort it out.',
            href: `/match/${id}`,
            metadata: {
              match_id: id,
              game: updatedMatch.game,
            },
          })),
          supabase
        );

        await createMatchChatMessage({
          matchId: id,
          senderType: 'system',
          body: 'Reports did not match. This match is now disputed while proof or admin review resolves it.',
          meta: {
            event: 'match_disputed',
            disputed_by: authUser.id,
          },
        });

        return NextResponse.json({ status: 'disputed' });
      }

      const gameLabel = GAMES[game]?.label ?? game;
      const finalPlayer1Score = usesScoreReport
        ? updatedMatch.player1_reported_player1_score ?? null
        : null;
      const finalPlayer2Score = usesScoreReport
        ? updatedMatch.player1_reported_player2_score ?? null
        : null;
      const finalWinnerId =
        usesScoreReport && finalPlayer1Score !== null && finalPlayer2Score !== null
          ? finalPlayer1Score > finalPlayer2Score
            ? match.player1_id
            : finalPlayer1Score < finalPlayer2Score
              ? match.player2_id
              : null
          : p1Reported;
      const isDraw =
        usesScoreReport &&
        finalPlayer1Score !== null &&
        finalPlayer2Score !== null &&
        finalPlayer1Score === finalPlayer2Score;

      if (isDraw) {
        const { error: drawUpdateError } = await supabase
          .from('matches')
          .update({
            status: 'completed',
            winner_id: null,
            rating_change_p1: 0,
            rating_change_p2: 0,
            player1_score: finalPlayer1Score,
            player2_score: finalPlayer2Score,
            completed_at: new Date().toISOString(),
            gamification_summary_p1: null,
            gamification_summary_p2: null,
          })
          .eq('id', id);

        if (drawUpdateError) {
          return NextResponse.json({ error: 'Failed to finalize draw' }, { status: 500 });
        }

        const scoreline = formatScoreline(finalPlayer1Score, finalPlayer2Score);
        await createNotifications(
          [match.player1_id, match.player2_id].map((userId) => ({
            user_id: userId,
            type: 'match_completed' as const,
            title: 'Draw confirmed',
            body: `${gameLabel} ended ${scoreline}. Both score reports matched.`,
            href: `/match/${id}`,
            metadata: {
              match_id: id,
              game,
              winner_id: null,
              result: 'draw',
              player1_score: finalPlayer1Score,
              player2_score: finalPlayer2Score,
            },
          })),
          supabase
        );

        await createMatchChatMessage({
          matchId: id,
          senderType: 'system',
          body: `Draw confirmed at ${scoreline}. This match is now closed.`,
          meta: {
            event: 'match_completed',
            result: 'draw',
            player1_score: finalPlayer1Score,
            player2_score: finalPlayer2Score,
          },
        });

        return NextResponse.json({
          status: 'completed',
          result: 'draw',
          winner_id: null,
          player1_score: finalPlayer1Score,
          player2_score: finalPlayer2Score,
          gamification: null,
        });
      }

      if (!finalWinnerId) {
        return NextResponse.json({ error: 'Could not determine match winner' }, { status: 400 });
      }

      const winnerId = finalWinnerId;
      const loserId = winnerId === match.player1_id ? match.player2_id : match.player1_id;
      const winnerIsPlayer1 = winnerId === match.player1_id;
      const ratingKey = getGameRatingKey(game);
      const winsKey = getGameWinsKey(game);
      const lossesKey = getGameLossesKey(game);

      const { data: profilesRaw, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', [winnerId, loserId]);

      const profiles = (profilesRaw ?? []) as ProfileRow[];
      const winnerProfile = profiles.find((profile) => profile.id === winnerId);
      const loserProfile = profiles.find((profile) => profile.id === loserId);

      if (profilesError || !winnerProfile || !loserProfile) {
        return NextResponse.json({ error: 'Failed to load player profiles' }, { status: 500 });
      }

      const winnerRating = getNumericValue(winnerProfile, ratingKey, 1000);
      const loserRating = getNumericValue(loserProfile, ratingKey, 1000);
      const { newRatingWinner, newRatingLoser, changeWinner, changeLoser } = calculateElo(
        winnerRating,
        loserRating
      );

      const winnerCurrentLevel = getNumericValue(winnerProfile, 'level', 1) || 1;
      const loserCurrentLevel = getNumericValue(loserProfile, 'level', 1) || 1;
      const todayNairobi = getNairobiDateStamp();
      const winnerFirstMatchToday = getDateStamp(winnerProfile.last_match_date) !== todayNairobi;
      const loserFirstMatchToday = getDateStamp(loserProfile.last_match_date) !== todayNairobi;

      const winnerNewStreak = getNumericValue(winnerProfile, 'win_streak') + 1;
      const loserNewStreak = 0;
      const winnerNewMaxStreak = Math.max(
        getNumericValue(winnerProfile, 'max_win_streak'),
        winnerNewStreak
      );
      const loserNewMaxStreak = getNumericValue(loserProfile, 'max_win_streak');

      const winnerBaseXp =
        XP_RULES.win +
        (winnerNewStreak >= 3 ? XP_RULES.winStreakBonus : 0) +
        (winnerFirstMatchToday ? XP_RULES.firstMatchOfDayBonus : 0);
      const loserBaseXp =
        XP_RULES.loss + (loserFirstMatchToday ? XP_RULES.firstMatchOfDayBonus : 0);
      const winnerBaseMp = MP_RULES.win;
      const loserBaseMp = MP_RULES.loss;

      const { data: achievementRows, error: achievementError } = await supabase
        .from('achievements')
        .select('user_id, achievement_key')
        .in('user_id', [winnerId, loserId]);

      const achievementsSupported = !achievementError;
      const unlockedRows =
        ((achievementRows as Array<{ user_id: string; achievement_key: string }> | null) ?? []);
      const winnerUnlocked = unlockedRows
        .filter((row) => row.user_id === winnerId)
        .map((row) => row.achievement_key);
      const loserUnlocked = unlockedRows
        .filter((row) => row.user_id === loserId)
        .map((row) => row.achievement_key);

      const winnerTotalWins = getTotalWins(winnerProfile) + 1;
      const winnerTotalLosses = getTotalLosses(winnerProfile);
      const loserTotalWins = getTotalWins(loserProfile);
      const loserTotalLosses = getTotalLosses(loserProfile) + 1;

      const winnerAchievements = achievementsSupported
        ? evaluateAchievements({
            totalWins: winnerTotalWins,
            winStreak: winnerNewStreak,
            gameWins: getGameWinsMap(winnerProfile, game, true),
            totalMatches: winnerTotalWins + winnerTotalLosses,
            achievementsUnlocked: winnerUnlocked,
            eloAfterWin: newRatingWinner,
          })
        : [];

      const loserAchievements = achievementsSupported
        ? evaluateAchievements({
            totalWins: loserTotalWins,
            winStreak: loserNewStreak,
            gameWins: getGameWinsMap(loserProfile, game, false),
            totalMatches: loserTotalWins + loserTotalLosses,
            achievementsUnlocked: loserUnlocked,
          })
        : [];

      const winnerAchievementXp = winnerAchievements.reduce(
        (total, achievement) => total + achievement.xpReward,
        0
      );
      const loserAchievementXp = loserAchievements.reduce(
        (total, achievement) => total + achievement.xpReward,
        0
      );
      const winnerAchievementMp = winnerAchievements.reduce(
        (total, achievement) => total + achievement.mpReward,
        0
      );
      const loserAchievementMp = loserAchievements.reduce(
        (total, achievement) => total + achievement.mpReward,
        0
      );

      const winnerXpEarned = winnerBaseXp + winnerAchievementXp;
      const loserXpEarned = loserBaseXp + loserAchievementXp;
      const winnerMpEarned = winnerBaseMp + winnerAchievementMp;
      const loserMpEarned = loserBaseMp + loserAchievementMp;

      const winnerNewLevel = getLevelFromXp(
        getNumericValue(winnerProfile, 'xp') + winnerXpEarned
      );
      const loserNewLevel = getLevelFromXp(
        getNumericValue(loserProfile, 'xp') + loserXpEarned
      );

      const winnerSummary: GamificationResult = {
        xpEarned: winnerXpEarned,
        mpEarned: winnerMpEarned,
        newLevel: winnerNewLevel,
        leveledUp: winnerNewLevel > winnerCurrentLevel,
        newStreak: winnerNewStreak,
        newAchievements: winnerAchievements.map(toAchievementUnlock),
      };

      const loserSummary: GamificationResult = {
        xpEarned: loserXpEarned,
        mpEarned: loserMpEarned,
        newLevel: loserNewLevel,
        leveledUp: loserNewLevel > loserCurrentLevel,
        newStreak: loserNewStreak,
        newAchievements: loserAchievements.map(toAchievementUnlock),
      };

      const ratingChangeP1 = winnerIsPlayer1 ? changeWinner : changeLoser;
      const ratingChangeP2 = winnerIsPlayer1 ? changeLoser : changeWinner;
      const gamificationSummaryP1 = winnerIsPlayer1 ? winnerSummary : loserSummary;
      const gamificationSummaryP2 = winnerIsPlayer1 ? loserSummary : winnerSummary;

      const { data: finalizeData, error: finalizeError } = await supabase.rpc(
        'finalize_match_with_gamification',
        {
          p_match_id: id,
          p_winner_id: winnerId,
          p_winner_rating: newRatingWinner,
          p_loser_rating: newRatingLoser,
          p_rating_change_p1: ratingChangeP1,
          p_rating_change_p2: ratingChangeP2,
          p_rating_key: ratingKey,
          p_wins_key: winsKey,
          p_losses_key: lossesKey,
          p_winner_xp_gain: winnerXpEarned,
          p_loser_xp_gain: loserXpEarned,
          p_winner_mp_gain: winnerMpEarned,
          p_loser_mp_gain: loserMpEarned,
          p_winner_level: winnerNewLevel,
          p_loser_level: loserNewLevel,
          p_winner_streak: winnerNewStreak,
          p_loser_streak: loserNewStreak,
          p_winner_max_streak: winnerNewMaxStreak,
          p_loser_max_streak: loserNewMaxStreak,
          p_match_date: todayNairobi,
          p_winner_achievement_keys: winnerAchievements.map((achievement) => achievement.key),
          p_loser_achievement_keys: loserAchievements.map((achievement) => achievement.key),
          p_gamification_summary_p1: gamificationSummaryP1,
          p_gamification_summary_p2: gamificationSummaryP2,
        }
      );

      let responseSummary: GamificationResult | null = isPlayer1
        ? gamificationSummaryP1
        : gamificationSummaryP2;

      if (finalizeError) {
        if (!shouldUseLegacyFallback(finalizeError)) {
          console.error('[Match Report] RPC finalize error:', finalizeError);
          return NextResponse.json({ error: 'Failed to finalize match' }, { status: 500 });
        }

        const legacyCompleted = await finalizeLegacyMatch({
          supabase,
          matchId: id,
          winnerId,
          loserId,
          game,
          newRatingWinner,
          newRatingLoser,
          ratingChangeP1,
          ratingChangeP2,
          finalPlayer1Score,
          finalPlayer2Score,
        });

        if (!legacyCompleted) {
          return NextResponse.json({ error: 'Failed to finalize match' }, { status: 500 });
        }

        responseSummary = null;
      } else if (finalizeData) {
        const rpcResult = finalizeData as RpcResult;
        responseSummary = isPlayer1
          ? rpcResult.gamification_summary_p1 ?? responseSummary
          : rpcResult.gamification_summary_p2 ?? responseSummary;

        if (usesScoreReport) {
          await supabase
            .from('matches')
            .update({
              player1_score: finalPlayer1Score,
              player2_score: finalPlayer2Score,
            })
            .eq('id', id);
        }
      }

      await sendCompletionNotifications({
        winnerProfile,
        loserProfile,
        gameLabel,
        winnerRankLabel: getRankDivision(newRatingWinner).label,
        loserRankLabel: getRankDivision(newRatingLoser).label,
        winnerLevel: winnerNewLevel,
        loserLevel: loserNewLevel,
      });

      if (match.tournament_id) {
        await advanceTournamentAfterMatch({
          supabase,
          matchId: id,
          winnerId,
        });
      }

      await createNotifications(
        [
          {
            user_id: winnerId,
            type: 'match_completed' as const,
            title: 'Result confirmed',
            body:
              usesScoreReport && finalPlayer1Score !== null && finalPlayer2Score !== null
                ? `You won ${gameLabel} ${formatScoreline(finalPlayer1Score, finalPlayer2Score)}.`
                : `You won your ${gameLabel} match.`,
            href: `/match/${id}`,
            metadata: {
              match_id: id,
              game,
              winner_id: winnerId,
              player1_score: finalPlayer1Score,
              player2_score: finalPlayer2Score,
            },
          },
          {
            user_id: loserId,
            type: 'match_completed' as const,
            title: 'Result confirmed',
            body:
              usesScoreReport && finalPlayer1Score !== null && finalPlayer2Score !== null
                ? `${winnerProfile.username} won ${gameLabel} ${formatScoreline(finalPlayer1Score, finalPlayer2Score)}.`
                : `${winnerProfile.username} won your ${gameLabel} match.`,
            href: `/match/${id}`,
            metadata: {
              match_id: id,
              game,
              winner_id: winnerId,
              player1_score: finalPlayer1Score,
              player2_score: finalPlayer2Score,
            },
          },
        ],
        supabase
      );

      await processMatchRewardMilestones(supabase, {
        matchId: id,
        matchDate: todayNairobi,
        winner: {
          id: winnerId,
          totalMatchesBefore: getTotalWins(winnerProfile) + getTotalLosses(winnerProfile),
          firstMatchToday: winnerFirstMatchToday,
          newStreak: winnerNewStreak,
          invitedBy: winnerProfile.invited_by ?? null,
          chezahubUserId: winnerProfile.chezahub_user_id ?? null,
          previousLifetimeRp: getNumericValue(winnerProfile, 'reward_points_lifetime'),
        },
        loser: {
          id: loserId,
          totalMatchesBefore: getTotalWins(loserProfile) + getTotalLosses(loserProfile),
          firstMatchToday: loserFirstMatchToday,
          invitedBy: loserProfile.invited_by ?? null,
          chezahubUserId: loserProfile.chezahub_user_id ?? null,
        },
      });

      await maybeClaimLeaderboardTop3Bounty({
        requestOrigin: request.nextUrl.origin,
        supabase,
        winnerId,
        game,
      });

      await createMatchChatMessage({
        matchId: id,
        senderType: 'system',
        body:
          usesScoreReport && finalPlayer1Score !== null && finalPlayer2Score !== null
            ? `Result confirmed. ${winnerProfile.username} won ${formatScoreline(finalPlayer1Score, finalPlayer2Score)}.`
            : `Result confirmed. ${winnerProfile.username} won the match.`,
        meta: {
          event: 'match_completed',
          winner_id: winnerId,
          player1_score: finalPlayer1Score,
          player2_score: finalPlayer2Score,
        },
      });

      return NextResponse.json({
        status: 'completed',
        winner_id: winnerId,
        player1_score: finalPlayer1Score,
        player2_score: finalPlayer2Score,
        gamification: responseSummary,
      });
    }

    const opponentId = isPlayer1 ? match.player2_id : match.player1_id;
    const pendingScoreline =
      usesScoreReport && reportedPlayer1Score !== null && reportedPlayer2Score !== null
        ? formatScoreline(reportedPlayer1Score, reportedPlayer2Score)
        : null;

    await createNotifications(
      [
        {
          user_id: opponentId,
          type: 'match_reported' as const,
          title: 'Your opponent reported the result',
          body: pendingScoreline
            ? `${GAMES[game]?.label ?? game} score submitted: ${pendingScoreline}. Confirm to lock it in.`
            : `Open the match and confirm the ${GAMES[game]?.label ?? game} result.`,
          href: `/match/${id}`,
          metadata: {
            match_id: id,
            game,
            winner_id: winnerId,
            player1_score: reportedPlayer1Score,
            player2_score: reportedPlayer2Score,
          },
        },
      ],
      supabase
    );

    await createMatchChatMessage({
      matchId: id,
      senderType: 'system',
      body: `${authUser.username} submitted a result. Waiting for the other player to confirm it.`,
      meta: {
        event: 'match_reported',
        reported_by: authUser.id,
        player1_score: reportedPlayer1Score,
        player2_score: reportedPlayer2Score,
      },
    });

    return NextResponse.json({ status: 'waiting_for_opponent' });
  } catch (err) {
    console.error('[Match Report] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
