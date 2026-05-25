import type { Metadata } from 'next';
import { MechiHomePageShell } from '@/app/home/mechi-home-page';
import { WEEKEND_CUP_TITLE } from '@/lib/weekend-cup';

export const metadata: Metadata = {
  title: 'Home | PlayMechi',
  description:
    `PlayMechi home for ${WEEKEND_CUP_TITLE}, platform discovery, and community-driven competition.`,
};

export default function HomePage() {
  return <MechiHomePageShell />;
}
