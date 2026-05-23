import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pricing | Mechi.club',
  description:
    'Compare Mechi Free, Pro, and Elite plans for ranked matches, tournament joins, player profiles, hosting, rewards, and streaming access.',
  alternates: {
    canonical: '/pricing',
  },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
