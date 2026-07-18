import Link from 'next/link';
import {
  ArrowRight,
  CalendarClock,
  Gamepad2,
  MapPin,
  ShieldCheck,
  Trophy,
  UsersRound,
} from 'lucide-react';
import { V5Shell } from '@/components/v5/V5Public';
import type { PublicTournament } from '@/lib/public-tournament-data';
import styles from './V5TournamentDetail.module.css';

export function V5TournamentDetail({ tournament }: { tournament: PublicTournament }) {
  const isFreeNoPrize = tournament.entry_fee === 0 && tournament.prize_pool === 0;
  const scheduled = tournament.scheduled_for
    ? new Intl.DateTimeFormat('en-KE', {
        day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
        timeZone: 'Africa/Nairobi',
      }).format(new Date(tournament.scheduled_for))
    : 'Schedule to be confirmed';

  return (
    <V5Shell>
      <div className={styles.canvas}>
        <div className={styles.breadcrumbs}><Link href="/tournaments">Tournaments</Link><span>/</span><strong>{tournament.title}</strong></div>
        <section className={styles.hero}>
          <div className={styles.art}>
            <span className={styles.game}><Gamepad2 size={18} /> {tournament.game_label}</span>
            <div><p>PlayMechi tournament</p><h1>{tournament.title}</h1><span className={styles.live}>{tournament.status === 'open' ? 'Registration open' : tournament.status}</span></div>
          </div>
          <aside className={styles.summary}>
            <p className={styles.eyebrow}>Tournament details</p>
            <h2>{tournament.title}</h2>
            <p className={styles.organizer}><ShieldCheck size={17} /> Hosted by <strong>{tournament.organizer?.username || 'PlayMechi organizer'}</strong></p>
            <div className={styles.details}>
              <Detail icon={<UsersRound />} label="Players" value={`${tournament.player_count}/${tournament.size}`} />
              <Detail icon={<Trophy />} label="Prize" value={tournament.prize_pool > 0 ? `KES ${tournament.prize_pool.toLocaleString('en-KE')}` : 'No cash prize'} />
              <Detail icon={<Gamepad2 />} label="Platform" value={tournament.platform || 'See rules'} />
              <Detail icon={<MapPin />} label="Region" value={tournament.region} />
            </div>
            <div className={styles.schedule}><CalendarClock size={18} /><div><strong>{scheduled} EAT</strong><span>{tournament.slots_left} slots remaining</span></div></div>
            <div className={styles.labels}><span>{tournament.entry_fee === 0 ? 'Free entry' : `KES ${tournament.entry_fee.toLocaleString('en-KE')} entry`}</span><span>{isFreeNoPrize ? 'No valuable reward' : 'Mechi approved'}</span></div>
            <Link className={styles.primary} href={`/app/player/tournaments?join=${encodeURIComponent(tournament.slug)}`}>Enter from Player Dashboard <ArrowRight size={17} /></Link>
            <p className={styles.contextNote}>Sign in returns you to this tournament. Registration, payment, check-in and match actions stay in your Player Dashboard.</p>
          </aside>
        </section>

        <section className={styles.bodyGrid}>
          <article className={styles.panel}>
            <p className={styles.eyebrow}>Rules and format</p>
            <h2>Know what happens before you enter.</h2>
            <div className={styles.rules}>{tournament.rules || 'The organizer will publish complete competition rules before registration closes.'}</div>
          </article>
          <aside className={styles.trustPanel}>
            <ShieldCheck size={24} />
            <h2>Credible competition</h2>
            <p>Registration, payment references, bracket progress, result evidence and disputes are recorded through PlayMechi.</p>
            <ul><li>Verified competition identity</li><li>Recorded result and evidence trail</li><li>Clear dispute and recovery path</li></ul>
          </aside>
        </section>
      </div>
    </V5Shell>
  );
}

function Detail({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className={styles.detail}><span>{icon}</span><div><small>{label}</small><strong>{value}</strong></div></div>;
}
