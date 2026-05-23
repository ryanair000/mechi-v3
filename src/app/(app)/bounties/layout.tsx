import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Bounties | Mechi.club',
  description:
    'See Mechi bounty challenges, cash rewards, and recent winners before jumping into the arena.',
  alternates: {
    canonical: '/bounties',
  },
};

export default function BountiesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
