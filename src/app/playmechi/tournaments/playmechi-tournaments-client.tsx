'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CalendarClock,
  ExternalLink,
  Filter,
  Search,
  Trophy,
  Users,
} from 'lucide-react';
import { HomeFloatingHeader } from '@/components/HomeFloatingHeader';
import { GAMES, getGameImage } from '@/lib/config';
import { COUNTRY_OPTIONS, getCountryLabel } from '@/lib/location';
import { getTournamentPrizePoolLabel } from '@/lib/tournament-metrics';
import { formatTournamentDateTime } from '@/lib/tournament-schedule';
import type { CountryKey, GameKey, TournamentPrizePoolMode, TournamentStatus } from '@/types';

type TournamentListItem = {
  slug: string;
  title: string;
  game: GameKey;
  platform?: string | null;
  region: string;
  size: number;
  entry_fee: number;
  prize_pool_mode?: TournamentPrizePoolMode | null;
  prize_pool: number;
  status: TournamentStatus;
  scheduled_for?: string | null;
  started_at?: string | null;
  created_at: string;
  organizer?: {
    id: string;
    username: string;
  } | null;
  player_count?: number;
};

type TournamentApiResponse = {
  tournaments?: TournamentListItem[];
  error?: string;
};

const STATUS_FILTERS = ['all', 'open', 'active', 'completed'] as const;
const ENTRY_FILTERS = ['all', 'free', 'paid'] as const;
const GAME_FILTERS: Array<'all' | GameKey> = ['all', 'pubgm', 'codm', 'efootball', 'fc26', 'mk11', 'tekken8'];
const COUNTRY_FILTERS: Array<'all' | CountryKey> = ['all', ...COUNTRY_OPTIONS.map((option) => option.key)];

function formatStatusLabel(status: string) {
  switch (status) {
    case 'open':
      return 'Open';
    case 'active':
      return 'Live';
    case 'full':
      return 'Full';
    case 'completed':
      return 'Completed';
    case 'cancelled':
      return 'Cancelled';
    default:
      return status;
  }
}

function getConfirmedCount(tournament: TournamentListItem) {
  return Number(tournament.player_count ?? 0);
}

function getTournamentHref(tournament: TournamentListItem) {
  return `/s/t/${encodeURIComponent(tournament.slug)}`;
}

function getOrganizerHref(tournament: TournamentListItem) {
  const username = tournament.organizer?.username?.trim();
  return username ? `/o/${encodeURIComponent(username)}` : null;
}

function getDateLabel(tournament: TournamentListItem) {
  return formatTournamentDateTime(
    tournament.scheduled_for ?? tournament.started_at ?? tournament.created_at,
    'Date TBA'
  );
}

function statusClassName(status: string) {
  switch (status) {
    case 'open':
      return 'brand-chip';
    case 'active':
      return 'rounded-[var(--radius-control)] border border-[rgba(50,224,196,0.24)] bg-[rgba(50,224,196,0.14)] px-2.5 py-1 text-xs font-bold text-[var(--accent-secondary-text)]';
    case 'completed':
      return 'rounded-[var(--radius-control)] border border-[var(--border-color)] bg-[var(--surface-elevated)] px-2.5 py-1 text-xs font-bold text-[var(--text-secondary)]';
    default:
      return 'brand-chip-coral';
  }
}

