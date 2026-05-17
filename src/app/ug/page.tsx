import type { Metadata } from 'next';
import { UgandaHomePage } from '@/app/ug/uganda-home-page';
import { WEEKEND_CUP_TITLE } from '@/lib/weekend-cup';

export const metadata: Metadata = {
  title: 'Uganda | Mechi.club',
  description: `Mechi.club Uganda home for ${WEEKEND_CUP_TITLE}, tournaments, lobbies, and East African gaming community runs.`,
  alternates: {
    canonical: '/ug',
  },
};

export default function UgandaPage() {
  return <UgandaHomePage />;
}
