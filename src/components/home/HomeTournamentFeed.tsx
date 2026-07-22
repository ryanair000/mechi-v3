'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { BadgeCheck, CalendarDays, RotateCcw, Users } from 'lucide-react';
import styles from './PlayMechiHome.module.css';

type PublicTournament = {
  slug: string;
  title: string;
  game: string;
  game_label?: string;
  region: string;
  size: number;
  player_count?: number;
  entry_fee: number;
  prize_pool: number;
  status: string;
  scheduled_for?: string | null;
  organizer?: { username: string } | null;
};

type PublicTournamentResponse = {
  tournaments?: PublicTournament[];
};

const gameImages: Record<string, string> = {
  pubgm: '/game-artwork/pubgm-header.webp',
  codm: '/game-artwork/codm-header.webp',
  efootball: '/game-artwork/efootball-header-photo.png',
  efootball_mobile: '/game-artwork/efootball_mobile-header.webp',
  fc26: '/game-artwork/fc26-header.webp',
  tekken8: '/game-artwork/tekken8-header.webp',
  valorant: '/game-artwork/valorant-header.webp',
  mk11: '/game-artwork/mk11-header.webp',
};

const competitionExamples = [
  { title: 'Mechi Valor Showdown', game: 'SHOOTER', artwork: 'approvedCompetitionOne' },
  { title: 'Mechi FC League', game: 'FOOTBALL', artwork: 'approvedCompetitionTwo' },
  { title: 'Mechi Legends Clash', game: 'BATTLE', artwork: 'approvedCompetitionThree' },
] as const;

function usePublicTournaments() {
  const [tournaments, setTournaments] = useState<PublicTournament[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'empty' | 'error'>('loading');
  const [requestKey, setRequestKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    fetch('/api/public/tournaments?limit=12', { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('Tournament feed unavailable');
        return response.json() as Promise<PublicTournamentResponse>;
      })
      .then((payload) => {
        const next = payload.tournaments ?? [];
        setTournaments(next);
        setStatus(next.length ? 'ready' : 'empty');
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setTournaments([]);
        setStatus('error');
      });

    return () => controller.abort();
  }, [requestKey]);

  return {
    tournaments,
    status,
    retry: () => {
      setStatus('loading');
      setRequestKey((value) => value + 1);
    },
  };
}

function tournamentHref(tournament: PublicTournament) {
  return `/s/t/${encodeURIComponent(tournament.slug)}`;
}

function getGameImage(game: string) {
  return gameImages[game] ?? '/dashboard-promos/playmechi-launch-mobile-gaming.jpg';
}

function formatSchedule(value?: string | null) {
  if (!value) return 'Schedule published by organizer';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Schedule published by organizer';
  return new Intl.DateTimeFormat('en-KE', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Africa/Nairobi',
  }).format(date);
}

function formatEntry(tournament: PublicTournament) {
  const fee = Number(tournament.entry_fee ?? 0);
  return fee > 0 ? `KES ${fee.toLocaleString('en-KE')} entry` : 'Free entry';
}

function formatReward(tournament: PublicTournament) {
  const prize = Number(tournament.prize_pool ?? 0);
  if (prize > 0) return `KES ${prize.toLocaleString('en-KE')} prize`;
  return Number(tournament.entry_fee ?? 0) > 0 ? 'Mechi approved' : 'No prizes';
}

function statusLabel(status: string) {
  if (status === 'active') return 'Live';
  if (status === 'open') return 'Registration open';
  if (status === 'full') return 'Bracket full';
  return status.replaceAll('_', ' ');
}

export function HomeFeaturedTournament() {
  const { tournaments, status } = usePublicTournaments();
  const featured = tournaments.find((tournament) => tournament.status === 'active') ?? tournaments[0];

  if (!featured) {
    return (
      <article className={styles.featuredCard} aria-busy={status === 'loading'}>
        <div className={`${styles.featuredImage} ${styles.approvedHeroArtwork}`} role="img" aria-label="Players competing in a PlayMechi tournament" />
        <div className={styles.featuredBody}>
          <p className={styles.liveLabel}><span /> TOURNAMENTS ON PLAYMECHI</p>
          <h2>Find your next competition</h2>
          <p className={styles.featuredDescription}>Join solo or team events, submit verified results, and build a competitive record that follows you.</p>
          <div className={styles.tags}><span>Solo or team</span><span>Free or approved paid</span></div>
          <Link className={styles.outlineButton} href="/playmechi/tournaments">Browse tournaments</Link>
        </div>
      </article>
    );
  }

  const playerCount = Number(featured.player_count ?? 0);
  const progress = Math.min(100, Math.round((playerCount / Math.max(1, featured.size)) * 100));

  return (
    <article className={styles.featuredCard}>
      <div className={styles.featuredImage}>
        <Image
          src={getGameImage(featured.game)}
          alt={`${featured.game_label ?? featured.game} tournament artwork`}
          fill
          sizes="(max-width: 900px) calc(100vw - 40px), 520px"
          preload
        />
      </div>
      <div className={styles.featuredBody}>
        <p className={styles.liveLabel}><span /> {statusLabel(featured.status)}</p>
        <h2>{featured.title}</h2>
        <p className={styles.featuredDescription}>{featured.game_label ?? featured.game} · {featured.organizer?.username ?? 'Verified PlayMechi organizer'}</p>
        <div className={styles.tags}><span>{formatEntry(featured)}</span><span>{formatReward(featured)}</span></div>
        <p className={styles.featureMeta}><CalendarDays size={16} /> {formatSchedule(featured.scheduled_for)} <Users size={16} /> {playerCount} / {featured.size}</p>
        <div className={styles.progress} role="progressbar" aria-label="Tournament capacity" aria-valuemin={0} aria-valuemax={featured.size} aria-valuenow={playerCount}><span style={{ width: `${progress}%` }} /></div>
        <Link className={styles.outlineButton} href={tournamentHref(featured)}>View tournament</Link>
      </div>
    </article>
  );
}

