import type { SupabaseClient } from '@supabase/supabase-js';
import { GAMES, getCanonicalGameKey } from '@/lib/config';
import {
  buildTeamRosterCandidate,
} from '@/lib/team-roster';
import { assessTeamRoster } from '@/lib/team-roster-assessment';
import type { GameKey, TeamMemberRole } from '@/types';

export const TEAM_SELECT =
  'id, name, slug, description, region, avatar_url, visibility, recruiting, owner_id, created_at, updated_at';

export const TEAM_MEMBER_SELECT =
  'id, team_id, user_id, role, status, joined_at, left_at, profile:user_id(id, username, avatar_url, selected_games, platforms, game_ids)';

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

  const [{ data: members }, { data: invitations }, { data: rosterEntries }] = await Promise.all([
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
    supabase
      .from('team_roster_entries')
      .select(
        'id, game, member_id, roster_role, eligibility_status, eligibility_reason, game_account_snapshot, updated_at'
      )
      .eq('team_id', teamId)
      .order('game', { ascending: true }),
  ]);

  return {
    team: access.team,
    viewer_id: userId,
    membership: access.membership,
    can_manage: access.canManage,
    members: members ?? [],
    invitations: invitations ?? [],
    roster_entries: rosterEntries ?? [],
  };
}

export async function getTeamReadiness(
  supabase: SupabaseClient,
  teamId: string,
  gameValue: string,
  requiredStarters = 2,
  requiredPlatform?: string | null
) {
  const canonicalGame = getCanonicalGameKey(gameValue as GameKey);
  if (!GAMES[canonicalGame]) return null;

  const [{ data: memberRows }, { data: rosterRows }] = await Promise.all([
    supabase
      .from('team_members')
      .select(TEAM_MEMBER_SELECT)
      .eq('team_id', teamId)
      .eq('status', 'active')
      .order('joined_at', { ascending: true }),
    supabase
      .from('team_roster_entries')
      .select(
        'id, member_id, roster_role, eligibility_status, eligibility_reason, game_account_snapshot'
      )
      .eq('team_id', teamId)
      .eq('game', canonicalGame),
  ]);

  const rosterByMember = new Map(
    ((rosterRows ?? []) as Array<Record<string, unknown>>).map((row) => [
      String(row.member_id),
      row,
    ])
  );
  const hasSavedRoster = rosterByMember.size > 0;
  const members = ((memberRows ?? []) as Array<Record<string, unknown>>).map((member) => {
    const existing = rosterByMember.get(String(member.id));
    const candidate = buildTeamRosterCandidate(member, canonicalGame, existing);
    const platformMismatch =
      candidate.selected &&
      Boolean(requiredPlatform) &&
      candidate.platform !== requiredPlatform;
    return {
      ...candidate,
      selected: hasSavedRoster ? Boolean(existing) : candidate.selected,
      eligible: candidate.eligible && !platformMismatch,
      blocker: platformMismatch
        ? `Set this player's game account to ${requiredPlatform}.`
        : candidate.blocker,
      roster_entry_id: existing?.id ?? null,
    };
  });
  const assessment = assessTeamRoster(members, requiredStarters);
  const blockers = members.filter((member) => member.selected && !member.eligible);

  return {
    game: canonicalGame,
    game_label: GAMES[canonicalGame].label,
    platform: requiredPlatform ?? members.find((member) => member.platform)?.platform ?? null,
    required_starters: requiredStarters,
    ready: assessment.ready,
    members,
    blockers,
    starter_count: assessment.starter_count,
    substitute_count: assessment.substitute_count,
    summary: assessment.summary,
    blocker_messages: assessment.blockers,
    saved: hasSavedRoster,
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
