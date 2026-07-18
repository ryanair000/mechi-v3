import type { Metadata } from 'next';
import { V5TournamentsPage } from '@/components/v5/V5Public';

export const metadata: Metadata = {
  title: 'Tournaments | Mechi V5',
  description: 'Discover PlayMechi tournaments, prize events and competition schedules.',
};

export default function Page() {
  return <V5TournamentsPage />;
}
