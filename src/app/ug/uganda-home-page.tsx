'use client';

import { MechiHomePageShell } from '@/app/home/mechi-home-page';
import { RegionalSettingsProvider } from '@/components/RegionalSettingsProvider';
import { buildRegionalSettings } from '@/lib/regional-settings';

const ugandaSettings = buildRegionalSettings('uganda', 'manual');

export function UgandaHomePage() {
  return (
    <RegionalSettingsProvider initialSettings={ugandaSettings}>
      <MechiHomePageShell />
    </RegionalSettingsProvider>
  );
}