export function HomeTournamentExplorer() {
  const { tournaments, status, retry } = usePublicTournaments();
  const [game, setGame] = useState('all');
  const [region, setRegion] = useState('all');
  const [liveOnly, setLiveOnly] = useState(false);

  const games = useMemo(() => Array.from(new Map(tournaments.map((tournament) => [tournament.game, tournament.game_label ?? tournament.game])).entries()), [tournaments]);
  const regions = useMemo(() => Array.from(new Set(tournaments.map((tournament) => tournament.region).filter(Boolean))).sort(), [tournaments]);
  const visible = useMemo(() => tournaments.filter((tournament) => {
    if (game !== 'all' && tournament.game !== game) return false;
    if (region !== 'all' && tournament.region !== region) return false;
    if (liveOnly && tournament.status !== 'active') return false;
    return true;
  }).slice(0, 3), [game, liveOnly, region, tournaments]);
  const showingExamples = status === 'error' || status === 'empty';

  return (
    <section className={styles.competitionSection} id="tournaments" aria-labelledby="competition-heading">
      <div className={styles.sectionTop}>
        <div>
          <h2 id="competition-heading">Competitions happening now</h2>
          <p>{showingExamples ? 'A preview of the competition formats you can discover and host.' : 'Explore current events from verified PlayMechi organizers.'}</p>
        </div>
        {!showingExamples ? <div className={styles.filters} aria-label="Tournament filters">
          <label><span className={styles.srOnly}>Filter by game</span><select value={game} onChange={(event) => setGame(event.target.value)}><option value="all">All games</option>{games.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
          <label><span className={styles.srOnly}>Filter by region</span><select value={region} onChange={(event) => setRegion(event.target.value)}><option value="all">All regions</option>{regions.map((value) => <option value={value} key={value}>{value}</option>)}</select></label>
          <button type="button" className={liveOnly ? styles.filterActive : ''} aria-pressed={liveOnly} onClick={() => setLiveOnly((value) => !value)}><span /> Live only</button>
        </div> : null}
      </div>

      {status === 'loading' ? (
        <div className={styles.competitionGrid} aria-label="Loading tournaments">
          {[0, 1, 2].map((item) => <div className={styles.tournamentSkeleton} key={item} />)}
        </div>
      ) : visible.length ? (
        <div className={styles.competitionGrid}>
          {visible.map((tournament) => (
            <article className={styles.competitionCard} key={tournament.slug}>
              <div className={styles.cardImage}>
                <Image src={getGameImage(tournament.game)} alt="" fill sizes="(max-width: 700px) calc(100vw - 40px), (max-width: 1100px) 45vw, 390px" />
                <span className={tournament.status === 'active' ? styles.statusLive : styles.statusOpen}>{statusLabel(tournament.status)}</span>
              </div>
              <div className={styles.competitionBody}>
                <p className={styles.gameLabel}>{tournament.game_label ?? tournament.game}</p>
                <h3>{tournament.title}</h3>
                <p><CalendarDays size={15} /> {formatSchedule(tournament.scheduled_for)}</p>
                <p><Users size={15} /> {Number(tournament.player_count ?? 0)} / {tournament.size} · {tournament.region}</p>
                <p className={styles.verified}><BadgeCheck size={16} /> {tournament.organizer?.username ?? 'Verified organizer'}</p>
                <div className={styles.cardPolicies}><span>{formatEntry(tournament)}</span><span>{formatReward(tournament)}</span></div>
                <Link className={styles.outlineButton} href={tournamentHref(tournament)}>{tournament.status === 'active' ? 'Watch or follow' : 'View tournament'}</Link>
              </div>
            </article>
          ))}
        </div>
      ) : showingExamples ? (
        <>
          <div className={styles.feedNotice} role="status">
            <p>{status === 'error' ? 'Live tournament updates are reconnecting. These sample cards show the PlayMechi tournament experience.' : 'New public tournaments will appear here. Explore the formats below or host the next one.'}</p>
            <div>{status === 'error' ? <button type="button" onClick={retry}><RotateCcw size={16} /> Try live feed</button> : null}<Link href="/playmechi/tournaments">Open tournament directory</Link></div>
          </div>
          <div className={styles.competitionGrid}>
            {competitionExamples.map((example) => (
              <article className={styles.competitionCard} key={example.title}>
                <div className={`${styles.cardImage} ${styles[example.artwork]}`} role="img" aria-label={`${example.title} example artwork`}><span className={styles.statusExample}>Example</span></div>
                <div className={styles.competitionBody}>
                  <p className={styles.gameLabel}>{example.game}</p>
                  <h3>{example.title}</h3>
                  <p><CalendarDays size={15} /> Flexible schedules</p>
                  <p><Users size={15} /> Solo or team formats</p>
                  <p className={styles.verified}><BadgeCheck size={16} /> Verified PlayMechi results</p>
                  <div className={styles.cardPolicies}><span>Free or approved paid</span><span>Clear rules</span></div>
                  <Link className={styles.outlineButton} href="/playmechi/tournaments">Browse tournaments</Link>
                </div>
              </article>
            ))}
          </div>
        </>
      ) : (
        <div className={styles.tournamentEmpty}>
          <div><h3>No tournaments match these filters</h3><p>Clear a filter or host the next community competition.</p></div>
          <div><Link href="/playmechi/tournaments">Open tournament directory</Link></div>
        </div>
      )}
    </section>
  );
}
