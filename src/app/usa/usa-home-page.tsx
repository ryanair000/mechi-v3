'use client';

import { MechiHomePageShell } from '@/app/home/mechi-home-page';
import { RegionalSettingsProvider } from '@/components/RegionalSettingsProvider';
import { buildRegionalSettings } from '@/lib/regional-settings';

const usaSettings = buildRegionalSettings('united_states', 'manual');

export function UsaHomePage() {
  return (
    <RegionalSettingsProvider initialSettings={usaSettings}>
      <MechiHomePageShell />
    </RegionalSettingsProvider>
  );
}
