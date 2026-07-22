'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { ArrowRight, Check, CircleAlert, Gamepad2, LockKeyhole, Plus, ShieldCheck, UserPlus, UsersRound } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthFetch } from '@/components/AuthProvider';
import { GAMES } from '@/lib/config';
import type { GameKey } from '@/types';
import styles from './V5TeamJourney.module.css';

interface TeamListItem { roster_role: string; status: string; team: { id: string; game: string; platform?: string | null; tag?: string | null; roster_status: string; workspace: { id: string; name: string; slug: string } } }
interface Invitation { id: string; role: string; status: string; expires_at: string; invited_email?: string | null; workspace?: { id: string; name: string; type: string } | null; invited_by_profile?: { username: string } | null; invited_user?: { username: string } | null }
interface Member { id: string; user_id: string; roster_role: string; status: string; user?: { id: string; username: string; region?: string; selected_games?: string[]; game_ids?: Record<string,string> } | null }
interface Entry { id: string; status: string; payment_status: string; checked_in_at?: string | null; tournament?: { id: string; slug: string; title: string; status: string; team_size?: number | null } | null }
interface Detail { team: TeamListItem['team'] & { captain_user_id: string }; workspace: TeamListItem['team']['workspace'] & { description?: string | null }; canManage: boolean; members: Member[]; invitations: Invitation[]; entries: Entry[] }
interface Readiness { ready: boolean; active_count: number; starter_count: number; checks: Array<{ key: string; label: string; complete: boolean }> }
interface Tournament { id: string; slug: string; title: string; game?: string | null; status?: string | null; participant_type?: 'solo'|'team'|null; team_size?: number|null; entry_fee?: number|null }

