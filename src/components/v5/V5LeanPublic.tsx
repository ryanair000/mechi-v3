import type { ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, CircleAlert, Gamepad2, ShieldCheck, Trophy } from 'lucide-react';
import { V5PublicHeader } from '@/components/v5/V5PublicHeader';
import { V5TournamentDirectory } from '@/components/v5/V5TournamentDirectory';
import { listPublicTournaments, type PublicTournament } from '@/lib/public-tournament-data';
import styles from './V5LeanPublic.module.css';

type TournamentLoadState = {
  tournaments: PublicTournament[];
  failed: boolean;
};

async function loadTournaments(limit: number, country?: string): Promise<TournamentLoadState> {
  try {
    const tournaments = await listPublicTournaments({ status: 'all', limit, country });
    return { tournaments, failed: false };
  } catch (error) {
    console.error('[V5 public] tournament load failed', error);
    return { tournaments: [], failed: true };
  }
}

export function V5LeanShell({ children }: { children: ReactNode }) {
  return (
    <div className={styles.page}>
      <V5PublicHeader />
      <main id="main-content" className={styles.main} tabIndex={-1}>{children}</main>
      <V5LeanFooter />
    </div>
  );
}

function V5LeanFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.footerGrid}>
          <div className={styles.footerBrand}>
            <strong>MECHI</strong>
            <p>Find competition, play verified matches, and build a competitive gaming record.</p>
          </div>
          <div>
            <h3>Compete</h3>
            <div className={styles.footerLinks}>
              <Link href="/tournaments">Tournaments</Link>
              <Link href="/leaderboard">Rankings</Link>
              <Link href="/how-mechi-works">How it works</Link>
            </div>
          </div>
          <div>
            <h3>Organize</h3>
            <div className={styles.footerLinks}>
              <Link href="/app/organizer/tournaments/new">Host a tournament</Link>
              <Link href="/app/organizer">Organizer dashboard</Link>
            </div>
          </div>
          <div>
            <h3>Support</h3>
            <div className={styles.footerLinks}>
              <Link href="/support">Help & safety</Link>
              <Link href="/terms-of-service">Terms</Link>
              <Link href="/privacy-policy">Privacy</Link>
            </div>
          </div>
        </div>
        <div className={styles.copyright}>© 2026 Mechi. Competition built around real player activity.</div>
      </div>
    </footer>
  );
}

function TournamentSummary({ tournament }: { tournament: PublicTournament }) {
  const scheduled = tournament.scheduled_for
    ? new Intl.DateTimeFormat('en-KE', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Africa/Nairobi',
      }).format(new Date(tournament.scheduled_for))
    : 'Schedule pending';

  return (
    <article className={styles.feature}>
      <div className={styles.art}>
        <Image
          src="/game-artwork/efootball-header-photo.png"
          alt="Competitive gaming"
          fill
          priority
          sizes="(max-width: 860px) calc(100vw - 32px), 42vw"
        />
      </div>
      <div className={styles.featureBody}>
        <span className={styles.status}>{tournament.status === 'active' ? 'Live' : tournament.status === 'open' ? 'Registration open' : tournament.status}</span>
        <h2>{tournament.title}</h2>
        <div className={styles.meta}>
          <span>{tournament.game_label}</span>
          <span>{tournament.entry_fee > 0 ? `KES ${tournament.entry_fee.toLocaleString('en-KE')} entry` : 'Free entry'}</span>
          <span>{scheduled} EAT</span>
          <span>{tournament.player_count}/{tournament.size} players</span>
        </div>
        <Link className={styles.primary} href={`/tournaments/${encodeURIComponent(tournament.slug)}`}>View tournament <ArrowRight size={16} /></Link>
      </div>
    </article>
  );
}

