import type { Metadata } from 'next';
import { RegionalSettingsProvider } from '@/components/RegionalSettingsProvider';
import { V5LeanHomePage } from '@/components/v5/V5LeanPublic';
import { buildRegionalSettings } from '@/lib/regional-settings';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Kenya | Mechi.club',
  description:
    'Find real gaming tournaments, enter securely, play verified matches, and build your competitive record in Kenya.',
  alternates: {
    canonical: '/ke',
  },
};

const kenyaSettings = buildRegionalSettings('kenya', 'manual');

export default function KenyaPage() {
  return (
    <RegionalSettingsProvider initialSettings={kenyaSettings}>
      <V5LeanHomePage country="kenya" />
    </RegionalSettingsProvider>
  );
}
