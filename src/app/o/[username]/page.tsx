import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CalendarClock, Trophy, Users } from 'lucide-react';
import { BrandLogo } from '@/components/BrandLogo';
import { GameCover } from '@/components/GameCover';
import { GAMES } from '@/lib/config';
import { filterVisibleTournaments } from '@/lib/e2e-fixtures';
import { getTournamentPrizePoolLabel } from '@/lib/tournament-metrics';
import { formatTournamentDateTime } from '@/lib/tournament-schedule';
import { createServiceClient } from '@/lib/supabase';
import { isTournamentPubliclyAccessible } from '@/lib/tournament-policy';
import type { GameKey, TournamentPrizePoolMode, TournamentStatus } from '@/types';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ username: string }>;
};

type OrganizerProfile = {
  id: string;
  username: string;
  avatar_url?: string | null;
  cover_url?: string | null;
  region?: string | null;
};

type OrganizerTournament = {
  id: string;
  slug: string;
  title: string;
  game: GameKey;
  platform?: string | null;
  region: string;
  size: number;
  entry_fee: number;
  prize_pool_mode?: TournamentPrizePoolMode | string | null;
  prize_pool: number;
  status: TournamentStatus;
  approval_status?: string | null;
  scheduled_for?: string | null;
  started_at?: string | null;
  created_at: string;
  is_featured?: boolean | null;
  winner?: { id: string; username: string } | Array<{ id: string; username: string }> | null;
  player_count?: number;
};

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

