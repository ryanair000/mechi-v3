import {
  GAMES,
  getCanonicalGameKey,
  getConfiguredPlatformForGame,
  getGameIdValue,
  normalizeSelectedGameKeys,
} from '@/lib/config';
export {
  assessTeamRoster,
  type TeamRosterAssessment,
} from '@/lib/team-roster-assessment';
import type { GameKey, PlatformKey } from '@/types';

export type TeamRosterRole = 'starter' | 'substitute';

export type TeamRosterCandidate = {
  member_id: string;
  user_id: string;
  username: string;
  team_role: string;
  roster_role: TeamRosterRole;
  platform: PlatformKey | null;
  player_id: string;
  eligible: boolean;
  blocker: string | null;
  selected: boolean;
};

type TeamMemberRecord = {
  id?: unknown;
  user_id?: unknown;
  role?: unknown;
  profile?: unknown;
};

export function buildTeamRosterCandidate(
  member: TeamMemberRecord,
  gameValue: string,
  existing?: { roster_role?: unknown } | null
): TeamRosterCandidate {
  const game = getCanonicalGameKey(gameValue as GameKey);
  const profile = (member.profile ?? {}) as Record<string, unknown>;
  const gameIds = (profile.game_ids ?? {}) as Record<string, string>;
  const platforms = Array.isArray(profile.platforms)
    ? (profile.platforms as PlatformKey[])
    : [];
  const selectedGames = normalizeSelectedGameKeys(
    Array.isArray(profile.selected_games) ? profile.selected_games : []
  );
  const platform = getConfiguredPlatformForGame(game, gameIds, platforms);
  const playerId = platform ? getGameIdValue(gameIds, game, platform).trim() : '';
  const gameSelected = selectedGames.includes(game);
  const blocker = !gameSelected
    ? `Add ${GAMES[game]?.label ?? game} to this player profile.`
    : !platform
      ? 'Choose a supported platform on this player profile.'
      : !playerId
        ? `Add the ${GAMES[game]?.label ?? game} player name or ID.`
        : null;
  const teamRole = String(member.role ?? 'member');

  return {
    member_id: String(member.id ?? ''),
    user_id: String(member.user_id ?? ''),
    username: String(profile.username ?? 'Player'),
    team_role: teamRole,
    roster_role:
      existing?.roster_role === 'substitute' || teamRole === 'substitute'
        ? 'substitute'
        : 'starter',
    platform,
    player_id: playerId,
    eligible: blocker === null,
    blocker,
    selected: Boolean(existing) || ['captain', 'starter', 'substitute'].includes(teamRole),
  };
}

const TEAM_OPERATION_ERRORS: Array<[string, string]> = [
  ['ROSTER_STARTER_COUNT', 'Select the exact number of starters required by this tournament.'],
  ['ROSTER_TOO_LARGE', 'A tournament roster can include at most two substitutes.'],
  ['ROSTER_BLOCKED', 'Every selected player must finish their game setup before registration.'],
  ['ROSTER_PLATFORM_MISMATCH', 'Every roster player must use the tournament platform.'],
  ['ROSTER_DUPLICATE_PLAYER', 'A player can appear only once in a team roster.'],
  ['ROSTER_PLAYER_NOT_ACTIVE', 'Every roster player must be an active team member.'],
  ['PLAYER_ALREADY_REGISTERED', 'A roster player is already locked to another team in this tournament.'],
  ['TEAM_ALREADY_JOINED', 'This team is already registered for the tournament.'],
  ['TEAM_PAYMENT_PENDING', 'Finish the current team entry payment before trying again.'],
  ['TOURNAMENT_FULL', 'This tournament is full.'],
  ['TOURNAMENT_NOT_OPEN', 'This tournament is not open for registration.'],
  ['TOURNAMENT_NOT_APPROVED', 'This paid tournament is still awaiting Mechi approval.'],
  ['TEAM_ENTRY_NOT_ALLOWED', 'This tournament accepts solo players, not teams.'],
  ['TEAM_MANAGE_FORBIDDEN', 'Only the team owner or a captain can do that.'],
  ['OWNER_TRANSFER_REQUIRED', 'Transfer team ownership before leaving.'],
  ['OWNER_ROLE_LOCKED', 'Transfer team ownership before changing the owner role.'],
  ['TEAM_MEMBER_EXISTS', 'That player is already an active team member.'],
  ['INVITATION_PENDING', 'That player already has a pending invitation.'],
  ['INVITATION_NOT_PENDING', 'This invitation is no longer waiting for a response.'],
  ['INVITATION_FORBIDDEN', 'This invitation belongs to another player.'],
  ['INVITATION_NOT_FOUND', 'Invitation not found.'],
  ['TEAM_MEMBER_NOT_FOUND', 'Active team member not found.'],
  ['TEAM_NOT_FOUND', 'Team not found.'],
];

export function getTeamOperationErrorMessage(error: {
  message?: string;
  code?: string;
} | null | undefined) {
  if (error?.code === '42883') {
    return 'Team transactions are not ready. Apply the latest Supabase migration.';
  }

  const message = String(error?.message ?? '').toUpperCase();
  return (
    TEAM_OPERATION_ERRORS.find(([code]) => message.includes(code))?.[1] ??
    'The team action could not be completed.'
  );
}
