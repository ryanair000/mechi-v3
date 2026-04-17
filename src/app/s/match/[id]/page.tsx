import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { BrandLogo } from '@/components/BrandLogo';
import { createServiceClient } from '@/lib/supabase';
import { getLevelFromXp, getRankDivision, withAlpha } from '@/lib/gamification';

const GAME_LABELS: Record<string, string> = {
  efootball: 'eFootball 2026',
  efootball_mobile: 'eFootball 2026 Mobile',
  fc26: 'EA FC 26',
  mk11: 'Mortal Kombat 11',
  nba2k26: 'NBA 2K26',
  tekken8: 'Tekken 8',
  sf6: 'Street Fighter 6',
  ludo: 'Ludo',
  cs2: 'CS2',
  valorant: 'Valorant',
  mariokart: 'Mario Kart 8',
  smashbros: 'Super Smash Bros',
  rocketleague: 'Rocket League',
};

interface Props {
  params: Promise<{ id: string }>;
}

async function getMatchData(id: string) {
  const supabase = createServiceClient();
  const { data: match } = await supabase
    .from('matches')
    .select('*')
    .eq('id', id)
    .eq('status', 'completed')
    .single();
  if (!match) return null;

  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .in('id', [match.player1_id, match.player2_id]);

  const player1 = profiles?.find((profile: { id: string }) => profile.id === match.player1_id);
  const player2 = profiles?.find((profile: { id: string }) => profile.id === match.player2_id);

  return { match, player1, player2 };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const data = await getMatchData(id);

  if (!data) {
    return { title: 'Match Not Found | Mechi' };
  }

  const { match, player1, player2 } = data;
  const scoreline =
    match.player1_score !== null &&
    match.player1_score !== undefined &&
    match.player2_score !== null &&
    match.player2_score !== undefined
      ? `${match.player1_score}-${match.player2_score}`
      : null;
  const isDraw =
    match.winner_id === null &&
    match.player1_score !== null &&
    match.player1_score !== undefined &&
    match.player2_score !== null &&
    match.player2_score !== undefined &&
    match.player1_score === match.player2_score;
  const winner = isDraw ? null : match.winner_id === match.player1_id ? player1 : player2;
  const loser = isDraw ? null : match.winner_id === match.player1_id ? player2 : player1;
  const game = GAME_LABELS[match.game] ?? match.game;

  const title = isDraw
    ? `${player1?.username ?? 'Player'} drew ${player2?.username ?? 'Player'} on ${game} | Mechi`
    : `${winner?.username ?? 'Player'} beat ${loser?.username ?? 'Player'} on ${game} | Mechi`;
  const description = isDraw
    ? `${player1?.username} and ${player2?.username} drew${scoreline ? ` ${scoreline}` : ''} in ${game} on Mechi. Result confirmed.`
    : `${winner?.username} beat ${loser?.username} in ${game} on Mechi. Result confirmed. Climb continues.`;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://mechi.club';

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      url: `${baseUrl}/s/match/${id}`,
      siteName: 'Mechi',
      images: [
        {
          url: `${baseUrl}/api/og/match?id=${id}`,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
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

  const { match, player1, player2 } = data;
  const scoreline =
    match.player1_score !== null &&
    match.player1_score !== undefined &&
    match.player2_score !== null &&
    match.player2_score !== undefined
      ? `${match.player1_score}-${match.player2_score}`
      : null;
  const isDraw =
    match.winner_id === null &&
    match.player1_score !== null &&
    match.player1_score !== undefined &&
    match.player2_score !== null &&
    match.player2_score !== undefined &&
    match.player1_score === match.player2_score;
  const winner = isDraw ? null : match.winner_id === match.player1_id ? player1 : player2;
  const loser = isDraw ? null : match.winner_id === match.player1_id ? player2 : player1;
  const winnerSummary =
    isDraw
      ? null
      : match.winner_id === match.player1_id
      ? match.gamification_summary_p1 ?? null
      : match.gamification_summary_p2 ?? null;
  const game = GAME_LABELS[match.game] ?? match.game;
  const winnerRating = ((winner as Record<string, unknown> | undefined)?.[`rating_${match.game}`] as number) ?? 1000;
  const winnerXp = (winner?.xp as number | null) ?? 0;
  const winnerLevel = winnerSummary?.newLevel ?? ((winner?.level as number | null) ?? getLevelFromXp(winnerXp));
  const division = getRankDivision(winnerRating);

  return (
    <div className="page-base flex flex-col">
      <nav className="landing-shell flex h-16 items-center border-b border-[var(--border-color)]">
        <Link href="/" className="flex items-center">
          <BrandLogo size="sm" />
        </Link>
      </nav>

      <div className="landing-shell flex flex-1 items-center justify-center py-16">
        <div className="card circuit-panel w-full max-w-lg p-8 text-center sm:p-10">
          <p className="brand-kicker justify-center">Match Result</p>
          <div className="mx-auto mb-4 mt-5 flex h-20 w-20 items-center justify-center rounded-full bg-[rgba(255,107,107,0.14)] text-3xl font-black text-[var(--brand-coral)]">
            {isDraw ? 'D' : 'W'}
          </div>
          <h1 className="mb-2 text-3xl font-black tracking-normal text-[var(--text-primary)]">
            {isDraw
              ? `${player1?.username ?? 'Player'} drew ${player2?.username ?? 'Player'}`
              : `${winner?.username ?? 'Player'} won!`}
          </h1>
          <p className="mb-3 text-sm text-[var(--text-secondary)]">
            {isDraw
              ? `${scoreline ? `${scoreline} draw` : 'Draw'} in ${game}`
              : `${winner?.username} beat ${loser?.username} in ${game}`}
          </p>
          {isDraw ? (
            <div className="mx-auto mb-8 inline-flex items-center gap-2 rounded-full border border-[var(--border-color)] bg-[var(--surface-elevated)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)]">
              Result confirmed
            </div>
          ) : (
            <div
              className="mx-auto mb-8 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold"
              style={{
                color: division.color,
                backgroundColor: withAlpha(division.color, '14'),
                borderColor: withAlpha(division.color, '30'),
              }}
            >
              <span>{division.label}</span>
              <span className="text-[var(--text-soft)]">/</span>
              <span>Lv. {winnerLevel}</span>
            </div>
          )}

          {winnerSummary && (
            <div className="mb-8 flex flex-wrap items-center justify-center gap-2">
              <span className="brand-chip px-2.5 py-1">+{winnerSummary.xpEarned} XP</span>
              <span className="brand-chip-coral px-2.5 py-1">+{winnerSummary.mpEarned} MP</span>
            </div>
          )}

          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/register" className="btn-primary">
              Join Mechi Free
            </Link>
            <Link href="/login" className="btn-ghost">
              Sign In
            </Link>
          </div>

          <p className="mt-8 text-xs text-[var(--text-soft)]">Compete. Connect. Rise.</p>
        </div>
      </div>
    </div>
  );
}
