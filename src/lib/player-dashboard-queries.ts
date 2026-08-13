import type { SupabaseClient } from '@supabase/supabase-js';

export type DashboardRow = Record<string, unknown>;

const PROFILE_FIELDS = [
  'id',
  'username',
  'avatar_url',
  'region',
  'selected_games',
  'platforms',
  'game_ids',
  'level',
  'xp',
  'win_streak',
  'reward_points_available',
].join(', ');

const MATCH_FIELDS = [
  'id',
  'player1_id',
  'player2_id',
  'game',
  'platform',
  'participant_mode',
  'team_size',
  'status',
  'winner_id',
  'player1_score',
  'player2_score',
  'rating_change_p1',
  'rating_change_p2',
  'player1_reported_winner',
  'player2_reported_winner',
  'player1_reported_player1_score',
  'player1_reported_player2_score',
  'player2_reported_player1_score',
  'player2_reported_player2_score',
  'created_at',
  'completed_at',
  'player1:player1_id(id, username, avatar_url)',
  'player2:player2_id(id, username, avatar_url)',
].join(', ');

const TOURNAMENT_FIELDS = [
  'id',
  'slug',
  'title',
  'game',
  'platform',
  'region',
  'status',
  'size',
  'scheduled_for',
  'entry_fee',
  'prize_pool',
  'is_featured',
  'organizer:organizer_id(id, username)',
].join(', ');

export async function fetchPlayerDashboardRecords(
  supabase: SupabaseClient,
  userId: string,
  nowIso: string
) {
  const [
    profile,
    matches,
    registrations,
    tournaments,
    unread,
    receivedChallenges,
    sentChallenges,
    teams,
    teamInvitations,
  ] = await Promise.all([
    supabase.from('profiles').select(PROFILE_FIELDS).eq('id', userId).single(),
    supabase
      .from('matches')
      .select(MATCH_FIELDS)
      .or(`player1_id.eq.${userId},player2_id.eq.${userId}`)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('tournament_players')
      .select(
        `id, seed, payment_status, check_in_status, joined_at, tournament:tournament_id(${TOURNAMENT_FIELDS})`
      )
      .eq('user_id', userId)
      .in('payment_status', ['paid', 'free', 'pending', 'failed'])
      .order('joined_at', { ascending: false })
      .limit(8),
    supabase
      .from('tournaments')
      .select(TOURNAMENT_FIELDS)
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
      .select(
        'id, game, platform, expires_at, created_at, challenger:challenger_id(id, username, avatar_url)',
        { count: 'exact' }
      )
      .eq('opponent_id', userId)
      .eq('status', 'pending')
      .gt('expires_at', nowIso)
      .order('created_at', { ascending: false })
      .limit(3),
    supabase
      .from('match_challenges')
      .select('id', { count: 'exact', head: true })
      .eq('challenger_id', userId)
      .eq('status', 'pending')
      .gt('expires_at', nowIso),
    supabase
      .from('team_members')
      .select('id, role, team:team_id(id, name, slug, avatar_url)')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('joined_at', { ascending: false })
      .limit(3),
    supabase
      .from('team_invitations')
      .select(
        'id, expires_at, team:team_id(id, name, slug), inviter:inviter_id(id, username)',
        { count: 'exact' }
      )
      .eq('invitee_id', userId)
      .eq('status', 'pending')
      .gt('expires_at', nowIso)
      .order('created_at', { ascending: false })
      .limit(1),
  ]);

  return {
    profile,
    matches,
    registrations,
    tournaments,
    unread,
    receivedChallenges,
    sentChallenges,
    teams,
    teamInvitations,
  };
}

export async function fetchPlayerTeamTournamentEntries(
  supabase: SupabaseClient,
  teamIds: string[]
) {
  if (teamIds.length === 0) {
    return { data: [], error: null };
  }

  return supabase
    .from('tournament_team_entries')
    .select(
      `id, team_id, registered_by, payment_status, check_in_status, roster_locked_at, joined_at, team:team_id(id, name, slug), tournament:tournament_id(${TOURNAMENT_FIELDS})`
    )
    .in('team_id', teamIds)
    .in('payment_status', ['paid', 'free', 'pending', 'failed'])
    .order('joined_at', { ascending: false })
    .limit(12);
}

export function hasPlayerReport(
  match: DashboardRow,
  player: 'player1' | 'player2'
) {
  const winner = match[`${player}_reported_winner`];
  const player1Score = match[`${player}_reported_player1_score`];
  const player2Score = match[`${player}_reported_player2_score`];
  return (
    (winner !== null && winner !== undefined && String(winner).length > 0) ||
    (player1Score !== null &&
      player1Score !== undefined &&
      player2Score !== null &&
      player2Score !== undefined)
  );
}
