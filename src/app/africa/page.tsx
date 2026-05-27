import type { Metadata } from 'next';
import { MechiHomePageShell } from '@/app/home/mechi-home-page';
import { WEEKEND_CUP_TITLE } from '@/lib/weekend-cup';

export const metadata: Metadata = {
  title: 'Africa | Mechi.club',
  description: `Mechi.club Africa home for ${WEEKEND_CUP_TITLE}, open tournaments, country routing, and player communities across the continent.`,
  alternates: {
    canonical: '/africa',
  },
};

export default function AfricaPage() {
  return <MechiHomePageShell />;
}
