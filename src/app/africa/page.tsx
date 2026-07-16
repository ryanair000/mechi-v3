import type { Metadata } from 'next';
import { PlayMechiHome } from '@/components/home/PlayMechiHome';
import { getHomepageTournaments } from '@/lib/homepage-tournaments';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Africa | Mechi.club',
  description:
    'Find approved tournaments, organizers, rankings, and competitive gaming communities across Africa.',
  alternates: {
    canonical: '/africa',
  },
};

export default async function AfricaPage() {
  const tournaments = await getHomepageTournaments();
  return <PlayMechiHome publicTournaments={tournaments} />;
}
