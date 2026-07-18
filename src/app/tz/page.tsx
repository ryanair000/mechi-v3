import type { Metadata } from 'next';
import { RegionalSettingsProvider } from '@/components/RegionalSettingsProvider';
import { V5HomePage } from '@/components/v5/V5Public';
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

export default function TanzaniaPage() {
  return (
    <RegionalSettingsProvider initialSettings={tanzaniaSettings}>
      <V5HomePage country="tanzania" />
    </RegionalSettingsProvider>
  );
}
