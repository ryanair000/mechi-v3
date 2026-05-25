import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pricing | PlayMechi',
  description:
    'Compare PlayMechi Free, Pro, and Elite plans for ranked matches, tournament joins, player profiles, hosting, rewards, and streaming access.',
  alternates: {
    canonical: '/pricing',
  },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
