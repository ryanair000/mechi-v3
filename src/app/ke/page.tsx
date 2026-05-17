import type { Metadata } from 'next';
import { KenyaHomePage } from '@/app/ke/kenya-home-page';
import { WEEKEND_CUP_TITLE } from '@/lib/weekend-cup';

export const metadata: Metadata = {
  title: 'Kenya | Mechi.club',
  description: `Mechi.club Kenya home for ${WEEKEND_CUP_TITLE}, tournaments, lobbies, and East African gaming community runs.`,
  alternates: {
    canonical: '/ke',
  },
};

export default function KenyaPage() {
  return <KenyaHomePage />;
}
