import type { Metadata } from 'next';
import { PlayMechiHome } from '@/components/home/PlayMechiHome';
import { RegionalSettingsProvider } from '@/components/RegionalSettingsProvider';
import { getHomepageTournaments } from '@/lib/homepage-tournaments';
import { buildRegionalSettings } from '@/lib/regional-settings';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Tanzania | Mechi.club',
  description:
    'Find approved tournaments, organizers, rankings, and competitive gaming communities in Tanzania.',
  alternates: {
    canonical: '/tz',
  },
};

const tanzaniaSettings = buildRegionalSettings('tanzania', 'manual');

export default async function TanzaniaPage() {
  const tournaments = await getHomepageTournaments('tanzania');

  return (
    <RegionalSettingsProvider initialSettings={tanzaniaSettings}>
      <PlayMechiHome publicTournaments={tournaments} />
    </RegionalSettingsProvider>
  );
}
