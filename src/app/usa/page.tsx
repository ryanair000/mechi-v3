import type { Metadata } from 'next';
import { UsaHomePage } from '@/app/usa/usa-home-page';
import { WEEKEND_CUP_TITLE } from '@/lib/weekend-cup';

export const metadata: Metadata = {
  title: 'USA | Mechi.club',
  description: `Mechi.club USA home for ${WEEKEND_CUP_TITLE}, skill ladders, community lobbies, and prize-backed gaming runs for American players.`,
  alternates: {
    canonical: '/usa',
  },
  openGraph: {
    title: 'Mechi USA | Compete. Connect. Rise.',
    description:
      'A United States landing lane for Mechi players: cleaner 1v1s, organized lobbies, skill ladders, community brackets, and PlayMechi tournament updates.',
    url: 'https://mechi.club/usa',
    siteName: 'Mechi',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Mechi USA | Compete. Connect. Rise.',
    description:
      'The USA lane for Mechi players who want cleaner 1v1s, organized lobbies, skill ladders, and PlayMechi community brackets.',
  },
};

export default function UsaPage() {
  return <UsaHomePage />;
}
