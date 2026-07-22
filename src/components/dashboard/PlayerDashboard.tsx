'use client';

import Link from 'next/link';
import { ArrowRight, Bell, ChevronRight, CircleAlert, Gamepad2, Medal, RefreshCw, ShieldCheck, Trophy, UsersRound } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useAuthFetch } from '@/components/AuthProvider';
import { getGameLabel } from '@/lib/dashboard';
import styles from './Dashboard.module.css';

type Row = Record<string, unknown>;
type NextAction = { kind: string; eyebrow: string; title: string; description: string; label: string; href: string; secondary_label?: string; secondary_href?: string };
export type PlayerDashboardData = { profile: Row; matches: Row[]; tournaments: Row[]; recommended: Row[]; incoming_challenges: Row[]; teams: Row[]; next_action: NextAction; unread_notifications: number; partial?: boolean };

function formatDate(value: unknown, includeTime = false) {
  if (!value) return 'Schedule to be announced';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return 'Schedule to be announced';
  return new Intl.DateTimeFormat('en-KE', { month: 'short', day: 'numeric', timeZone: 'Africa/Nairobi', ...(includeTime ? { hour: 'numeric', minute: '2-digit' } : {}) }).format(date);
}
function getTournament(row: Row) { return (row.tournament ?? row) as Row; }

