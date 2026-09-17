'use client';

import Link from 'next/link';
import { ArrowRight, CircleAlert, Plus, ShieldCheck, Trophy, UsersRound } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { V5AppShell } from '@/components/v5/app/V5AppShell';
import styles from './V5CoreHome.module.css';

interface TournamentRecord {
  id: string;
  slug: string;
  title: string;
  game?: string | null;
  status?: string | null;
  scheduled_for?: string | null;
  player_count?: number | null;
  size?: number | null;
  approval_status?: string | null;
  organizer_id?: string | null;
}

export function V5OrganizerHome() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [tournaments, setTournaments] = useState<TournamentRecord[]>([]);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!user) return;
      setLoading(true);
      setError(false);
      try {
        const response = await fetch('/api/tournaments?status=all&limit=100', { credentials: 'include' });
        const payload = response.ok ? await response.json() : { tournaments: [] };
        if (!active) return;
        const all = Array.isArray(payload.tournaments) ? payload.tournaments : [];
        setTournaments(all.filter((item: TournamentRecord) => item.organizer_id === user.id));
        setError(!response.ok);
      } catch {
        if (active) setError(true);
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [user]);

  const sorted = useMemo(
    () => [...tournaments].sort((a, b) => String(b.scheduled_for ?? '').localeCompare(String(a.scheduled_for ?? ''))),
    [tournaments]
  );
  const pendingApproval = sorted.find((item) => ['pending', 'submitted', 'review'].includes(String(item.approval_status ?? '').toLowerCase()));
  const activeTournament = sorted.find((item) => ['live', 'active', 'ongoing', 'check_in', 'check-in'].includes(String(item.status ?? '').toLowerCase()));
  const upcomingTournament = sorted
    .filter((item) => item.scheduled_for && new Date(item.scheduled_for).getTime() > Date.now())
    .sort((a, b) => String(a.scheduled_for).localeCompare(String(b.scheduled_for)))[0];
  const nextAction = activeTournament
    ? {
        label: 'Tournament active',
        title: activeTournament.title,
        copy: 'Participant readiness, match operations and results should be managed from this tournament now.',
        href: `/app/organizer/tournaments/${activeTournament.slug}`,
        cta: 'Open tournament control',
      }
    : pendingApproval
      ? {
          label: 'Awaiting review',
          title: pendingApproval.title,
          copy: 'This tournament is submitted for approval. Open it to review the current state and any blockers before launch.',
          href: `/app/organizer/tournaments/${pendingApproval.slug}`,
          cta: 'Review submission',
        }
      : upcomingTournament
        ? {
            label: 'Upcoming tournament',
            title: upcomingTournament.title,
            copy: 'Prepare participants, communications and match operations before the scheduled start.',
            href: `/app/organizer/tournaments/${upcomingTournament.slug}`,
            cta: 'Prepare tournament',
          }
        : {
            label: 'Ready to host',
            title: 'Create your next tournament',
            copy: 'Start with the competition itself. Participants, match operations, finance and communications should live inside that tournament.',
            href: '/app/organizer/tournaments/new',
            cta: 'Create tournament',
          };

  const totalParticipants = tournaments.reduce((sum, item) => sum + Number(item.player_count ?? 0), 0);
  const activeCount = tournaments.filter((item) => ['live', 'active', 'ongoing', 'check_in', 'check-in'].includes(String(item.status ?? '').toLowerCase())).length;

  return (
    <V5AppShell workspace="organizer" section="">
      <div className={styles.page}>
        <div className={styles.heading}>
          <div>
            <p className={styles.eyebrow}>Organizer home</p>
            <h1>Run the tournament, not the dashboard.</h1>
            <p>Your organizer workspace is centered on competitions. Open a tournament to manage its participants, matches, communications and money in context.</p>
          </div>
          <Link className={styles.primary} href="/app/organizer/tournaments/new"><Plus size={16} /> Create tournament</Link>
        </div>

        {error ? <div className={styles.error}><CircleAlert size={16} /> Tournament data could not be fully loaded. Existing organizer tools remain available.</div> : null}

        {loading ? <div className={styles.loading} /> : (
          <section className={styles.actionCard}>
            <div className={styles.actionTop}>
              <span className={styles.actionLabel}><Trophy size={16} /> Next organizer action</span>
              <span className={styles.badge}>{nextAction.label}</span>
            </div>
            <div>
              <h2>{nextAction.title}</h2>
              <p>{nextAction.copy}</p>
            </div>
            <div className={styles.actions}>
              <Link className={styles.primary} href={nextAction.href}>{nextAction.cta} <ArrowRight size={16} /></Link>
              <Link className={styles.secondary} href="/app/organizer/tournaments">All tournaments</Link>
            </div>
          </section>
        )}

        <div className={styles.stats}>
          <div className={styles.stat}><strong>{tournaments.length}</strong><span>Tournaments created</span></div>
          <div className={styles.stat}><strong>{activeCount}</strong><span>Active competitions</span></div>
          <div className={styles.stat}><strong>{totalParticipants}</strong><span>Participant entries</span></div>
        </div>

        <div className={styles.grid}>
          <section className={styles.panel}>
            <div className={styles.panelHead}>
              <div><p className={styles.eyebrow}>Your tournaments</p><h2>Operate in context</h2></div>
              <Trophy size={22} />
            </div>
            <div className={styles.list}>
              {sorted.slice(0, 6).map((item) => (
                <div className={styles.row} key={item.id}>
                  <div className={styles.rowMeta}>
                    <strong>{item.title}</strong>
                    <small>{item.game || 'Tournament'} · {item.status || 'Draft'} · {Number(item.player_count ?? 0)}/{Number(item.size ?? 0) || '—'} entries</small>
                  </div>
                  <Link className={styles.secondary} href={`/app/organizer/tournaments/${item.slug}`}>Manage</Link>
                </div>
              ))}
              {!loading && tournaments.length === 0 ? <p className={styles.empty}>You have not created a tournament yet. Create one and the operational workspace will grow from that competition.</p> : null}
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHead}>
              <div><p className={styles.eyebrow}>Organizer foundation</p><h2>Keep the public trust layer strong</h2></div>
              <ShieldCheck size={22} />
            </div>
            <p>Use Organization for your public organizer identity. Participant, match, communication and finance tools should stay attached to the tournament they belong to.</p>
            <div className={styles.actions}>
              <Link className={styles.secondary} href="/app/organizer/organization">Organization</Link>
              <Link className={styles.secondary} href="/app/organizer/tournaments">Tournament list</Link>
            </div>
          </section>
        </div>

        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <div><p className={styles.eyebrow}>Operating principle</p><h2>One tournament, one control surface.</h2></div>
            <UsersRound size={22} />
          </div>
          <p>When a tournament is open, its participant list, check-in state, match operations, communications and financial state should be managed from that tournament rather than scattered across unrelated top-level dashboards.</p>
        </section>
      </div>
    </V5AppShell>
  );
}
