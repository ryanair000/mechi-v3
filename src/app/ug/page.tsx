import type { Metadata } from 'next';
import { RegionalSettingsProvider } from '@/components/RegionalSettingsProvider';
import { V5LeanHomePage } from '@/components/v5/V5LeanPublic';
import { buildRegionalSettings } from '@/lib/regional-settings';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Uganda | Mechi.club',
  description:
    'Find real gaming tournaments, enter securely, play verified matches, and build your competitive record in Uganda.',
  alternates: {
    canonical: '/ug',
  },
};

const ugandaSettings = buildRegionalSettings('uganda', 'manual');

export default function UgandaPage() {
  return (
    <RegionalSettingsProvider initialSettings={ugandaSettings}>
      <V5LeanHomePage country="uganda" />
    </RegionalSettingsProvider>
  );
}
