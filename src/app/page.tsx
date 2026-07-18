import type { Metadata } from 'next';
import { V5HomePage } from '@/components/v5/V5Public';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'PlayMechi | The Home of African Competition',
  description:
    'Find tournaments, host credible competition, build your rank, and grow gaming communities across Africa.',
};

export default function HomePage() {
  return <V5HomePage />;
}
