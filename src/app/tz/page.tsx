import type { Metadata } from 'next';
import { RegionalSettingsProvider } from '@/components/RegionalSettingsProvider';
import { V5LeanHomePage } from '@/components/v5/V5LeanPublic';
import { buildRegionalSettings } from '@/lib/regional-settings';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Tanzania | Mechi.club',
  description:
    'Find real gaming tournaments, enter securely, play verified matches, and build your competitive record in Tanzania.',
  alternates: {
    canonical: '/tz',
  },
};

const tanzaniaSettings = buildRegionalSettings('tanzania', 'manual');

export default function TanzaniaPage() {
  return (
    <RegionalSettingsProvider initialSettings={tanzaniaSettings}>
      <V5LeanHomePage country="tanzania" />
    </RegionalSettingsProvider>
  );
}
