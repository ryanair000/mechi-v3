import type { SupabaseClient } from '@supabase/supabase-js';
import { GAMES, getCanonicalGameKey, normalizeSelectedGameKeys } from '@/lib/config';
import type { GameKey, TeamMemberRole } from '@/types';

export const TEAM_SELECT =
  'id, name, slug, description, region, avatar_url, visibility, recruiting, owner_id, created_at, updated_at';

export const TEAM_MEMBER_SELECT =
  'id, team_id, user_id, role, status, joined_at, left_at, profile:user_id(id, username, avatar_url, selected_games, game_ids)';

export type TeamAccess = {
  team: Record<string, unknown>;
  membership: { id: string; role: TeamMemberRole; status: string } | null;
  canManage: boolean;
};

export function cleanTeamName(value: unknown) {
  return String(value ?? '').trim().replace(/\s+/g, ' ').slice(0, 60);
}

export function cleanTeamDescription(value: unknown) {
  const cleaned = String(value ?? '').trim().slice(0, 500);
  return cleaned || null;
}

export async function getTeamAccess(
  supabase: SupabaseClient,
  teamId: string,
  userId: string
): Promise<TeamAccess | null> {
  const [{ data: team }, { data: membership }] = await Promise.all([
    supabase.from('teams').select(TEAM_SELECT).eq('id', teamId).maybeSingle(),
    supabase
      .from('team_members')
      .select('id, role, status')
      .eq('team_id', teamId)
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle(),
  ]);

  if (!team) return null;

  const member = membership as TeamAccess['membership'];
  return {
    team: team as Record<string, unknown>,
    membership: member,
    canManage:
      String((team as Record<string, unknown>).owner_id) === userId ||
      member?.role === 'captain',
  };
}

export async function getTeamDetail(
  supabase: SupabaseClient,
  teamId: string,
  userId: string
) {
  const access = await getTeamAccess(supabase, teamId, userId);
  if (!access) return null;

  const isPublic = access.team.visibility === 'public';
  if (!isPublic && !access.membership) return null;

  const [{ data: members }, { data: invitations }] = await Promise.all([
    supabase
      .from('team_members')
      .select(TEAM_MEMBER_SELECT)
      .eq('team_id', teamId)
      .eq('status', 'active')
      .order('joined_at', { ascending: true }),
    access.canManage
      ? supabase
          .from('team_invitations')
          .select('id, invitee_id, inviter_id, status, expires_at, created_at, invitee:invitee_id(id, username, avatar_url)')
          .eq('team_id', teamId)
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [] }),
  ]);

  return {
    team: access.team,
    membership: access.membership,
    can_manage: access.canManage,
    members: members ?? [],
    invitations: invitations ?? [],
  };
}

export async function getTeamReadiness(
  supabase: SupabaseClient,
  teamId: string,
  gameValue: string
) {
  const canonicalGame = getCanonicalGameKey(gameValue as GameKey);
  if (!GAMES[canonicalGame]) return null;

  const { data } = await supabase
    .from('team_members')
    .select(TEAM_MEMBER_SELECT)
    .eq('team_id', teamId)
    .eq('status', 'active')
    .order('joined_at', { ascending: true });

  const members = ((data ?? []) as Array<Record<string, unknown>>).map((member) => {
    const profile = (member.profile ?? {}) as Record<string, unknown>;
    const selectedGames = normalizeSelectedGameKeys((profile.selected_games as string[]) ?? []);
    const gameIds = (profile.game_ids as Record<string, string> | null) ?? {};
    const selected = selectedGames.includes(canonicalGame);
    const gameId = String(gameIds[canonicalGame] ?? '').trim();
    const eligible = selected && Boolean(gameId);
    return {
      id: member.id,
      user_id: member.user_id,
      username: profile.username ?? 'Player',
      role: member.role,
      eligible,
      blocker: !selected
        ? `Add ${GAMES[canonicalGame].label} to the player profile.`
        : !gameId
          ? `Add the ${GAMES[canonicalGame].label} player name or ID.`
          : null,
    };
  });

  const activePlayers = members.filter((member) =>
    ['captain', 'starter'].includes(String(member.role))
  );
  const blockers = activePlayers.filter((member) => !member.eligible);

  return {
    game: canonicalGame,
    game_label: GAMES[canonicalGame].label,
    ready: activePlayers.length >= 2 && blockers.length === 0,
    members,
    blockers,
    summary:
      activePlayers.length < 2
        ? 'Assign at least two active players before entering a team tournament.'
        : blockers.length
          ? `${blockers.length} player${blockers.length === 1 ? '' : 's'} need to finish game setup.`
          : 'Your active players are ready for this game.',
  };
}

export async function recordTeamAudit(
  supabase: SupabaseClient,
  input: {
    teamId: string;
    actorId: string;
    action: string;
    subjectUserId?: string | null;
    details?: Record<string, unknown>;
  }
) {
  const { error } = await supabase.from('team_audit_logs').insert({
    team_id: input.teamId,
    actor_id: input.actorId,
    action: input.action,
    subject_user_id: input.subjectUserId ?? null,
    details: input.details ?? {},
  });
  if (error) console.error('[Teams] Audit insert failed', error);
}

