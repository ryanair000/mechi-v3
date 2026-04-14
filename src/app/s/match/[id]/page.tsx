import { Metadata } from 'next';
import { createServiceClient } from '@/lib/supabase';
import { redirect } from 'next/navigation';
import Link from 'next/link';

const GAME_LABELS: Record<string, string> = {
  efootball: 'eFootball 2025', fc26: 'EA FC 26', mk11: 'Mortal Kombat 11',
  nba2k26: 'NBA 2K26', tekken8: 'Tekken 8', sf6: 'Street Fighter 6',
  cs2: 'CS2', valorant: 'Valorant', mariokart: 'Mario Kart 8',
  smashbros: 'Super Smash Bros', rocketleague: 'Rocket League',
};

interface Props {
  params: Promise<{ id: string }>;
}

async function getMatchData(id: string) {
  const supabase = createServiceClient();
  const { data: match } = await supabase.from('matches').select('*').eq('id', id).single();
  if (!match) return null;

  const { data: profiles } = await supabase
    .from('profiles').select('id, username')
    .in('id', [match.player1_id, match.player2_id]);

  const p1 = profiles?.find((p: { id: string }) => p.id === match.player1_id);
  const p2 = profiles?.find((p: { id: string }) => p.id === match.player2_id);

  return { match, p1, p2 };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const data = await getMatchData(id);

  if (!data) {
    return { title: 'Match Not Found | Mechi' };
  }

  const { match, p1, p2 } = data;
  const winner = match.winner_id === match.player1_id ? p1 : p2;
  const loser = match.winner_id === match.player1_id ? p2 : p1;
  const game = GAME_LABELS[match.game] ?? match.game;
  const ratingChange = match.winner_id === match.player1_id ? match.rating_change_p1 : match.rating_change_p2;

  const title = `${winner?.username ?? 'Player'} beat ${loser?.username ?? 'Player'} on ${game} | Mechi`;
  const description = `${winner?.username} won against ${loser?.username} in ${game} (+${ratingChange ?? 0} ELO) on Mechi - Kenya's gaming matchmaking platform!`;

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://mechi-v3.vercel.app';

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      url: `${baseUrl}/s/match/${id}`,
      siteName: 'Mechi',
      images: [{
        url: `${baseUrl}/api/og/match?id=${id}`,
        width: 1200,
        height: 630,
        alt: title,
      }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [`${baseUrl}/api/og/match?id=${id}`],
    },
  };
}

export default async function ShareMatchPage({ params }: Props) {
  const { id } = await params;
  const data = await getMatchData(id);

  if (!data) {
    redirect('/');
  }

  const { match, p1, p2 } = data;
  const winner = match.winner_id === match.player1_id ? p1 : p2;
  const loser = match.winner_id === match.player1_id ? p2 : p1;
  const game = GAME_LABELS[match.game] ?? match.game;
  const ratingChange = match.winner_id === match.player1_id ? match.rating_change_p1 : match.rating_change_p2;

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <nav className="px-5 sm:px-8 h-16 flex items-center border-b border-white/[0.04]">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center font-bold text-white text-xs">M</div>
          <span className="font-bold text-sm">Mechi</span>
        </Link>
      </nav>

      <div className="flex-1 flex items-center justify-center px-5 py-16">
        <div className="text-center max-w-md">
          <div className="text-4xl mb-4">🏆</div>
          <h1 className="text-2xl font-bold mb-2">
            {winner?.username ?? 'Player'} won!
          </h1>
          <p className="text-white/40 text-sm mb-2">
            {winner?.username} beat {loser?.username} in {game}
          </p>
          <p className="text-emerald-400 font-bold text-lg mb-8">
            +{ratingChange ?? 0} ELO
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/register" className="btn-primary">
              Join Mechi Free
            </Link>
            <Link href="/login" className="btn-ghost">
              Sign In
            </Link>
          </div>

          <p className="text-white/15 text-xs mt-8">
            Kenya&apos;s gaming matchmaking platform — compete in 1v1 ranked matches
          </p>
        </div>
      </div>
    </div>
  );
}
