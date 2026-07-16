import type { Metadata } from 'next';
import { PlayMechiHome } from '@/components/home/PlayMechiHome';
import { RegionalSettingsProvider } from '@/components/RegionalSettingsProvider';
import { getHomepageTournaments } from '@/lib/homepage-tournaments';
import { buildRegionalSettings } from '@/lib/regional-settings';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Uganda | Mechi.club',
  description:
    'Find approved tournaments, organizers, rankings, and competitive gaming communities in Uganda.',
  alternates: {
    canonical: '/ug',
  },
};

const ugandaSettings = buildRegionalSettings('uganda', 'manual');

export default async function UgandaPage() {
  const tournaments = await getHomepageTournaments('uganda');

  return (
    <RegionalSettingsProvider initialSettings={ugandaSettings}>
      <PlayMechiHome publicTournaments={tournaments} />
    </RegionalSettingsProvider>
  );
}
