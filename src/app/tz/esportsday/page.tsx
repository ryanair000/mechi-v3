import type { Metadata } from 'next';
import { TanzaniaHomePage } from '@/app/tz/tanzania-home-page';
import { TZ_TOURNAMENT } from '@/lib/tanzania-tournament';

export const metadata: Metadata = {
  title: 'Esports Day Tanzania | Mechi.club',
  description: `Tournament page for ${TZ_TOURNAMENT.swahiliTitle}: details, Airtel Money payment instructions, and registration link.`,
  alternates: {
    canonical: TZ_TOURNAMENT.eventPath,
  },
};

export default function TanzaniaEsportsDayPage() {
  return <TanzaniaHomePage />;
}
