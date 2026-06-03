import type { Metadata } from 'next';
import { MechiHomePageShell } from '@/app/home/mechi-home-page';
import { WEEKEND_CUP_TITLE } from '@/lib/weekend-cup';

export const metadata: Metadata = {
  title: 'Home | PlayMechi',
  description:
    `Register for ${WEEKEND_CUP_TITLE}, follow tournament updates, and get the PlayMechi Android app.`,
};

export default function HomePage() {
  return <MechiHomePageShell />;
}
