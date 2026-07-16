import type { Metadata } from 'next';
import { PlayMechiHome } from '@/components/home/PlayMechiHome';
import { getHomepageTournaments } from '@/lib/homepage-tournaments';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'PlayMechi | Competitive Gaming for Africa',
  description:
    'Find approved tournaments, grow a trusted player record, and host competition across Africa.',
};

export default async function PlayMechiPage() {
  const tournaments = await getHomepageTournaments();
  return <PlayMechiHome publicTournaments={tournaments} />;
}
