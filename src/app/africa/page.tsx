import type { Metadata } from 'next';
import { V5LeanHomePage } from '@/components/v5/V5LeanPublic';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Africa Gaming Tournaments | Mechi',
  description:
    'Discover real gaming tournaments across Africa, enter securely, and build a verified competitive record on Mechi.',
  alternates: {
    canonical: '/africa',
  },
};

export default function AfricaPage() {
  return <V5LeanHomePage />;
}