async function getOrganizerPageData(username: string) {
  const decodedUsername = decodeURIComponent(username).trim();
  if (!decodedUsername) return null;

  const supabase = createServiceClient();
  const { data: profileRaw } = await supabase
    .from('profiles')
    .select('id, username, avatar_url, cover_url, region')
    .ilike('username', decodedUsername)
    .maybeSingle();

  const profile = profileRaw as OrganizerProfile | null;
  if (!profile) return null;

  const { data: tournamentsRaw } = await supabase
    .from('tournaments')
    .select(
      'id, slug, title, game, platform, region, size, entry_fee, prize_pool_mode, prize_pool, status, approval_status, scheduled_for, started_at, created_at, is_featured, winner:winner_id(id, username)'
    )
    .eq('organizer_id', profile.id)
    .in('status', ['open', 'full', 'active', 'completed'])
    .order('is_featured', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(24);

  const tournaments = filterVisibleTournaments(
    ((tournamentsRaw ?? []) as OrganizerTournament[]).filter(
      (tournament) =>
        tournament.status !== 'cancelled' &&
        isTournamentPubliclyAccessible({
          entryFee: tournament.entry_fee,
          prizePool: tournament.prize_pool,
          prizePoolMode: tournament.prize_pool_mode,
          approvalStatus: tournament.approval_status,
        })
    )
  );

  if (!tournaments.length) {
    return { profile, tournaments };
  }

  const { data: playersRaw } = await supabase
    .from('tournament_players')
    .select('tournament_id, payment_status')
    .in(
      'tournament_id',
      tournaments.map((tournament) => tournament.id)
    )
    .in('payment_status', ['paid', 'free']);

  const counts = (playersRaw ?? []).reduce<Record<string, number>>((grouped, player) => {
    const tournamentId = player.tournament_id as string | undefined;
    if (!tournamentId) return grouped;
    grouped[tournamentId] = (grouped[tournamentId] ?? 0) + 1;
    return grouped;
  }, {});

  return {
    profile,
    tournaments: tournaments.map((tournament) => ({
      ...tournament,
      player_count: counts[tournament.id] ?? 0,
    })),
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const data = await getOrganizerPageData(username);
  if (!data) return { title: 'Organizer Not Found | PlayMechi' };

  return {
    title: `${data.profile.username} | PlayMechi Organizer`,
    description: `Public PlayMechi organizer page for ${data.profile.username}. Browse tournaments, games, slots, and prizes.`,
  };
}

function statusLabel(status: TournamentStatus) {
  switch (status) {
    case 'open':
      return 'Open';
    case 'full':
      return 'Ongoing';
    case 'active':
      return 'Live';
    case 'completed':
      return 'Completed';
    case 'cancelled':
      return 'Cancelled';
    default:
      return status;
  }
}

export default async function OrganizerPage({ params }: Props) {
  const { username } = await params;
  const data = await getOrganizerPageData(username);
  if (!data) notFound();

  const { profile, tournaments } = data;
  const totalPlayers = tournaments.reduce(
    (total, tournament) => total + Number(tournament.player_count ?? 0),
    0
  );
  const activeEvents = tournaments.filter((tournament) =>
    ['open', 'full', 'active'].includes(tournament.status)
  ).length;
  const completedEvents = tournaments.filter((tournament) => tournament.status === 'completed').length;
  const shareText = encodeURIComponent(
    `${profile.username} hosts tournaments on PlayMechi. Browse the page: https://mechi.club/o/${encodeURIComponent(profile.username)}`
  );

  return (
    <div className="page-base min-h-screen">
      <nav className="landing-shell flex h-16 items-center justify-between border-b border-[var(--border-color)]">
        <Link href="/playmechi" className="flex items-center">
          <BrandLogo size="sm" />
        </Link>
        <Link href="/playmechi/tournaments" className="brand-link text-sm font-black">
          Tournaments
        </Link>
      </nav>

      <main className="landing-shell py-10 sm:py-14">
        <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-end">
          <div>
            <p className="section-title">PlayMechi organizer</p>
            <h1 className="mt-3 text-4xl font-black leading-tight text-[var(--text-primary)] sm:text-5xl">
              {profile.username}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-secondary)] sm:text-base">
              Public organizer page for tournaments, schedules, games, and community events hosted
              through Mechi.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link href={`/s/${encodeURIComponent(profile.username)}`} className="btn-ghost">
                Player profile
              </Link>
              <a
                href={`https://wa.me/?text=${shareText}`}
                target="_blank"
                rel="noreferrer"
                className="btn-ghost"
              >
                Share page
              </a>
              <Link href="/tournaments/create" className="btn-primary">
                Host a tournament
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--surface-strong)] sm:grid-cols-4">
            {[
              ['Events', tournaments.length],
              ['Players', totalPlayers],
              ['Active', activeEvents],
              ['Winners', completedEvents],
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

        {tournaments.length === 0 ? (
          <section className="card mt-8 p-10 text-center">
            <Trophy className="mx-auto h-8 w-8 text-[var(--text-soft)]" />
            <h2 className="mt-4 text-xl font-black text-[var(--text-primary)]">
              No public tournaments yet.
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--text-secondary)]">
              When this organizer publishes events, they will appear here.
            </p>
          </section>
        ) : (
          <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {tournaments.map((tournament) => {
              const winner = firstRelation(tournament.winner);

              return (
                <article key={tournament.id} className="card overflow-hidden">
                  <div className="relative h-44">
                    <GameCover gameKey={tournament.game} className="h-full w-full" overlay />
                    <div className="absolute left-4 top-4 rounded-[var(--radius-control)] border border-white/16 bg-black/40 px-2.5 py-1 text-xs font-black text-white">
                      {statusLabel(tournament.status)}
                    </div>
                  </div>
                  <div className="p-5">
                    <p className="section-title">{GAMES[tournament.game]?.label ?? tournament.game}</p>
                    <h2 className="mt-2 min-h-12 text-xl font-black text-[var(--text-primary)]">
                      {tournament.title}
                    </h2>
                    <div className="mt-4 grid gap-2 text-sm">
                      <InfoRow
                        icon={<Users className="h-4 w-4" />}
                        label="Players"
                        value={`${tournament.player_count ?? 0}/${tournament.size}`}
                      />
                      <InfoRow
                        icon={<Trophy className="h-4 w-4" />}
                        label="Prize"
                        value={getTournamentPrizePoolLabel({
                          entryFee: tournament.entry_fee,
                          prizePool: tournament.prize_pool,
                          prizePoolMode: tournament.prize_pool_mode,
                        })}
                      />
                      <InfoRow
                        icon={<CalendarClock className="h-4 w-4" />}
                        label="Starts"
                        value={formatTournamentDateTime(
                          tournament.scheduled_for ?? tournament.started_at ?? tournament.created_at,
                          'Date TBA'
                        )}
                      />
                      {winner ? (
                        <InfoRow
                          icon={<Trophy className="h-4 w-4" />}
                          label="Winner"
                          value={winner.username}
                        />
                      ) : null}
                    </div>
                    <Link href={`/s/t/${encodeURIComponent(tournament.slug)}`} className="btn-primary mt-5 w-full justify-center">
                      View tournament
                    </Link>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </main>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="inline-flex items-center gap-2 text-[var(--text-secondary)]">
        {icon}
        {label}
      </span>
      <span className="text-right font-black text-[var(--text-primary)]">{value}</span>
    </div>
  );
}
