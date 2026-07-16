import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BadgeCheck, CalendarClock, Gamepad2, MapPin, ShieldCheck, Trophy, Users } from 'lucide-react';
import { BrandLogo } from '@/components/BrandLogo';
import { GameCover } from '@/components/GameCover';
import { PLATFORMS } from '@/lib/config';
import { getLoginPath, getRegisterPath } from '@/lib/navigation';
import { getPublicTournamentBySlug } from '@/lib/public-tournament-data';
import { getTournamentPrizePoolLabel } from '@/lib/tournament-metrics';
import { formatTournamentDateTime } from '@/lib/tournament-schedule';
import type { PlatformKey } from '@/types';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ slug: string }>;
};

function statusLabel(status: string) {
  if (status === 'open') return 'Registration open';
  if (status === 'active') return 'Live now';
  if (status === 'full') return 'Bracket full';
  if (status === 'completed') return 'Completed';
  return status;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const tournament = await getPublicTournamentBySlug(slug);
  if (!tournament) return { title: 'Tournament Not Found | PlayMechi' };

  const title = `${tournament.title} | PlayMechi Tournament`;
  const description = `${tournament.game_label} tournament hosted by ${
    tournament.organizer?.username ?? 'PlayMechi'
  }. ${tournament.player_count} of ${tournament.size} places confirmed.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      url: tournament.links.public,
      siteName: 'PlayMechi',
    },
  };
}

export default async function PublicTournamentPage({ params }: Props) {
  const { slug } = await params;
  const tournament = await getPublicTournamentBySlug(slug);
  if (!tournament) notFound();

  const protectedTournamentPath = `/t/${tournament.slug}`;
  const platform = tournament.platform as PlatformKey | null;
  const startsAt = formatTournamentDateTime(
    tournament.scheduled_for ?? tournament.started_at ?? tournament.created_at,
    'Date to be announced'
  );
  const prizeLabel = getTournamentPrizePoolLabel({
    entryFee: tournament.entry_fee,
    prizePool: tournament.prize_pool,
    prizePoolMode: tournament.prize_pool_mode,
  });

  return (
    <div className="min-h-screen bg-[#f6f8fb] text-[#101828]">
      <header className="border-b border-[#e6eaf0] bg-white/95 backdrop-blur">
        <nav className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link href="/" aria-label="PlayMechi home">
            <BrandLogo size="sm" />
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/playmechi/tournaments" className="btn-ghost min-h-11">
              Browse tournaments
            </Link>
            <Link href={getLoginPath(protectedTournamentPath)} className="btn-primary min-h-11">
              Sign in
            </Link>
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(340px,0.9fr)] lg:items-start">
          <section className="overflow-hidden rounded-[28px] border border-[#e6eaf0] bg-white shadow-[0_24px_64px_rgba(16,24,40,0.08)]">
            <div className="relative min-h-72 sm:min-h-[420px]">
              <GameCover gameKey={tournament.game} className="h-full min-h-72 w-full sm:min-h-[420px]" overlay priority />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0b1121]/90 via-[#0b1121]/20 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-6 text-white sm:p-8">
                <span className="inline-flex rounded-full border border-white/20 bg-black/35 px-3 py-1.5 text-xs font-bold">
                  {statusLabel(tournament.status)}
                </span>
                <p className="mt-5 text-sm font-bold uppercase tracking-[0.14em] text-[#7de9d8]">
                  {tournament.game_label}
                </p>
                <h1 className="mt-2 max-w-3xl text-3xl font-black leading-tight sm:text-5xl">
                  {tournament.title}
                </h1>
              </div>
            </div>
          </section>

          <aside className="rounded-[28px] border border-[#e6eaf0] bg-white p-5 shadow-[0_18px_50px_rgba(16,24,40,0.07)] sm:p-7">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#168f80]">
              Tournament details
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <Detail icon={Users} label="Players" value={`${tournament.player_count}/${tournament.size}`} />
              <Detail
                icon={Trophy}
                label="Prize"
                value={prizeLabel}
              />
              <Detail
                icon={Gamepad2}
                label="Platform"
                value={platform ? PLATFORMS[platform]?.label ?? platform : 'Any platform'}
              />
              <Detail
                icon={MapPin}
                label="Region"
                value={tournament.region}
              />
            </div>

            <div className="mt-5 rounded-2xl bg-[#f6f8fb] p-4">
              <p className="flex items-center gap-2 text-sm font-bold text-[#344054]">
                <CalendarClock aria-hidden="true" className="size-4 text-[#168f80]" />
                {startsAt}
              </p>
              <p className="mt-3 flex items-center gap-2 text-sm text-[#667085]">
                <BadgeCheck aria-hidden="true" className="size-4 text-[#168f80]" />
                Hosted by{' '}
                {tournament.links.organizer ? (
                  <Link href={tournament.links.organizer} className="font-bold text-[#101828] hover:text-[#168f80]">
                    {tournament.organizer?.username}
                  </Link>
                ) : (
                  tournament.organizer?.username ?? 'PlayMechi organizer'
                )}
              </p>
            </div>

            <div className="mt-5 rounded-2xl border border-[#cdeee8] bg-[#effcf9] p-4 text-sm leading-6 text-[#42635e]">
              <p className="flex items-center gap-2 font-bold text-[#116b60]">
                <ShieldCheck aria-hidden="true" className="size-4" />
                Credible competition
              </p>
              <p className="mt-1">
                Results, bracket progress, and disputes are recorded through PlayMechi.
              </p>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <Link href={getLoginPath(protectedTournamentPath)} className="btn-primary min-h-12 justify-center">
                {tournament.status === 'open' ? 'Join tournament' : 'Open tournament'}
              </Link>
              <Link
                href={getRegisterPath({ next: protectedTournamentPath })}
                className="btn-outline min-h-12 justify-center"
              >
                Create account
              </Link>
            </div>
          </aside>
        </div>

        {tournament.rules ? (
          <section className="mt-6 rounded-[28px] border border-[#e6eaf0] bg-white p-6 sm:p-8">
            <h2 className="text-xl font-black text-[#101828]">Rules and player guidance</h2>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[#667085]">
              {tournament.rules}
            </p>
          </section>
        ) : null}
      </main>
    </div>
  );
}

function Detail({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-[#e6eaf0] p-3.5">
      <Icon aria-hidden="true" className="size-4 text-[#168f80]" />
      <p className="mt-2 truncate text-sm font-black text-[#101828]">{value}</p>
      <p className="mt-1 text-xs text-[#98a2b3]">{label}</p>
    </div>
  );
}
