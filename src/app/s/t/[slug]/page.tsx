import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { BrandLogo } from '@/components/BrandLogo';
import { GAMES, PLATFORMS } from '@/lib/config';
import { getLoginPath, getRegisterPath } from '@/lib/navigation';
import { createServiceClient } from '@/lib/supabase';
import { getTournamentPaymentMetrics, getTournamentPrizeSnapshot } from '@/lib/tournament-metrics';
import type { GameKey, PlatformKey } from '@/types';

type Props = {
  params: Promise<{ slug: string }>;
};

async function getTournament(slug: string) {
  const supabase = createServiceClient();
  const { data: tournament } = await supabase
    .from('tournaments')
    .select('*, organizer:organizer_id(id, username), winner:winner_id(id, username)')
    .eq('slug', slug)
    .single();

  if (!tournament) return null;

  const { data: players } = await supabase
    .from('tournament_players')
    .select('payment_status')
    .eq('tournament_id', tournament.id)
    .in('payment_status', ['paid', 'free']);

  const metrics = getTournamentPaymentMetrics(
    ((players ?? []) as Array<{ payment_status: string | null | undefined }>).map((player) => ({
      payment_status: player.payment_status,
    }))
  );
  const prize = getTournamentPrizeSnapshot({
    entryFee: Number(tournament.entry_fee ?? 0),
    paidPlayerCount: metrics.paidCount,
    feeRate: Number(tournament.platform_fee_rate ?? 5),
    storedPrizePool: Number(tournament.prize_pool ?? 0),
    storedPlatformFee: Number(tournament.platform_fee ?? 0),
  });

  return {
    ...tournament,
    player_count: metrics.confirmedCount,
    prize_pool: prize.prizePool,
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const tournament = await getTournament(slug);
  if (!tournament) return { title: 'Tournament Not Found | Mechi' };

  const game = GAMES[tournament.game as GameKey]?.label ?? tournament.game;
  const title = `${tournament.title} | Mechi Tournament`;
  const description = `${game} bracket on Mechi. ${tournament.size} players, ${tournament.status} status.`;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://mechi.club';

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      url: `${baseUrl}/s/t/${slug}`,
      siteName: 'Mechi',
      images: [{ url: `${baseUrl}/api/og/tournament?slug=${slug}`, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [`${baseUrl}/api/og/tournament?slug=${slug}`],
    },
  };
}

export default async function PublicTournamentPage({ params }: Props) {
  const { slug } = await params;
  const tournament = await getTournament(slug);
  if (!tournament) redirect('/');

  const game = GAMES[tournament.game as GameKey];
  const platform = tournament.platform as PlatformKey | null;
  const playerCount = typeof tournament.player_count === 'number' ? tournament.player_count : 0;
  const bracketPath = `/t/${tournament.slug}`;

  return (
    <div className="page-base flex min-h-screen flex-col">
      <nav className="landing-shell flex h-16 items-center justify-between border-b border-[var(--border-color)]">
        <Link href="/" className="flex items-center">
          <BrandLogo size="sm" />
        </Link>
        <Link href={getLoginPath(bracketPath)} className="brand-link text-sm font-black">
          Sign in
        </Link>
      </nav>

      <main className="landing-shell flex flex-1 items-center justify-center py-16">
        <div className="card circuit-panel w-full max-w-xl p-8 text-center sm:p-10">
          <p className="brand-kicker justify-center">Mechi Bracket</p>
          <div className="mx-auto my-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-[rgba(255,107,107,0.14)] text-3xl font-black text-[var(--brand-coral)]">
            T
          </div>
          <h1 className="text-4xl font-black tracking-normal text-[var(--text-primary)]">
            {tournament.title}
          </h1>
          <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-[var(--text-secondary)]">
            {game?.label ?? tournament.game} tournament. Join the bracket, play clean, and let the results move the winner forward.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-4">
            <Info label="Slots" value={`${playerCount}/${tournament.size}`} />
            <Info label="Entry" value={tournament.entry_fee > 0 ? `KES ${tournament.entry_fee}` : 'Free'} />
            <Info
              label="Prize pool"
              value={
                tournament.prize_pool > 0
                  ? `KES ${tournament.prize_pool.toLocaleString()}`
                  : tournament.entry_fee > 0
                    ? 'KES 0'
                    : 'No cash'
              }
            />
            <Info label="Platform" value={platform ? PLATFORMS[platform]?.label ?? platform : 'Any'} />
          </div>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href={bracketPath} className="btn-primary">
              Join Bracket
            </Link>
            <Link href={getRegisterPath({ next: bracketPath })} className="btn-ghost">
              Create Account
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[var(--surface-strong)] p-4">
      <p className="text-lg font-black text-[var(--text-primary)]">{value}</p>
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--text-soft)]">{label}</p>
    </div>
  );
}
