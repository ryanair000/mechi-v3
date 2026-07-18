import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { V5TournamentDetail } from '@/components/v5/V5TournamentDetail';
import { getPublicTournamentBySlug } from '@/lib/public-tournament-data';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const tournament = await getPublicTournamentBySlug(slug);
  return tournament
    ? { title: `${tournament.title} | PlayMechi`, description: `${tournament.game_label} tournament in ${tournament.region}. View verified details and enter through PlayMechi.` }
    : { title: 'Tournament not found | PlayMechi' };
}

export default async function TournamentDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tournament = await getPublicTournamentBySlug(slug);
  if (!tournament) notFound();
  return <V5TournamentDetail tournament={tournament} />;
}
