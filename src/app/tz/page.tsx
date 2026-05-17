import type { Metadata } from 'next';
import { TanzaniaHomePage } from '@/app/tz/tanzania-home-page';
import { WEEKEND_CUP_TITLE } from '@/lib/weekend-cup';

export const metadata: Metadata = {
  title: 'Tanzania | Mechi.club',
  description: `Toleo la Tanzania la Mechi.club kwa ${WEEKEND_CUP_TITLE}, tournaments, lobbies, na community ya gamers wa Afrika Mashariki.`,
  alternates: {
    canonical: '/tz',
  },
};

export default function TanzaniaPage() {
  return <TanzaniaHomePage />;
}