function TournamentUnavailable({ failed }: { failed: boolean }) {
  return (
    <article className={`${styles.feature} ${styles.empty}`}>
      <span className={styles.emptyIcon}>{failed ? <CircleAlert size={24} /> : <Trophy size={24} />}</span>
      <h2>{failed ? 'Tournaments are temporarily unavailable.' : 'No open tournaments right now.'}</h2>
      <p>{failed ? 'We could not load live competition data. Nothing has been substituted or invented.' : 'New competitions will appear here as organizers publish them.'}</p>
      <div className={styles.actions}>
        <Link className={styles.primary} href="/tournaments">{failed ? 'Try tournament directory' : 'Explore tournaments'} <ArrowRight size={16} /></Link>
        <Link className={styles.secondary} href="/app/organizer/tournaments/new">Host a tournament</Link>
      </div>
    </article>
  );
}

export async function V5LeanHomePage({ country }: { country?: string } = {}) {
  const { tournaments, failed } = await loadTournaments(3, country);
  const featured = tournaments[0];

  return (
    <V5LeanShell>
      <section className={`${styles.container} ${styles.hero}`}>
        <div>
          <p className={styles.eyebrow}>Competitive gaming on Mechi</p>
          <h1>Find competition. Play. Build your record.</h1>
          <p className={styles.heroCopy}>Discover real gaming tournaments, enter securely, play verified matches, and build a competitive record that grows with you.</p>
          <div className={styles.actions}>
            <Link className={styles.primary} href="/tournaments">Find tournaments <ArrowRight size={16} /></Link>
            <Link className={styles.secondary} href="/app/organizer/tournaments/new">Host a tournament</Link>
          </div>
        </div>
        {featured ? <TournamentSummary tournament={featured} /> : <TournamentUnavailable failed={failed} />}
      </section>

      <section className={styles.sectionSoft}>
        <div className={styles.container}>
          <div className={styles.sectionHead}>
            <div><h2>How Mechi works</h2><p>A simple competition loop, not another dashboard maze.</p></div>
            <Link className={styles.textLink} href="/how-mechi-works">See how it works →</Link>
          </div>
          <div className={styles.cards}>
            <article className={styles.card}><span className={styles.cardIcon}><Gamepad2 size={22} /></span><h3>1. Find a competition</h3><p>Browse real tournaments by game, entry, region, schedule and availability.</p></article>
            <article className={styles.card}><span className={styles.cardIcon}><CheckCircle2 size={22} /></span><h3>2. Play and verify</h3><p>Join, check in, play your match and keep results connected to the competition.</p></article>
            <article className={styles.card}><span className={styles.cardIcon}><Trophy size={22} /></span><h3>3. Build your record</h3><p>Verified results become part of your Mechi competitive history and rankings.</p></article>
          </div>
        </div>
      </section>

      <section className={`${styles.container} ${styles.section}`}>
        <div className={styles.host}>
          <div><h2>Run a tournament for your community.</h2><p>Create the competition, manage entries and operate verified results from the Organizer workspace.</p></div>
          <Link className={styles.primary} href="/app/organizer/tournaments/new">Create tournament <ArrowRight size={16} /></Link>
        </div>
      </section>

      <section className={`${styles.container} ${styles.section}`}>
        <div className={styles.sectionHead}>
          <div><h2>Competition data should be real.</h2><p>Mechi shows real tournaments and real activity. Empty data stays empty, and loading failures are shown as failures.</p></div>
          <ShieldCheck size={34} />
        </div>
      </section>
    </V5LeanShell>
  );
}

export async function V5LeanTournamentsPage() {
  const { tournaments, failed } = await loadTournaments(24);
  return (
    <V5LeanShell>
      {failed ? (
        <section className={styles.errorBox}>
          <CircleAlert size={28} />
          <h1>We couldn't load tournaments.</h1>
          <p>Tournament data is temporarily unavailable. This is an error state, not an empty tournament directory.</p>
          <Link href="/tournaments">Try again</Link>
        </section>
      ) : (
        <V5TournamentDirectory tournaments={tournaments} />
      )}
    </V5LeanShell>
  );
}