export function PlayMechiTournamentsClient() {
  const searchParams = useSearchParams();
  const requestedStatus = searchParams.get('status');
  const requestedEntry = searchParams.get('entry');
  const [tournaments, setTournaments] = useState<TournamentListItem[]>([]);
  const [status, setStatus] = useState<(typeof STATUS_FILTERS)[number]>(() =>
    STATUS_FILTERS.includes(requestedStatus as (typeof STATUS_FILTERS)[number])
      ? (requestedStatus as (typeof STATUS_FILTERS)[number])
      : 'all'
  );
  const [entry, setEntry] = useState<(typeof ENTRY_FILTERS)[number]>(() =>
    ENTRY_FILTERS.includes(requestedEntry as (typeof ENTRY_FILTERS)[number])
      ? (requestedEntry as (typeof ENTRY_FILTERS)[number])
      : 'all'
  );
  const [game, setGame] = useState<'all' | GameKey>('all');
  const [country, setCountry] = useState<'all' | CountryKey>('all');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTournaments = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const tournamentsRes = await fetch(
        `/api/public/tournaments?status=${encodeURIComponent(status)}&limit=50`
      );

      const data = (await tournamentsRes.json()) as TournamentApiResponse;
      if (!tournamentsRes.ok) {
        setTournaments([]);
        setError(data.error ?? 'Could not load tournaments');
      } else {
        setTournaments(data.tournaments ?? []);
      }

    } catch {
      setTournaments([]);
      setError('Tournament sync is unavailable right now');
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    void fetchTournaments();
  }, [fetchTournaments]);

  const filteredTournaments = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return tournaments.filter((tournament) => {
      if (game !== 'all' && tournament.game !== game) return false;
      if (entry === 'free' && tournament.entry_fee > 0) return false;
      if (entry === 'paid' && tournament.entry_fee <= 0) return false;
      if (country !== 'all') {
        const countryLabel = getCountryLabel(country).toLowerCase();
        if (!tournament.region.toLowerCase().startsWith(countryLabel)) return false;
      }
      if (!normalizedQuery) return true;

      return [
        tournament.title,
        tournament.region,
        tournament.organizer?.username,
        GAMES[tournament.game]?.label,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedQuery));
    });
  }, [country, entry, game, query, tournaments]);

  const totalPublicEvents = filteredTournaments.length;
  const visibleGames = new Set(filteredTournaments.map((tournament) => tournament.game)).size;

  return (
    <div className="page-base min-h-screen bg-[#f6f8fb] text-[#101828]">
      <HomeFloatingHeader
        navItems={[
          { href: '/playmechi', label: 'PLATFORM' },
          { href: '#events', label: 'EVENTS' },
          { href: '/how-mechi-works', label: 'HOW IT WORKS' },
          { href: '/tournaments/create', label: 'HOST' },
        ]}
        signInHref="/login?next=/playmechi/tournaments"
        joinHref="/register?next=/playmechi/tournaments"
      />

      <main className="landing-shell pb-12 pt-6 sm:pb-16 sm:pt-10">
        <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-end">
          <div>
            <p className="section-title">Tournament Marketplace</p>
            <h1 className="mt-3 text-4xl font-black leading-tight text-[var(--text-primary)] sm:text-5xl">
              Discover tournaments before you log in.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--text-secondary)] sm:text-base">
              Browse PlayMechi events by game, status, prize, region, and organizer.
              The marketplace starts with Mechi-run events and grows into a creator-led tournament network.
            </p>
          </div>

          <div className="card grid grid-cols-3 gap-0 overflow-hidden p-0">
            {[
              ['Events', totalPublicEvents],
              ['Games', visibleGames],
              ['Open filters', STATUS_FILTERS.length],
            ].map(([label, value]) => (
              <div key={label} className="border-r border-[var(--border-color)] p-4 last:border-r-0">
                <p className="text-xl font-black text-[var(--text-primary)]">{String(value)}</p>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-soft)]">
                  {label}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section id="events" className="mt-8">
          <div className="card p-4 sm:p-5">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_150px_150px_150px_150px]">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-soft)]" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className="input pl-10"
                  placeholder="Search tournament, game, region, or organizer"
                />
              </label>

              <label className="relative block">
                <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-soft)]" />
                <select
                  value={status}
                  onChange={(event) => setStatus(event.target.value as typeof status)}
                  className="input pl-10"
                >
                  {STATUS_FILTERS.map((item) => (
                    <option key={item} value={item}>
                      {item === 'all' ? 'All statuses' : formatStatusLabel(item)}
                    </option>
                  ))}
                </select>
              </label>

              <select
                value={game}
                onChange={(event) => setGame(event.target.value as typeof game)}
                className="input"
              >
                {GAME_FILTERS.map((item) => (
                  <option key={item} value={item}>
                    {item === 'all' ? 'All games' : GAMES[item]?.label ?? item}
                  </option>
                ))}
              </select>

              <select
                value={entry}
                onChange={(event) => setEntry(event.target.value as typeof entry)}
                className="input"
              >
                {ENTRY_FILTERS.map((item) => (
                  <option key={item} value={item}>
                    {item === 'all' ? 'All entry types' : item === 'free' ? 'Free entry' : 'Paid entry'}
                  </option>
                ))}
              </select>

              <select
                value={country}
                onChange={(event) => setCountry(event.target.value as typeof country)}
                className="input"
              >
                {COUNTRY_FILTERS.map((item) => (
                  <option key={item} value={item}>
                    {item === 'all' ? 'All countries' : getCountryLabel(item)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error ? (
            <div className="mt-4 rounded-[var(--radius-card)] border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
              {error}. Try refreshing in a moment.
            </div>
          ) : null}

          {loading ? (
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {[1, 2, 3].map((item) => (
                <div key={item} className="h-72 shimmer rounded-[var(--radius-card)]" />
              ))}
            </div>
          ) : filteredTournaments.length === 0 ? (
            <div className="card mt-5 p-10 text-center">
              <Trophy className="mx-auto h-8 w-8 text-[var(--text-soft)]" />
              <h2 className="mt-4 text-xl font-black text-[var(--text-primary)]">
                No matching self-serve tournaments yet.
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--text-secondary)]">
                The marketplace is ready for events. Host the next creator cup or clear the filters.
              </p>
              <Link href="/tournaments/create" className="btn-primary mt-5">
                Host Tournament
              </Link>
            </div>
          ) : (
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredTournaments.map((tournament) => (
                <TournamentCard key={tournament.slug} tournament={tournament} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function TournamentCard({ tournament }: { tournament: TournamentListItem }) {
  const game = GAMES[tournament.game];
  const image = getGameImage(tournament.game);
  const confirmedCount = getConfirmedCount(tournament);
  const progress = Math.min(100, (confirmedCount / Math.max(1, tournament.size)) * 100);
  const organizerHref = getOrganizerHref(tournament);

  return (
    <article className="card overflow-hidden">
      <div
        className="h-44 bg-cover bg-center"
        style={{ backgroundImage: image ? `url('${image}')` : "url('/dashboard-promos/playmechi-launch-mobile-gaming.jpg')" }}
      >
        <div className="flex h-full items-start justify-between gap-3 bg-[rgba(7,12,22,0.5)] p-4">
          <span className={statusClassName(tournament.status)}>
            {formatStatusLabel(tournament.status)}
          </span>
        </div>
      </div>

      <div className="p-5">
        <p className="section-title">{game?.label ?? tournament.game}</p>
        <h3 className="mt-2 min-h-12 text-xl font-black text-[var(--text-primary)]">
          {tournament.title}
        </h3>
        <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
          {organizerHref ? (
            <Link href={organizerHref} className="brand-link font-bold">
              {tournament.organizer?.username}
            </Link>
          ) : (
            'Organizer'
          )}{' '}
          in {tournament.region}.
        </p>

        <div className="mt-4 grid gap-2 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 text-[var(--text-secondary)]">
              <Users className="h-4 w-4 text-[var(--accent-secondary-text)]" />
              Players
            </span>
            <span className="font-black text-[var(--text-primary)]">
              {confirmedCount}/{tournament.size}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-[var(--border-color)]">
            <div className="h-full bg-[var(--brand-teal)]" style={{ width: `${progress}%` }} />
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 text-[var(--text-secondary)]">
              <Trophy className="h-4 w-4 text-[var(--accent-secondary-text)]" />
              Prize
            </span>
            <span className="font-black text-[var(--text-primary)]">
              {getTournamentPrizePoolLabel({
                entryFee: tournament.entry_fee,
                prizePool: tournament.prize_pool,
                prizePoolMode: tournament.prize_pool_mode ?? 'auto',
              })}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 text-[var(--text-secondary)]">
              <CalendarClock className="h-4 w-4 text-[var(--accent-secondary-text)]" />
              Starts
            </span>
            <span className="text-right font-black text-[var(--text-primary)]">
              {getDateLabel(tournament)}
            </span>
          </div>
        </div>

        <div className="mt-5 flex gap-2">
          <Link href={getTournamentHref(tournament)} className="btn-primary flex-1 justify-center">
            View Event
          </Link>
          <Link href={getTournamentHref(tournament)} className="btn-ghost px-3" aria-label={`Open ${tournament.title}`}>
            <ExternalLink className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </article>
  );
}
