import type { Metadata } from 'next';
import { V5GamesPage } from '@/components/v5/V5Public';

export const metadata: Metadata = {
  title: 'Games | Mechi V5',
  description: 'Explore supported PlayMechi games, platforms and competitive modes.',
};

export default function Page() {
  return <V5GamesPage />;
}
