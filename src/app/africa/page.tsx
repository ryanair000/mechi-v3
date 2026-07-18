import type { Metadata } from 'next';
import { V5HomePage } from '@/components/v5/V5Public';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Africa | Mechi.club',
  description:
    'Find approved tournaments, organizers, rankings, and competitive gaming communities across Africa.',
  alternates: {
    canonical: '/africa',
  },
};

export default function AfricaPage() {
  return <V5HomePage />;
}
