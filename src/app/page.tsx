import type { Metadata } from 'next';
import { V5LeanHomePage } from '@/components/v5/V5LeanPublic';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Mechi | Find Competition. Play. Build Your Record.',
  description:
    'Discover real gaming tournaments, enter securely, play verified matches, and build a competitive record on Mechi.',
};

export default function HomePage() {
  return <V5LeanHomePage />;
}
