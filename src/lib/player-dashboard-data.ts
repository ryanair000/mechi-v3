import type { SupabaseClient } from '@supabase/supabase-js';
import {
  buildPlayerDashboardTodayItems,
  choosePlayerDashboardAction,
  type PlayerDashboardPriorityInput,
} from '@/lib/player-dashboard-priority';
import {
  fetchPlayerDashboardRecords,
  fetchPlayerTeamTournamentEntries,
  type DashboardRow,
} from '@/lib/player-dashboard-queries';
import {
  dashboardMatchContext,
  getDashboardMatchStates,
  mapDashboardMatches,
} from '@/lib/player-dashboard-matches';
import {
  buildDashboardProfileSetup,
  dashboardGameLabel,
} from '@/lib/player-dashboard-profile';
import {
  getTournamentCheckInDate,
  parseTournamentSchedule,
} from '@/lib/tournament-schedule';

function eatDateTime(value: unknown) {
  const date = parseTournamentSchedule(String(value ?? ''));
  if (!date) return 'schedule to be announced';
  return new Intl.DateTimeFormat('en-KE', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Africa/Nairobi',
  }).format(date);
}

function tournamentContext(entry: { tournament: DashboardRow }) {
  const scheduledAt = entry.tournament.scheduled_for
    ? String(entry.tournament.scheduled_for)
    : null;
  return {
    id: String(entry.tournament.id),
    slug: String(entry.tournament.slug),
    title: String(entry.tournament.title),
    gameLabel: dashboardGameLabel(entry.tournament.game),
    scheduledAt,
    scheduledLabel: eatDateTime(scheduledAt),
  };
}

