'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, CheckCircle2, CircleAlert, LockKeyhole, ShieldCheck, Trophy, UsersRound } from 'lucide-react';
import { useAuthFetch } from '@/components/AuthProvider';
import styles from './V5TeamTournaments.module.css';

type Tournament = {
  id: string;
  slug: string;
  title: string;
  game?: string | null;
  platform?: string | null;
  status?: string | null;
  approval_status?: string | null;
  participant_type?: 'solo' | 'team' | null;
  team_size?: number | null;
  entry_fee?: number | null;
  scheduled_for?: string | null;
  player_count?: number | null;
  size?: number | null;
};

type Team = {
  id: string;
  game: string;
  platform?: string | null;
  tag?: string | null;
  roster_status: string;
  workspace?: { name?: string | null } | null;
};

type Entry = {
  id: string;
  tournament_id: string;
  status: string;
  payment_status: string;
  created_at: string;
  tournament?: {
    id: string;
    slug: string;
    title: string;
    game?: string | null;
    scheduled_for?: string | null;
  } | null;
  roster_snapshot?: {
    roster?: Array<{ user_id: string; username: string; roster_role: string }> | null;
    locked_at?: string | null;
    unlocked_at?: string | null;
  } | null;
};

function firstRelation<T>(value: T | T[] | null | undefined) {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

function format(value: string | null | undefined) {
  return String(value ?? 'Gaming').replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function V5TeamTournaments({ tournaments, loading }: { tournaments: Tournament[]; loading: boolean }) {
  const authFetch = useAuthFetch();
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamId, setTeamId] = useState('');
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [busyId, setBusyId] = useState('');
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);
  const [withdrawEntryId, setWithdrawEntryId] = useState('');
  const [withdrawReason, setWithdrawReason] = useState('');
  const entryKeys = useRef<Record<string, string>>({});

  useEffect(() => {
    let mounted = true;
    void authFetch('/api/v5/teams')
      .then(async (response) => (response.ok ? response.json() : Promise.reject(new Error('Teams unavailable'))))
      .then((payload) => {
        if (!mounted) return;
        const normalized = (Array.isArray(payload.teams) ? payload.teams : [])
          .map((row: { team?: Team | Team[] | null }) => firstRelation(row.team))
          .filter((team: Team | null): team is Team => Boolean(team?.id));
        setTeams(normalized);
        setTeamId((current) => current || normalized[0]?.id || '');
      })
      .catch(() => {
        if (mounted) setFeedback({ tone: 'error', message: 'Your teams could not be loaded.' });
      })
      .finally(() => {
        if (mounted) setLoadingTeams(false);
      });
    return () => {
      mounted = false;
    };
  }, [authFetch]);

  const refreshEntries = useCallback(async () => {
    if (!teamId) {
      setEntries([]);
      return;
    }
    setLoadingEntries(true);
    try {
      const response = await authFetch(`/api/v5/teams/${teamId}/entries`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? 'Entries unavailable');
      setEntries(Array.isArray(payload.entries) ? payload.entries : []);
    } catch (error) {
      setFeedback({ tone: 'error', message: error instanceof Error ? error.message : 'Entries unavailable.' });
    } finally {
      setLoadingEntries(false);
    }
  }, [authFetch, teamId]);

  useEffect(() => {
    void refreshEntries();
  }, [refreshEntries]);

  const team = teams.find((item) => item.id === teamId) ?? null;
  const activeByTournament = useMemo(
    () => new Map(entries.filter((entry) => entry.status !== 'withdrawn').map((entry) => [entry.tournament_id, entry])),
    [entries]
  );
  const compatible = useMemo(
    () => tournaments.filter((item) => item.participant_type === 'team' && (!team || item.game === team.game)),
    [team, tournaments]
  );

  async function enterTournament(tournament: Tournament) {
    if (!team) return;
    setBusyId(tournament.id);
    setFeedback(null);
    const key = entryKeys.current[tournament.id] ?? `team-entry-${crypto.randomUUID()}`;
    entryKeys.current[tournament.id] = key;
    try {
      const response = await authFetch(`/api/v5/teams/${team.id}/entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tournament_id: tournament.id,
          idempotency_key: key,
          reason: 'Captain confirmed this competition roster',
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? 'Team entry could not be created.');
      setFeedback({ tone: 'success', message: 'Roster locked and team entry confirmed.' });
      await refreshEntries();
    } catch (error) {
      setFeedback({ tone: 'error', message: error instanceof Error ? error.message : 'Team entry could not be created.' });
    } finally {
      setBusyId('');
    }
  }

  async function withdrawEntry() {
    if (!team || !withdrawEntryId || withdrawReason.trim().length < 8) return;
    setBusyId(withdrawEntryId);
    setFeedback(null);
    try {
      const response = await authFetch(`/api/v5/teams/${team.id}/entries/${withdrawEntryId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: withdrawReason.trim() }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? 'Entry could not be withdrawn.');
      setFeedback({ tone: 'success', message: 'Entry withdrawn and roster lock released.' });
      setWithdrawEntryId('');
      setWithdrawReason('');
      await refreshEntries();
    } catch (error) {
      setFeedback({ tone: 'error', message: error instanceof Error ? error.message : 'Entry could not be withdrawn.' });
    } finally {
      setBusyId('');
    }
  }

  if (loadingTeams) return <div className={styles.loading}>Loading team competition access…</div>;
  if (!teams.length) {
    return <div className={styles.empty}><UsersRound/><h1>Create a team before entering team tournaments.</h1><p>The captain creates the workspace, invites players, and assigns the official roster.</p><Link href="/app/team">Create team <ArrowRight size={15}/></Link></div>;
  }

  return <div className={styles.page}>
    <header className={styles.heading}><div><p>Team workspace</p><h1>Team tournaments</h1><span>Only the captain or manager can lock an eligible roster and create an official entry.</span></div>{teams.length > 1 ? <label>Active team<select value={teamId} onChange={(event)=>setTeamId(event.target.value)}>{teams.map((item)=><option key={item.id} value={item.id}>{item.workspace?.name ?? item.tag ?? format(item.game)}</option>)}</select></label> : null}</header>
    {feedback ? <div className={feedback.tone === 'success' ? styles.success : styles.error}>{feedback.tone === 'success' ? <CheckCircle2/> : <CircleAlert/>}<span>{feedback.message}</span></div> : null}
    <div className={styles.summary}><section><UsersRound/><span><small>Team</small><strong>{team?.workspace?.name ?? team?.tag ?? 'Active team'}</strong><em>{format(team?.game)} · {format(team?.platform)}</em></span></section><section><LockKeyhole/><span><small>Roster state</small><strong>{format(team?.roster_status)}</strong><em>A snapshot locks on confirmed entry</em></span></section><section><Trophy/><span><small>Active entries</small><strong>{entries.filter((entry)=>entry.status !== 'withdrawn').length}</strong><em>Free team tournaments</em></span></section></div>
    <div className={styles.columns}><section className={styles.panel}><div className={styles.panelHeading}><div><h2>Compatible tournaments</h2><p>Game, platform, roster size, approval, capacity, and player conflicts are rechecked on the server.</p></div><Link href="/tournaments">Directory <ArrowRight size={14}/></Link></div>{loading ? <div className={styles.loading}>Loading tournaments…</div> : compatible.length ? <div className={styles.list}>{compatible.map((tournament)=>{const entry=activeByTournament.get(tournament.id);const paid=Number(tournament.entry_fee ?? 0)>0;const unavailable=tournament.status!=='open'||tournament.approval_status!=='approved';return <article key={tournament.id}><div><strong>{tournament.title}</strong><span>{format(tournament.game)} · {tournament.team_size ?? '—'} starters · {tournament.player_count ?? 0}/{tournament.size ?? '—'} teams</span><small>{paid ? `KES ${Number(tournament.entry_fee).toLocaleString('en-KE')} — payment protection pending` : 'Free entry · atomic roster lock'}</small></div>{entry ? <span className={styles.confirmed}><CheckCircle2/> {format(entry.status)}</span> : <button type="button" disabled={paid||unavailable||busyId===tournament.id} onClick={()=>void enterTournament(tournament)}>{busyId===tournament.id?'Locking…':paid?'Paid entry unavailable':unavailable?'Not open':'Lock roster & enter'}</button>}<Link href={`/tournaments/${tournament.slug}`} aria-label={`View ${tournament.title}`}><ArrowRight/></Link></article>})}</div> : <div className={styles.noRows}><Trophy/><strong>No compatible team tournament is open.</strong><span>The live directory will show approved events for {format(team?.game)}.</span></div>}</section>
      <aside className={styles.panel}><div className={styles.panelHeading}><div><h2>Official entries</h2><p>Each entry retains the exact roster and game IDs used at registration.</p></div></div>{loadingEntries?<div className={styles.loading}>Loading entries…</div>:entries.length?<div className={styles.entries}>{entries.map((entry)=><article key={entry.id}><div><strong>{entry.tournament?.title ?? 'Tournament entry'}</strong><span>{format(entry.status)} · {entry.roster_snapshot?.roster?.length ?? 0} roster members</span><small>{entry.roster_snapshot?.locked_at ? `Locked ${new Intl.DateTimeFormat('en-KE',{dateStyle:'medium'}).format(new Date(entry.roster_snapshot.locked_at))}` : 'Roster snapshot retained'}</small></div>{entry.status !== 'withdrawn' ? <button type="button" onClick={()=>setWithdrawEntryId(entry.id)}>Withdraw</button> : null}</article>)}</div>:<div className={styles.noRows}><ShieldCheck/><strong>No official entry yet.</strong><span>Eligibility and roster conflicts are checked before confirmation.</span></div>}</aside></div>
    {withdrawEntryId ? <section className={styles.withdraw}><div><strong>Withdraw this team entry?</strong><span>This releases the tournament roster lock and records the reason in the workspace audit.</span></div><label>Reason<textarea value={withdrawReason} onChange={(event)=>setWithdrawReason(event.target.value)} minLength={8} maxLength={300}/></label><div><button type="button" onClick={()=>{setWithdrawEntryId('');setWithdrawReason('')}}>Keep entry</button><button type="button" disabled={withdrawReason.trim().length<8||busyId===withdrawEntryId} onClick={()=>void withdrawEntry()}>{busyId===withdrawEntryId?'Withdrawing…':'Confirm withdrawal'}</button></div></section> : null}
  </div>;
}
