import type { Metadata } from 'next';
import { PlayMechiHome } from '@/components/home/PlayMechiHome';
import { getHomepageTournaments } from '@/lib/homepage-tournaments';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'PlayMechi | The Home of African Competition',
  description:
    'Find tournaments, host credible competition, build your rank, and grow gaming communities across Africa.',
};

export default async function HomePage() {
  const tournaments = await getHomepageTournaments();
  return <PlayMechiHome publicTournaments={tournaments} />;
}