export async function loadPlayerDashboardData(
  supabase: SupabaseClient,
  userId: string
) {
  const now = new Date();
  const nowIso = now.toISOString();
  const records = await fetchPlayerDashboardRecords(supabase, userId, nowIso);
  if (records.profile.error || !records.profile.data) {
    console.error('[Player dashboard] Profile query failed', records.profile.error);
    return null;
  }

  const profile = records.profile.data as unknown as DashboardRow;
  const profileSetup = buildDashboardProfileSetup(profile);
  const matches = mapDashboardMatches(
    (records.matches.data ?? []) as unknown as DashboardRow[],
    userId
  );
  const matchStates = getDashboardMatchStates(matches);
  const registrations = ((records.registrations.data ?? []) as unknown as DashboardRow[]).filter(
    (row) => row.tournament
  );
  const memberships = (records.teams.data ?? []) as DashboardRow[];
  const membershipTeamIds = memberships
    .map((membership) => String((membership.team as DashboardRow | null)?.id ?? ''))
    .filter(Boolean);
  const teamRegistrationsResult = await fetchPlayerTeamTournamentEntries(
    supabase,
    membershipTeamIds
  );
  const teamRegistrations = (
    (teamRegistrationsResult.data ?? []) as unknown as DashboardRow[]
  ).filter((row) => row.tournament);
  const allRegistrations = [...registrations, ...teamRegistrations];
  const activeRegistrations = allRegistrations
    .map((registration) => ({
      registration,
      tournament: registration.tournament as DashboardRow,
    }))
    .filter(({ tournament }) =>
      ['open', 'active', 'full'].includes(String(tournament.status))
    )
    .sort((a, b) => {
      const first =
        parseTournamentSchedule(String(a.tournament.scheduled_for ?? ''))?.getTime() ??
        Number.POSITIVE_INFINITY;
      const second =
        parseTournamentSchedule(String(b.tournament.scheduled_for ?? ''))?.getTime() ??
        Number.POSITIVE_INFINITY;
      return first - second;
    });

  const confirmed = (value: unknown) => ['paid', 'free'].includes(String(value));
  const checkIn = activeRegistrations.find(({ registration, tournament }) => {
    if (!confirmed(registration.payment_status)) return false;
    if (registration.check_in_status === 'checked_in') return false;
    if (tournament.status === 'active') return true;
    const opensAt = getTournamentCheckInDate(String(tournament.scheduled_for ?? ''));
    return Boolean(opensAt && now.getTime() >= opensAt.getTime());
  });
  const payment = activeRegistrations.find(({ registration }) =>
    ['pending', 'failed'].includes(String(registration.payment_status))
  );
  const upcoming = activeRegistrations.find(({ registration }) =>
    confirmed(registration.payment_status)
  );

  const received = (records.receivedChallenges.data ?? []) as DashboardRow[];
  const firstChallenge = received[0];
  const invitations = (records.teamInvitations.data ?? []) as DashboardRow[];
  const firstInvitation = invitations[0];

  const priority: PlayerDashboardPriorityInput = {
    activeMatch: dashboardMatchContext(matchStates.active),
    checkIn: checkIn ? tournamentContext(checkIn) : null,
    incomingChallenge: firstChallenge
      ? {
          id: String(firstChallenge.id),
          challengerName: String(
            (firstChallenge.challenger as DashboardRow | null)?.username ?? 'A player'
          ),
          gameLabel: dashboardGameLabel(firstChallenge.game),
          expiresAt: firstChallenge.expires_at
            ? String(firstChallenge.expires_at)
            : null,
        }
      : null,
    interruptedRegistration: payment
      ? {
          ...tournamentContext(payment),
          paymentStatus: String(payment.registration.payment_status),
        }
      : null,
    resultResponse: matchStates.needsResponse
      ? {
          ...dashboardMatchContext(matchStates.needsResponse)!,
          disputed: matchStates.needsResponse.status === 'disputed',
        }
      : null,
    setupBlocker: profileSetup.blocker,
    upcomingTournament: upcoming ? tournamentContext(upcoming) : null,
  };
  const nextAction = choosePlayerDashboardAction(priority);
  const today = buildPlayerDashboardTodayItems({
    ...priority,
    waitingForOpponent: dashboardMatchContext(matchStates.waiting),
    teamInvitation: firstInvitation
      ? {
          id: String(firstInvitation.id),
          teamName: String(
            (firstInvitation.team as DashboardRow | null)?.name ?? 'a team'
          ),
          inviterName: String(
            (firstInvitation.inviter as DashboardRow | null)?.username ??
              'A captain'
          ),
          expiresAt: firstInvitation.expires_at
            ? String(firstInvitation.expires_at)
            : null,
        }
      : null,
  });

  const registeredIds = new Set(
    allRegistrations.map((row) => String((row.tournament as DashboardRow).id))
  );
  const recommendations =
    nextAction.kind === 'discover'
      ? ((records.tournaments.data ?? []) as unknown as DashboardRow[])
          .filter((row) => !registeredIds.has(String(row.id)))
          .slice(0, 3)
      : [];
  const playerCounts = new Map<string, number>();
  const teamCounts = new Map<string, number>();
  let playerCountError = false;
  if (recommendations.length) {
    const tournamentIds = recommendations.map((row) => String(row.id));
    const [{ data: players, error: playersError }, { data: teams, error: teamsError }] =
      await Promise.all([
        supabase
          .from('tournament_players')
          .select('tournament_id')
          .in('tournament_id', tournamentIds)
          .in('payment_status', ['paid', 'free']),
        supabase
          .from('tournament_team_entries')
          .select('tournament_id')
          .in('tournament_id', tournamentIds)
          .in('payment_status', ['paid', 'free']),
      ]);
    playerCountError = Boolean(playersError || teamsError);
    for (const player of players ?? []) {
      const id = String(player.tournament_id);
      playerCounts.set(id, (playerCounts.get(id) ?? 0) + 1);
    }
    for (const team of teams ?? []) {
      const id = String(team.tournament_id);
      teamCounts.set(id, (teamCounts.get(id) ?? 0) + 1);
    }
  }

  const partialSources = [
    records.matches.error ? 'matches' : null,
    records.registrations.error ? 'tournament registrations' : null,
    records.tournaments.error ? 'tournament recommendations' : null,
    records.unread.error ? 'notifications' : null,
    records.receivedChallenges.error || records.sentChallenges.error
      ? '1v1 invites'
      : null,
    records.teams.error || records.teamInvitations.error ? 'teams' : null,
    teamRegistrationsResult.error ? 'team tournament registrations' : null,
    playerCountError ? 'tournament player counts' : null,
  ].filter((source): source is string => Boolean(source));

  const { game_ids: privateGameIds, platforms: privatePlatforms, ...safeProfile } =
    profile;
  void privateGameIds;
  void privatePlatforms;
  const primaryMembership = memberships[0];
  const primaryTeam = (primaryMembership?.team ?? null) as DashboardRow | null;

  return {
    profile: safeProfile,
    profile_setup: profileSetup.response,
    matches,
    tournaments: allRegistrations,
    recommended: recommendations.map((row) => ({
      ...row,
      player_count:
        row.participant_mode === 'team'
          ? teamCounts.get(String(row.id)) ?? 0
          : playerCounts.get(String(row.id)) ?? 0,
    })),
    unread_notifications: records.unread.count ?? 0,
    incoming_challenges: received,
    one_v_one_summary: {
      incoming_count: records.receivedChallenges.count ?? received.length,
      sent_count: records.sentChallenges.count ?? 0,
    },
    teams: memberships,
    team_summary: {
      membership_count: memberships.length,
      invitation_count: records.teamInvitations.count ?? invitations.length,
      primary_team: primaryTeam
        ? {
            id: primaryTeam.id,
            name: primaryTeam.name,
            slug: primaryTeam.slug,
            role: primaryMembership.role,
          }
        : null,
    },
    next_action: nextAction,
    today,
    partial: partialSources.length > 0,
    partial_sources: partialSources,
    generated_at: nowIso,
  };
}
