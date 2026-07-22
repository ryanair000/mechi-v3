import type { Metadata } from 'next';
import { PlayMechiHome } from '@/components/home/PlayMechiHome';

export const metadata: Metadata = {
  title: 'PlayMechi | The Home of African Competition',
  description:
    'Find tournaments, host credible competition, build your rank, and grow gaming communities across Africa.',
};

export default function HomePage() {
  return <PlayMechiHome />;
}
