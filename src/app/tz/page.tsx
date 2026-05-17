import type { Metadata } from 'next';
import { TanzaniaHomePage } from '@/app/tz/tanzania-home-page';
import { TZ_TOURNAMENT } from '@/lib/tanzania-tournament';

export const metadata: Metadata = {
  title: 'Usajili wa Tanzania eFootball | Mechi.club',
  description: `Usajili wa Tanzania kwa ${TZ_TOURNAMENT.swahiliTitle}, pamoja na maelekezo ya Airtel Money na msaada wa Days Esports.`,
  alternates: {
    canonical: '/tz',
  },
};

export default function TanzaniaPage() {
  return <TanzaniaHomePage />;
}