export function PlayerDashboard({ initialData }: { initialData?: PlayerDashboardData }) {
  const authFetch = useAuthFetch();
  const [data, setData] = useState<PlayerDashboardData | null>(initialData ?? null);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { const response = await authFetch('/api/dashboard/player'); const payload = await response.json(); if (!response.ok) throw new Error(payload.error ?? 'Could not load your player home.'); setData(payload as PlayerDashboardData); }
    catch (loadError) { setError(loadError instanceof Error ? loadError.message : 'Could not load your player home.'); }
    finally { setLoading(false); }
  }, [authFetch]);
  useEffect(() => {
    if (initialData) return;
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [initialData, load]);

  if (loading) return <DashboardSkeleton />;
  if (error || !data) return <div className={styles.centerState}><span><CircleAlert size={25} /></span><h1>We could not load your player home</h1><p>{error || 'Try again in a moment.'}</p><button onClick={() => void load()}><RefreshCw size={17} /> Try again</button></div>;

  const username = String(data.profile.username ?? 'Player');
  const selectedGames = Array.isArray(data.profile.selected_games) ? data.profile.selected_games.map(String) : [];
  const completedMatches = data.matches.filter((match) => ['win', 'loss', 'draw'].includes(String(match.result)));
  const wins = completedMatches.filter((match) => match.result === 'win').length;
  const winRate = completedMatches.length ? Math.round((wins / completedMatches.length) * 100) : 0;
  const activeTournaments = data.tournaments.filter((item) => ['paid', 'free'].includes(String(item.payment_status))).slice(0, 3);

  return <div className={styles.dashboard}>
    <header className={styles.pageHeader}><div><p className={styles.eyebrow}>Player home</p><h1>Hi {username}, what&apos;s next?</h1><p>Your important match, tournament, team, and 1v1 actions in one place.</p></div><div className={styles.headerActions}><Link className={styles.secondaryButton} href="/challenges">Play 1v1</Link><Link className={styles.primaryButton} href="/tournaments">Find a tournament <ArrowRight size={17} /></Link></div></header>
    {data.partial ? <div className={styles.notice}><CircleAlert size={16} /> Some team or activity details are temporarily unavailable. Your main player action is still current.</div> : null}
    <section className={styles.actionHero}><div className={styles.actionCopy}><span className={styles.actionIcon}>{data.next_action.kind.includes('match') || data.next_action.kind.includes('challenge') ? <Gamepad2 size={24} /> : data.next_action.kind.includes('team') ? <UsersRound size={24} /> : <Trophy size={24} />}</span><div><p className={styles.eyebrow}>{data.next_action.eyebrow}</p><h2>{data.next_action.title}</h2><p>{data.next_action.description}</p></div></div><div className={styles.actionButtons}>{data.next_action.secondary_href ? <Link className={styles.secondaryButton} href={data.next_action.secondary_href}>{data.next_action.secondary_label}</Link> : null}<Link className={styles.primaryButton} href={data.next_action.href}>{data.next_action.label} <ArrowRight size={17} /></Link></div></section>
    <section className={styles.quickActions} aria-label="Ways to play"><Link href="/tournaments"><Trophy size={20} /><span><strong>Join a tournament</strong><small>Find an open event</small></span><ChevronRight size={18} /></Link><Link href="/challenges"><Gamepad2 size={20} /><span><strong>Play 1v1</strong><small>{data.incoming_challenges.length ? `${data.incoming_challenges.length} invite${data.incoming_challenges.length === 1 ? '' : 's'} to answer` : 'Invite another player'}</small></span><ChevronRight size={18} /></Link><Link href="/teams"><UsersRound size={20} /><span><strong>Your team</strong><small>{data.teams.length ? `${data.teams.length} active team${data.teams.length === 1 ? '' : 's'}` : 'Create or join a team'}</small></span><ChevronRight size={18} /></Link></section>
    <div className={styles.contentGrid}>
      <section className={styles.panel}><PanelHeader title="Your tournaments" subtitle="The registrations most relevant to you" href="/tournaments" />{activeTournaments.length ? <div className={styles.list}>{activeTournaments.map((registration) => { const tournament = getTournament(registration); return <Link className={styles.tournamentRow} href={`/t/${String(tournament.slug)}`} key={String(registration.id)}><span className={styles.gameTile}><Trophy size={20} /></span><span className={styles.rowCopy}><strong>{String(tournament.title)}</strong><small>{getGameLabel(String(tournament.game))} · {formatDate(tournament.scheduled_for, true)}</small></span><span className={styles.rowStatus}>{String(registration.check_in_status ?? 'registered').replaceAll('_', ' ')}</span><ChevronRight size={18} /></Link>; })}</div> : <EmptyState icon={Trophy} title="No tournament registrations" body="Find a tournament that fits your game and schedule." action="Browse tournaments" href="/tournaments" />}</section>
      <section className={styles.panel}><PanelHeader title="Recent confirmed results" subtitle="Only confirmed results count toward player progress" href="/matches" />{completedMatches.length ? <div className={styles.list}>{completedMatches.slice(0, 4).map((match) => { const opponent=(match.opponent ?? {}) as Row; const result=String(match.result); return <Link className={styles.matchRow} href={`/match/${String(match.id)}`} key={String(match.id)}><span className={`${styles.resultBadge} ${result === 'win' ? styles.win : result === 'loss' ? styles.loss : styles.pending}`}>{result.slice(0,1).toUpperCase()}</span><span className={styles.rowCopy}><strong>vs {String(opponent.username ?? 'Player')}</strong><small>{getGameLabel(String(match.game))} · {formatDate(match.created_at)}</small></span><span className={styles.ratingChange}>{Number(match.rating_change ?? 0) > 0 ? '+' : ''}{Number(match.rating_change ?? 0)}</span></Link>; })}</div> : <EmptyState icon={Gamepad2} title="No confirmed results yet" body="Play a 1v1 or tournament match. Confirmed results will appear here." action="Play 1v1" href="/challenges" />}</section>
    </div>
    <section className={styles.compactProgress}><div><Medal size={21} /><span><strong>{winRate}% recent win rate</strong><small>{completedMatches.length} confirmed result{completedMatches.length === 1 ? '' : 's'}</small></span></div><div><ShieldCheck size={21} /><span><strong>{selectedGames.length} game{selectedGames.length === 1 ? '' : 's'} set up</strong><small>{selectedGames.length ? selectedGames.map(getGameLabel).join(', ') : 'Choose your games to start'}</small></span></div><Link href="/notifications"><Bell size={21} /><span><strong>{data.unread_notifications} unread update{data.unread_notifications === 1 ? '' : 's'}</strong><small>Match, team, tournament, and support updates</small></span><ChevronRight size={18} /></Link></section>
  </div>;
}

function PanelHeader({ title, subtitle, href }: { title: string; subtitle: string; href: string }) { return <div className={styles.panelHeader}><div><h2>{title}</h2><p>{subtitle}</p></div><Link href={href}>View all <ArrowRight size={15} /></Link></div>; }
function EmptyState({ icon: Icon, title, body, action, href }: { icon: typeof Trophy; title: string; body: string; action: string; href: string }) { return <div className={styles.empty}><span><Icon size={22} /></span><div><h3>{title}</h3><p>{body}</p></div><Link href={href}>{action} <ArrowRight size={15} /></Link></div>; }
function DashboardSkeleton() { return <div className={styles.dashboard} aria-busy="true" aria-label="Loading player home"><div className={`${styles.skeleton} ${styles.skeletonHeader}`} /><div className={`${styles.skeleton} ${styles.skeletonHero}`} /><div className={styles.contentGrid}><div className={`${styles.skeleton} ${styles.skeletonPanel}`} /><div className={`${styles.skeleton} ${styles.skeletonPanel}`} /></div></div>; }
