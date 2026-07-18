import type { Metadata } from 'next';
import { RegionalSettingsProvider } from '@/components/RegionalSettingsProvider';
import { V5HomePage } from '@/components/v5/V5Public';
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

export default function KenyaPage() {
  return (
    <RegionalSettingsProvider initialSettings={kenyaSettings}>
      <V5HomePage country="kenya" />
    </RegionalSettingsProvider>
  );
}
