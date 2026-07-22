'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRight, CheckCircle2, CircleAlert, Crown, Plus, RefreshCw, ShieldCheck, UserPlus, UsersRound } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthFetch } from '@/components/AuthProvider';
import { GAMES } from '@/lib/config';
import type { GameKey, TeamMemberRole } from '@/types';
import styles from './Teams.module.css';

type Row = Record<string, unknown>;
type TeamSummary = { id: string; name: string; slug: string; description?: string | null; region: string; owner_id: string; recruiting: boolean };
type Membership = { id: string; role: TeamMemberRole; team: TeamSummary };
type Invitation = { id: string; expires_at: string; team: TeamSummary; inviter?: { username?: string } | null };
type TeamDetail = { team: TeamSummary; membership: { role: TeamMemberRole } | null; can_manage: boolean; members: Row[]; invitations: Row[] };
type Readiness = { ready: boolean; summary: string; game_label: string; members: Array<{ user_id: string; username: string; role: string; eligible: boolean; blocker?: string | null }> };

const teamGames = (Object.keys(GAMES) as GameKey[]).filter((game) => !GAMES[game]?.hidden);

export default function TeamsPage() {
  const authFetch = useAuthFetch();
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [detail, setDetail] = useState<TeamDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [inviteUsername, setInviteUsername] = useState('');
  const [acting, setActing] = useState<string | null>(null);
  const [game, setGame] = useState<GameKey>(teamGames[0] ?? 'efootball');
  const [readiness, setReadiness] = useState<Readiness | null>(null);

  const loadList = useCallback(async () => {
    setError(null);
    try {
      const response = await authFetch('/api/teams');
      const payload = (await response.json()) as { memberships?: Membership[]; invitations?: Invitation[]; error?: string };
      if (!response.ok) throw new Error(payload.error ?? 'Could not load your teams.');
      setMemberships(payload.memberships ?? []);
      setInvitations(payload.invitations ?? []);
      setSelectedTeamId((current) => current ?? payload.memberships?.[0]?.team?.id ?? null);
      if (!(payload.memberships ?? []).length) setShowCreate(true);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load your teams.');
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  const loadDetail = useCallback(async (teamId: string) => {
    setDetailLoading(true);
    try {
      const response = await authFetch(`/api/teams/${teamId}`);
      const payload = (await response.json()) as TeamDetail & { error?: string };
      if (!response.ok) throw new Error(payload.error ?? 'Could not load the team.');
      setDetail(payload);
    } catch (loadError) {
      toast.error(loadError instanceof Error ? loadError.message : 'Could not load the team.');
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadList(), 0);
    return () => window.clearTimeout(timer);
  }, [loadList]);
  useEffect(() => {
    if (!selectedTeamId) return;
    const timer = window.setTimeout(() => void loadDetail(selectedTeamId), 0);
    return () => window.clearTimeout(timer);
  }, [loadDetail, selectedTeamId]);

  const activeMembership = useMemo(() => memberships.find((item) => item.team.id === selectedTeamId) ?? null, [memberships, selectedTeamId]);

  async function createTeam(event: React.FormEvent) {
    event.preventDefault();
    setCreating(true);
    try {
      const response = await authFetch('/api/teams', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, description }) });
      const payload = (await response.json()) as { team?: TeamSummary; error?: string };
      if (!response.ok || !payload.team) throw new Error(payload.error ?? 'Could not create the team.');
      toast.success(`${payload.team.name} created.`);
      setName(''); setDescription(''); setShowCreate(false); setSelectedTeamId(payload.team.id);
      await loadList();
    } catch (createError) {
      toast.error(createError instanceof Error ? createError.message : 'Could not create the team.');
    } finally { setCreating(false); }
  }

  async function respond(invitationId: string, action: 'accept' | 'decline') {
    setActing(invitationId);
    try {
      const response = await authFetch(`/api/team-invitations/${invitationId}/${action}`, { method: 'POST' });
      const payload = (await response.json()) as { error?: string; team_id?: string };
      if (!response.ok) throw new Error(payload.error ?? `Could not ${action} the invitation.`);
      toast.success(action === 'accept' ? 'You joined the team.' : 'Invitation declined.');
      if (payload.team_id) setSelectedTeamId(payload.team_id);
      await loadList();
    } catch (responseError) { toast.error(responseError instanceof Error ? responseError.message : 'Could not update the invitation.'); }
    finally { setActing(null); }
  }

  async function invite(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedTeamId) return;
    setActing('invite');
    try {
      const response = await authFetch(`/api/teams/${selectedTeamId}/invitations`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: inviteUsername }) });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? 'Could not send the invitation.');
      toast.success('Team invitation sent.'); setInviteUsername(''); await loadDetail(selectedTeamId);
    } catch (inviteError) { toast.error(inviteError instanceof Error ? inviteError.message : 'Could not send the invitation.'); }
    finally { setActing(null); }
  }

  async function changeRole(userId: string, role: TeamMemberRole) {
    if (!selectedTeamId) return;
    setActing(userId);
    try {
      const response = await authFetch(`/api/teams/${selectedTeamId}/members/${userId}/role`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role }) });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? 'Could not change the role.');
      toast.success('Team role updated.'); await loadDetail(selectedTeamId);
    } catch (roleError) { toast.error(roleError instanceof Error ? roleError.message : 'Could not change the role.'); }
    finally { setActing(null); }
  }

  async function checkReadiness() {
    if (!selectedTeamId) return;
    setActing('readiness');
    try {
      const response = await authFetch(`/api/teams/${selectedTeamId}/readiness?game=${encodeURIComponent(game)}`);
      const payload = (await response.json()) as Readiness & { error?: string };
      if (!response.ok) throw new Error(payload.error ?? 'Could not check player setup.');
      setReadiness(payload);
    } catch (readinessError) { toast.error(readinessError instanceof Error ? readinessError.message : 'Could not check player setup.'); }
    finally { setActing(null); }
  }

  if (loading) return <div className={styles.loading} aria-busy="true"><RefreshCw className={styles.spin} /> Loading your teams...</div>;
  if (error) return <div className={styles.error}><CircleAlert /><h1>We could not load your teams</h1><p>{error}</p><button onClick={() => { setLoading(true); void loadList(); }}>Try again</button></div>;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div><p className={styles.eyebrow}>Team</p><h1>Play together</h1><p>Create or join a team, set player roles, and make sure everyone is ready for the next tournament.</p></div>
        <button className={styles.primaryButton} onClick={() => setShowCreate((value) => !value)}><Plus size={18} /> Create team</button>
      </header>

      {invitations.length ? <section className={styles.attention}><div><UserPlus size={22} /><div><p className={styles.eyebrow}>Invites to answer</p><h2>Choose whether to join</h2></div></div>{invitations.map((item) => <article key={item.id}><div><strong>{item.team.name}</strong><span>{item.inviter?.username ? `${item.inviter.username} invited you` : 'Team invitation'}</span></div><div><button disabled={acting === item.id} onClick={() => void respond(item.id, 'decline')}>Decline</button><button className={styles.primaryButton} disabled={acting === item.id} onClick={() => void respond(item.id, 'accept')}>Join team</button></div></article>)}</section> : null}

      {showCreate ? <form className={styles.createCard} onSubmit={createTeam}><div><p className={styles.eyebrow}>New team</p><h2>Create your team</h2><p>You become captain and can invite players immediately.</p></div><label>Team name<input required minLength={2} maxLength={60} value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Nairobi Strikers" /></label><label>Description<textarea maxLength={500} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Games, region, and what kind of players you want" /></label><div className={styles.formActions}><button type="button" onClick={() => setShowCreate(false)}>Cancel</button><button className={styles.primaryButton} disabled={creating}>{creating ? 'Creating...' : 'Create team'}</button></div></form> : null}

      {memberships.length ? <div className={styles.teamTabs}>{memberships.map((item) => <button className={item.team.id === selectedTeamId ? styles.teamTabActive : ''} key={item.team.id} onClick={() => { setSelectedTeamId(item.team.id); setReadiness(null); }}><UsersRound size={17} /><span>{item.team.name}<small>{item.role}</small></span></button>)}</div> : null}

      {!memberships.length && !showCreate ? <section className={styles.empty}><UsersRound size={28} /><h2>You are not on a team yet</h2><p>Create a team as captain or ask a captain to invite your username.</p><button className={styles.primaryButton} onClick={() => setShowCreate(true)}>Create your first team</button></section> : null}

      {detailLoading ? <div className={styles.loading}><RefreshCw className={styles.spin} /> Loading team...</div> : detail ? <>
        <section className={styles.teamHero}><div><p className={styles.eyebrow}>Your team</p><h2>{detail.team.name}</h2><p>{detail.team.description || `${detail.team.region} team`}</p></div><div className={styles.heroActions}><span><Crown size={16} /> {activeMembership?.role ?? detail.membership?.role}</span><Link href="/tournaments">Find team tournament <ArrowRight size={16} /></Link></div></section>

        <div className={styles.grid}>
          <section className={styles.card}><div className={styles.cardHeader}><div><h2>Players</h2><p>Captains choose who starts and who is a substitute.</p></div><span>{detail.members.length} active</span></div><div className={styles.rows}>{detail.members.map((member) => { const profile=(member.profile ?? {}) as Row; const userId=String(member.user_id); return <div className={styles.memberRow} key={String(member.id)}><span className={styles.avatar}>{String(profile.username ?? 'P').slice(0,1).toUpperCase()}</span><div><strong>{String(profile.username ?? 'Player')}</strong><small>{String(member.role)}</small></div>{detail.can_manage ? <select aria-label={`Role for ${String(profile.username ?? 'player')}`} disabled={acting === userId || String(detail.team.owner_id) === userId} value={String(member.role)} onChange={(event) => void changeRole(userId, event.target.value as TeamMemberRole)}><option value="captain">Captain</option><option value="starter">Starter</option><option value="substitute">Substitute</option><option value="member">Member</option></select> : <span className={styles.role}>{String(member.role)}</span>}</div>; })}</div></section>

          <aside className={styles.side}>
            {detail.can_manage ? <form className={styles.card} onSubmit={invite}><div className={styles.cardHeader}><div><h2>Invite a player</h2><p>Use their exact Mechi username.</p></div></div><label>Username<input required value={inviteUsername} onChange={(event) => setInviteUsername(event.target.value)} placeholder="@playername" /></label><button className={styles.primaryButton} disabled={acting === 'invite'}><UserPlus size={17} /> {acting === 'invite' ? 'Sending...' : 'Send invite'}</button>{detail.invitations.length ? <div className={styles.pendingInvites}>{detail.invitations.map((invite) => { const invitee=(invite.invitee ?? {}) as Row; return <span key={String(invite.id)}>{String(invitee.username ?? 'Player')} · waiting</span>; })}</div> : null}</form> : null}

            <section className={styles.card}><div className={styles.cardHeader}><div><h2>Ready to play?</h2><p>Check every active player&apos;s game setup.</p></div></div><label>Game<select value={game} onChange={(event) => { setGame(event.target.value as GameKey); setReadiness(null); }}>{teamGames.map((key) => <option value={key} key={key}>{GAMES[key].label}</option>)}</select></label><button className={styles.secondaryButton} disabled={acting === 'readiness'} onClick={() => void checkReadiness()}><ShieldCheck size={17} /> Check player setup</button>{readiness ? <div className={readiness.ready ? styles.ready : styles.blocked}>{readiness.ready ? <CheckCircle2 /> : <CircleAlert />}<div><strong>{readiness.ready ? `Ready for ${readiness.game_label}` : 'Finish setup first'}</strong><p>{readiness.summary}</p>{readiness.members.filter((member) => !member.eligible && ['captain','starter'].includes(member.role)).map((member) => <small key={member.user_id}>{member.username}: {member.blocker}</small>)}</div></div> : null}</section>
          </aside>
        </div>
      </> : null}
    </div>
  );
}
