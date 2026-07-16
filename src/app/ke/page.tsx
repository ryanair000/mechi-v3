import type { Metadata } from 'next';
import { PlayMechiHome } from '@/components/home/PlayMechiHome';
import { RegionalSettingsProvider } from '@/components/RegionalSettingsProvider';
import { getHomepageTournaments } from '@/lib/homepage-tournaments';
import { buildRegionalSettings } from '@/lib/regional-settings';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Kenya | Mechi.club',
  description:
    'Find approved tournaments, organizers, rankings, and competitive gaming communities in Kenya.',
  alternates: {
    canonical: '/ke',
  },
};

const kenyaSettings = buildRegionalSettings('kenya', 'manual');

export default async function KenyaPage() {
  const tournaments = await getHomepageTournaments('kenya');

  return (
    <RegionalSettingsProvider initialSettings={kenyaSettings}>
      <PlayMechiHome publicTournaments={tournaments} />
    </RegionalSettingsProvider>
  );
}
