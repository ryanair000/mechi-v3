import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Tournaments | Mechi.club',
  description:
    'Find current and previous PlayMechi tournaments, including Weekend Cup games, fees, dates, prizes, and registration links.',
  alternates: {
    canonical: '/tournaments',
  },
};

export default function TournamentsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
