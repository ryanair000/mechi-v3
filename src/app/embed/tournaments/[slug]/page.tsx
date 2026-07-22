import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CalendarClock, Trophy, Users } from 'lucide-react';
import { GameCover } from '@/components/GameCover';
import { getPublicTournamentBySlug } from '@/lib/public-tournament-data';
import { getTournamentPrizePoolLabel } from '@/lib/tournament-metrics';
import { formatTournamentDateTime } from '@/lib/tournament-schedule';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const tournament = await getPublicTournamentBySlug(slug);
  if (!tournament) return { title: 'Tournament Embed | PlayMechi' };

  return {
    title: `${tournament.title} Embed | PlayMechi`,
    robots: { index: false, follow: true },
  };
}

function statusLabel(status: string) {
  switch (status) {
    case 'open':
      return 'Open';
    case 'full':
      return 'Ongoing';
    case 'active':
      return 'Live';
    case 'completed':
      return 'Completed';
    default:
      return status;
  }
}

export default async function TournamentEmbedPage({ params }: Props) {
  const { slug } = await params;
  const tournament = await getPublicTournamentBySlug(slug);
  if (!tournament) notFound();

  return (
    <main className="page-base min-h-screen bg-transparent p-3">
      <article className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--surface)] shadow-[var(--shadow-soft)]">
        <div className="relative h-36">
          <GameCover gameKey={tournament.game} className="h-full w-full" overlay priority />
          <div className="absolute left-3 top-3 rounded-[var(--radius-control)] border border-white/16 bg-black/45 px-2.5 py-1 text-xs font-black text-white">
            {statusLabel(tournament.status)}
          </div>
        </div>

        <div className="p-4">
          <p className="section-title">{tournament.game_label}</p>
          <h1 className="mt-2 text-xl font-black leading-tight text-[var(--text-primary)]">
            {tournament.title}
          </h1>
          <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">
            Hosted by {tournament.organizer?.username ?? 'PlayMechi'} in {tournament.region}.
          </p>

          <div className="mt-4 grid gap-2 text-sm">
            <InfoRow
              icon={<Users className="h-4 w-4" />}
              label="Players"
              value={`${tournament.player_count}/${tournament.size}`}
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
          </div>

          <Link
            href={tournament.links.public}
            target="_blank"
            rel="noreferrer"
            className="btn-primary mt-4 w-full justify-center"
          >
            View on PlayMechi
          </Link>
        </div>
      </article>
    </main>
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
