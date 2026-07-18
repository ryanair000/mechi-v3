import type { Metadata } from 'next';
import { RegionalSettingsProvider } from '@/components/RegionalSettingsProvider';
import { V5HomePage } from '@/components/v5/V5Public';
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

export default function UgandaPage() {
  return (
    <RegionalSettingsProvider initialSettings={ugandaSettings}>
      <V5HomePage country="uganda" />
    </RegionalSettingsProvider>
  );
}