export function V5TeamJourney({ playerView = false, tournaments = [] }: { playerView?: boolean; tournaments?: Tournament[] }) {
  const authFetch = useAuthFetch(); const [teams, setTeams] = useState<TeamListItem[]>([]); const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [detail, setDetail] = useState<Detail | null>(null); const [readiness, setReadiness] = useState<Readiness | null>(null); const [loading, setLoading] = useState(true); const [busy, setBusy] = useState('');
  const [createOpen, setCreateOpen] = useState(false); const [name, setName] = useState(''); const [tag, setTag] = useState(''); const [game, setGame] = useState<GameKey>('efootball');
  const [inviteIdentity, setInviteIdentity] = useState(''); const [inviteRole, setInviteRole] = useState('starter');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [teamResponse, invitationResponse] = await Promise.all([authFetch('/api/v5/teams'), authFetch('/api/v5/invitations')]);
      const teamPayload = await teamResponse.json() as { teams?: TeamListItem[] }; const invitationPayload = await invitationResponse.json() as { invitations?: Invitation[] };
      const list = teamPayload.teams ?? []; setTeams(list); setInvitations(invitationPayload.invitations ?? []);
      if (!playerView && list[0]?.team?.id) {
        const [detailResponse, readinessResponse] = await Promise.all([authFetch(`/api/v5/teams/${list[0].team.id}`), authFetch(`/api/v5/teams/${list[0].team.id}/readiness`)]);
        if (detailResponse.ok) setDetail(await detailResponse.json() as Detail); if (readinessResponse.ok) setReadiness(await readinessResponse.json() as Readiness);
      }
    } catch { toast.error('Team information could not be loaded.'); } finally { setLoading(false); }
  }, [authFetch, playerView]);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);

  async function createTeam(event: React.FormEvent) {
    event.preventDefault(); setBusy('create');
    try { const response = await authFetch('/api/v5/teams', { method: 'POST', body: JSON.stringify({ name, tag, game }) }); const payload = await response.json() as { error?: string }; if (!response.ok) throw new Error(payload.error || 'Team could not be created.'); toast.success('Team created'); setCreateOpen(false); setName(''); setTag(''); await load(); } catch (error) { toast.error(error instanceof Error ? error.message : 'Team could not be created.'); } finally { setBusy(''); }
  }
  async function answerInvitation(id: string, action: 'accept'|'decline') {
    setBusy(`${action}:${id}`); try { const response = await authFetch(`/api/v5/invitations/${id}`, { method: 'PATCH', body: JSON.stringify({ action }) }); const payload = await response.json() as { error?: string }; if (!response.ok) throw new Error(payload.error || 'Invitation could not be updated.'); toast.success(action === 'accept' ? 'You joined the team' : 'Invitation declined'); await load(); } catch (error) { toast.error(error instanceof Error ? error.message : 'Invitation could not be updated.'); } finally { setBusy(''); }
  }
  async function sendInvite(event: React.FormEvent) {
    event.preventDefault(); if (!detail) return; setBusy('invite'); try { const response = await authFetch(`/api/v5/teams/${detail.team.id}/invitations`, { method: 'POST', body: JSON.stringify({ identity: inviteIdentity, role: inviteRole }) }); const payload = await response.json() as { error?: string }; if (!response.ok) throw new Error(payload.error || 'Invitation could not be sent.'); toast.success('Invitation sent'); setInviteIdentity(''); await load(); } catch (error) { toast.error(error instanceof Error ? error.message : 'Invitation could not be sent.'); } finally { setBusy(''); }
  }
  async function changeMember(memberId: string, role: string) {
    if (!detail) return; setBusy(memberId); try { const response = await authFetch(`/api/v5/teams/${detail.team.id}/members/${memberId}`, { method: 'PATCH', body: JSON.stringify({ role }) }); const payload = await response.json() as { error?: string }; if (!response.ok) throw new Error(payload.error || 'Role could not be changed.'); await load(); toast.success('Roster role saved'); } catch (error) { toast.error(error instanceof Error ? error.message : 'Role could not be changed.'); } finally { setBusy(''); }
  }
  async function enterTournament(tournamentId: string) {
    if (!detail) return; setBusy(`enter:${tournamentId}`); try { const response = await authFetch(`/api/v5/teams/${detail.team.id}/tournaments/${tournamentId}/enter`, { method: 'POST', body: JSON.stringify({ idempotency_key: crypto.randomUUID() }) }); const payload = await response.json() as { error?: string }; if (!response.ok) throw new Error(payload.error || 'Entry could not be completed.'); toast.success('Roster locked and team entered'); await load(); } catch (error) { toast.error(error instanceof Error ? error.message : 'Entry could not be completed.'); } finally { setBusy(''); }
  }

  const eligible = tournaments.filter((item) => item.participant_type === 'team' && item.status === 'open' && item.game === detail?.team.game);
  if (loading) return <div className={styles.loading}><span/><span/><span/></div>;
  if (playerView) return <div className={styles.page}><header><p>Your teams</p><h1>Teams and invitations</h1><span>Join a team or create one, then prepare the roster together.</span><button type="button" onClick={() => setCreateOpen((value) => !value)}><Plus size={16}/> Create team</button></header>
    {invitations.length ? <section className={styles.notice}><UserPlus/><div><strong>{invitations.length} invitation{invitations.length === 1 ? '' : 's'} waiting</strong><span>Choose a team only when you are ready to join its roster.</span></div></section> : null}
    {invitations.map((invitation) => <section className={styles.row} key={invitation.id}><div><strong>{invitation.workspace?.name || 'Team invitation'}</strong><span>Invited by {invitation.invited_by_profile?.username || 'a team captain'} · Role: {invitation.role}</span></div><div><button type="button" className={styles.quiet} disabled={Boolean(busy)} onClick={() => void answerInvitation(invitation.id, 'decline')}>Decline</button><button type="button" disabled={Boolean(busy)} onClick={() => void answerInvitation(invitation.id, 'accept')}><Check size={15}/> Accept</button></div></section>)}
    {createOpen ? <form className={styles.form} onSubmit={createTeam}><label>Team name<input required minLength={2} maxLength={120} value={name} onChange={(event) => setName(event.target.value)} /></label><label>Team tag<input minLength={2} maxLength={8} value={tag} onChange={(event) => setTag(event.target.value.toUpperCase())}/></label><label>Game<select value={game} onChange={(event) => setGame(event.target.value as GameKey)}>{Object.entries(GAMES).map(([key,value]) => <option key={key} value={key}>{value.label}</option>)}</select></label><button disabled={busy === 'create'}>{busy === 'create' ? 'Creating…' : 'Create team'}</button></form> : null}
    <section className={styles.panel}><h2>Your team memberships</h2>{teams.length ? teams.map((item) => <Link className={styles.teamCard} href="/app/team" key={item.team.id}><span><UsersRound/></span><div><strong>{item.team.workspace.name} {item.team.tag ? `(${item.team.tag})` : ''}</strong><small>{GAMES[item.team.game as GameKey]?.label || item.team.game} · You are {item.roster_role}</small></div><ArrowRight/></Link>) : <div className={styles.empty}><UsersRound/><strong>No team yet</strong><span>Accept an invitation or create a team to start.</span></div>}</section></div>;

  if (!detail) return <div className={styles.page}><header><p>Team dashboard</p><h1>Create your first team</h1><span>Name the team, choose its game, then invite players.</span></header><form className={styles.form} onSubmit={createTeam}><label>Team name<input required minLength={2} maxLength={120} value={name} onChange={(event) => setName(event.target.value)}/></label><label>Team tag<input minLength={2} maxLength={8} value={tag} onChange={(event) => setTag(event.target.value.toUpperCase())}/></label><label>Game<select value={game} onChange={(event) => setGame(event.target.value as GameKey)}>{Object.entries(GAMES).map(([key,value]) => <option key={key} value={key}>{value.label}</option>)}</select></label><button disabled={busy === 'create'}>{busy === 'create' ? 'Creating…' : 'Create team'}</button></form></div>;

  return <div className={styles.page}><header><p>Team dashboard</p><h1>{detail.workspace.name}</h1><span>{GAMES[detail.team.game as GameKey]?.label || detail.team.game}{detail.team.tag ? ` · ${detail.team.tag}` : ''} · {detail.members.length} roster members</span></header>
    <section className={readiness?.ready ? styles.ready : styles.notice}>{readiness?.ready ? <ShieldCheck/> : <CircleAlert/>}<div><strong>{readiness?.ready ? 'Roster ready for team tournaments' : 'Finish roster setup next'}</strong><span>{readiness?.checks.filter((check) => !check.complete).map((check) => check.label).join(' · ') || 'All required checks are complete.'}</span></div></section>
    <div className={styles.grid}><section className={styles.panel}><h2>Roster</h2>{detail.members.map((member) => <div className={styles.member} key={member.id}><span>{member.user?.username?.slice(0,2).toUpperCase() || 'PL'}</span><div><strong>{member.user?.username || 'Mechi player'}</strong><small>{member.user?.region || 'Region not set'} · {member.status}</small></div>{detail.canManage && member.roster_role !== 'captain' ? <select disabled={busy === member.id} value={member.roster_role} onChange={(event) => void changeMember(member.id, event.target.value)}><option value="starter">Starter</option><option value="substitute">Substitute</option><option value="manager">Manager</option><option value="analyst">Analyst</option><option value="member">Member</option></select> : <em>{member.roster_role}</em>}</div>)}</section>
      <aside className={styles.panel}><h2>Invite a player</h2><form className={styles.stack} onSubmit={sendInvite}><label>Username or email<input required value={inviteIdentity} onChange={(event) => setInviteIdentity(event.target.value)} placeholder="Player username"/></label><label>Roster role<select value={inviteRole} onChange={(event) => setInviteRole(event.target.value)}><option value="starter">Starter</option><option value="substitute">Substitute</option><option value="manager">Manager</option><option value="analyst">Analyst</option><option value="member">Member</option></select></label><button disabled={busy === 'invite'}><UserPlus size={15}/>{busy === 'invite' ? 'Sending…' : 'Send invitation'}</button></form></aside></div>
    <section className={styles.panel}><h2>Team tournaments</h2>{detail.entries.map((entry) => <div className={styles.row} key={entry.id}><div><strong>{entry.tournament?.title || 'Tournament entry'}</strong><span>{entry.status.replaceAll('_',' ')} · Payment {entry.payment_status.replaceAll('_',' ')}</span></div><Link href={entry.tournament?.slug ? `/tournaments/${entry.tournament.slug}` : '/tournaments'}>View <ArrowRight size={14}/></Link></div>)}{eligible.filter((item) => !detail.entries.some((entry) => entry.tournament?.id === item.id)).map((item) => <div className={styles.row} key={item.id}><div><strong>{item.title}</strong><span>{item.team_size || 'Flexible'} players · {Number(item.entry_fee || 0) ? `KES ${item.entry_fee}` : 'Free entry'}</span></div><button type="button" disabled={!readiness?.ready || Boolean(busy)} onClick={() => void enterTournament(item.id)}><LockKeyhole size={14}/>{busy === `enter:${item.id}` ? 'Entering…' : 'Lock roster & enter'}</button></div>)}{!detail.entries.length && !eligible.length ? <div className={styles.empty}><Gamepad2/><strong>No eligible team tournament is open</strong><span>When one opens for this game, it will appear here.</span></div> : null}</section>
  </div>;
}
