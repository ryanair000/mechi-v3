import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { BrandLogo } from '@/components/BrandLogo';
import { GAMES, PLATFORMS } from '@/lib/config';
import { createServiceClient } from '@/lib/supabase';
import type { GameKey, PlatformKey } from '@/types';

type Props = {
  params: Promise<{ slug: string }>;
};

async function getTournament(slug: string) {
  const supabase = createServiceClient();
  const { data: tournament } = await supabase
    .from('tournaments')
    .select('*, organizer:organizer_id(id, username), winner:winner_id(id, username), player_count:tournament_players(count)')
    .eq('slug', slug)
    .single();

  return tournament;
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
  const playerCount = Array.isArray(tournament.player_count)
    ? tournament.player_count[0]?.count ?? 0
    : 0;

  return (
    <div className="page-base flex min-h-screen flex-col">
      <nav className="landing-shell flex h-16 items-center justify-between border-b border-[var(--border-color)]">
        <Link href="/" className="flex items-center">
          <BrandLogo size="sm" />
        </Link>
        <Link href="/login" className="brand-link text-sm font-black">
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

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <Info label="Slots" value={`${playerCount}/${tournament.size}`} />
            <Info label="Entry" value={tournament.entry_fee > 0 ? `KES ${tournament.entry_fee}` : 'Free'} />
            <Info label="Platform" value={platform ? PLATFORMS[platform]?.label ?? platform : 'Any'} />
          </div>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href={`/t/${tournament.slug}`} className="btn-primary">
              Join Bracket
            </Link>
            <Link href="/register" className="btn-ghost">
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
