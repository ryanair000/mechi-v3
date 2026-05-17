'use client';

import { MechiHomePageShell } from '@/app/home/mechi-home-page';
import { RegionalSettingsProvider } from '@/components/RegionalSettingsProvider';
import { buildRegionalSettings } from '@/lib/regional-settings';

const tanzaniaSettings = buildRegionalSettings('tanzania', 'manual');

export function TanzaniaHomePage() {
  return (
    <RegionalSettingsProvider initialSettings={tanzaniaSettings}>
      <MechiHomePageShell />
    </RegionalSettingsProvider>
  );
}
