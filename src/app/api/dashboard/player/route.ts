import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import { createServiceClient } from '@/lib/supabase';

const PROFILE_FIELDS = [
  'id',
  'username',
  'avatar_url',
  'region',
  'selected_games',
  'level',
  'xp',
  'win_streak',
  'reward_points_available',
  'rating_efootball',
  'rating_efootball_mobile',
  'rating_fc26',
  'rating_mk11',
  'rating_nba2k26',
  'rating_tekken8',
  'rating_sf6',
  'rating_ludo',
  'wins_efootball',
  'wins_efootball_mobile',
  'wins_fc26',
  'wins_mk11',
  'wins_nba2k26',
  'wins_tekken8',
  'wins_sf6',
  'wins_ludo',
  'losses_efootball',
  'losses_efootball_mobile',
  'losses_fc26',
  'losses_mk11',
  'losses_nba2k26',
  'losses_tekken8',
  'losses_sf6',
  'losses_ludo',
].join(', ');

type DataRow = Record<string, unknown>;

export async function GET(request: NextRequest) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) return access.response;

  try {
    const supabase = createServiceClient();
    const userId = access.profile.id;

    const [profileResult, matchesResult, registrationsResult, tournamentsResult, unreadResult, challengesResult, teamsResult] =
      await Promise.all([
        supabase.from('profiles').select(PROFILE_FIELDS).eq('id', userId).single(),
        supabase
          .from('matches')
          .select(
            'id, player1_id, player2_id, game, platform, status, winner_id, player1_score, player2_score, rating_change_p1, rating_change_p2, created_at, completed_at, player1:player1_id(id, username, avatar_url), player2:player2_id(id, username, avatar_url)'
          )
          .or(`player1_id.eq.${userId},player2_id.eq.${userId}`)
          .order('created_at', { ascending: false })
          .limit(8),
        supabase
          .from('tournament_players')
          .select(
            'id, seed, payment_status, check_in_status, joined_at, tournament:tournament_id(id, slug, title, game, platform, status, size, scheduled_for, entry_fee, prize_pool, organizer:organizer_id(id, username))'
          )
          .eq('user_id', userId)
          .in('payment_status', ['paid', 'free', 'pending', 'failed'])
          .order('joined_at', { ascending: false })
          .limit(8),
        supabase
          .from('tournaments')
          .select(
            'id, slug, title, game, platform, region, status, size, scheduled_for, entry_fee, prize_pool, is_featured, organizer:organizer_id(id, username)'
          )
          .eq('approval_status', 'approved')
          .in('status', ['open', 'active'])
          .order('is_featured', { ascending: false })
          .order('scheduled_for', { ascending: true, nullsFirst: false })
          .limit(6),
        supabase
          .from('notifications')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .is('read_at', null),
        supabase
          .from('match_challenges')
          .select('id, game, platform, message, expires_at, challenger:challenger_id(id, username, avatar_url)')
          .eq('opponent_id', userId)
          .eq('status', 'pending')
          .gt('expires_at', new Date().toISOString())
          .order('created_at', { ascending: false })
          .limit(3),
        supabase
          .from('team_members')
          .select('id, role, team:team_id(id, name, slug, avatar_url)')
          .eq('user_id', userId)
          .eq('status', 'active')
          .order('joined_at', { ascending: false })
          .limit(3),
      ]);

    if (profileResult.error || !profileResult.data) {
      console.error('[Player dashboard] Profile query failed', profileResult.error);
      return NextResponse.json({ error: 'Could not load your player dashboard.' }, { status: 500 });
    }

    const matchRows = (matchesResult.data ?? []) as DataRow[];
    const matches = matchRows.map((match) => {
      const isPlayerOne = match.player1_id === userId;
      const opponent = (isPlayerOne ? match.player2 : match.player1) as DataRow | null;
      return {
        id: match.id,
        game: match.game,
        platform: match.platform,
        status: match.status,
        opponent,
        result:
          match.status !== 'completed'
            ? match.status
            : match.winner_id === userId
              ? 'win'
              : match.winner_id
                ? 'loss'
                : 'draw',
        score: isPlayerOne
          ? [match.player1_score, match.player2_score]
          : [match.player2_score, match.player1_score],
        rating_change: isPlayerOne ? match.rating_change_p1 : match.rating_change_p2,
        created_at: match.completed_at ?? match.created_at,
      };
    });

    const registrations = ((registrationsResult.data ?? []) as DataRow[]).filter(
      (row) => row.tournament
    );
    const registeredIds = new Set(
      registrations.map((row) => (row.tournament as DataRow).id as string)
    );
    const recommended = ((tournamentsResult.data ?? []) as DataRow[]).filter(
      (row) => !registeredIds.has(row.id as string)
    );

    const recommendedIds = recommended.map((row) => row.id as string);
    const playerCounts = new Map<string, number>();
    if (recommendedIds.length) {
      const { data: players } = await supabase
        .from('tournament_players')
        .select('tournament_id')
        .in('tournament_id', recommendedIds)
        .in('payment_status', ['paid', 'free']);
      for (const player of players ?? []) {
        const id = player.tournament_id as string;
        playerCounts.set(id, (playerCounts.get(id) ?? 0) + 1);
      }
    }

    const profile = profileResult.data as unknown as DataRow;
    const selectedGames = Array.isArray(profile.selected_games) ? profile.selected_games : [];
    const activeMatch = matches.find((match) => match.status === 'pending' || match.status === 'disputed');
    const incomingChallenges = (challengesResult.data ?? []) as DataRow[];
    const teamMemberships = (teamsResult.data ?? []) as DataRow[];
    const activeRegistrations = registrations
      .map((registration) => ({ registration, tournament: registration.tournament as DataRow }))
      .filter(({ tournament }) => ['open', 'active', 'full'].includes(String(tournament.status)))
      .sort((a, b) => new Date(String(a.tournament.scheduled_for ?? '9999-12-31')).getTime() - new Date(String(b.tournament.scheduled_for ?? '9999-12-31')).getTime());
    const checkInRegistration = activeRegistrations.find(({ registration, tournament }) => {
      if (!['paid', 'free'].includes(String(registration.payment_status))) return false;
      if (registration.check_in_status === 'checked_in') return false;
      if (tournament.status === 'active') return true;
      const scheduledAt = new Date(String(tournament.scheduled_for ?? '')).getTime();
      return Number.isFinite(scheduledAt) && Date.now() >= scheduledAt - 30 * 60 * 1000;
    });
    const pendingPayment = activeRegistrations.find(({ registration }) => registration.payment_status === 'pending' || registration.payment_status === 'failed');
    const nextRegistration = activeRegistrations.find(({ registration }) => ['paid', 'free'].includes(String(registration.payment_status)));

    const nextAction = activeMatch
      ? {
          kind: activeMatch.status === 'disputed' ? 'result_review' : 'active_match',
          eyebrow: activeMatch.status === 'disputed' ? 'Result needs attention' : 'Match ready',
          title: activeMatch.status === 'disputed' ? `Review your result against ${String((activeMatch.opponent as DataRow | null)?.username ?? 'your opponent')}` : `Play ${String((activeMatch.opponent as DataRow | null)?.username ?? 'your opponent')}`,
          description: activeMatch.status === 'disputed' ? 'The result is disputed. Open the match to review the score, messages, and next step.' : `${String(activeMatch.game)} match room is ready. Open it before starting another match.`,
          label: 'Open match room',
          href: `/match/${String(activeMatch.id)}`,
        }
      : checkInRegistration
        ? {
            kind: 'check_in', eyebrow: 'Check-in is open', title: `Check in for ${String(checkInRegistration.tournament.title)}`,
            description: `Confirm that you are ready before ${String(checkInRegistration.tournament.scheduled_for ? new Date(String(checkInRegistration.tournament.scheduled_for)).toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Nairobi' }) : 'the tournament starts')}.`,
            label: 'Check in now', href: `/t/${String(checkInRegistration.tournament.slug)}`,
          }
        : incomingChallenges.length
          ? {
              kind: 'incoming_challenge', eyebrow: '1v1 invite to answer', title: `${String((incomingChallenges[0].challenger as DataRow | null)?.username ?? 'A player')} wants to play`,
              description: `Accept or decline the ${String(incomingChallenges[0].game)} invite before it expires.`, label: 'Answer invite', href: '/challenges',
            }
          : pendingPayment
            ? {
                kind: 'payment', eyebrow: 'Finish registration', title: `Complete ${String(pendingPayment.tournament.title)} registration`,
                description: pendingPayment.registration.payment_status === 'failed' ? 'The previous payment did not complete. Review the registration before trying again.' : 'Your tournament place is waiting for payment confirmation.',
                label: 'Resume registration', href: `/t/${String(pendingPayment.tournament.slug)}`,
              }
            : selectedGames.length === 0
              ? {
                  kind: 'profile_setup', eyebrow: 'Finish player setup', title: 'Choose a game to start playing',
                  description: 'Add at least one game and player name or ID. Mechi will then show suitable tournaments and 1v1 players.', label: 'Choose your games', href: '/profile/settings',
                }
              : nextRegistration
                ? {
                    kind: 'upcoming_tournament', eyebrow: 'Coming up', title: String(nextRegistration.tournament.title),
                    description: `${String(nextRegistration.tournament.game)} · ${String(nextRegistration.tournament.scheduled_for ? new Date(String(nextRegistration.tournament.scheduled_for)).toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Nairobi' }) : 'Schedule to be announced')}`,
                    label: 'View tournament', href: `/t/${String(nextRegistration.tournament.slug)}`,
                  }
                : {
                    kind: 'discover', eyebrow: 'Ready when you are', title: 'Choose how you want to play',
                    description: 'Join a tournament, play a direct 1v1, or create a team with friends.', label: 'Find a tournament', href: '/tournaments', secondary_label: 'Play 1v1', secondary_href: '/challenges',
                  };

    return NextResponse.json({
      profile: profileResult.data,
      matches,
      tournaments: registrations,
      recommended: recommended.map((row) => ({
        ...row,
        player_count: playerCounts.get(row.id as string) ?? 0,
      })),
      unread_notifications: unreadResult.count ?? 0,
      incoming_challenges: incomingChallenges,
      teams: teamMemberships,
      next_action: nextAction,
      partial: Boolean(
        matchesResult.error || registrationsResult.error || tournamentsResult.error || unreadResult.error || challengesResult.error || teamsResult.error
      ),
    });
  } catch (error) {
    console.error('[Player dashboard] Unexpected error', error);
    return NextResponse.json({ error: 'Could not load your player dashboard.' }, { status: 500 });
  }
}
