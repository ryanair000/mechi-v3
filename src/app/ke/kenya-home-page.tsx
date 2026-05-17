'use client';

import { MechiHomePageShell } from '@/app/home/mechi-home-page';
import { RegionalSettingsProvider } from '@/components/RegionalSettingsProvider';
import { buildRegionalSettings } from '@/lib/regional-settings';

const kenyaSettings = buildRegionalSettings('kenya', 'manual');

export function KenyaHomePage() {
  return (
    <RegionalSettingsProvider initialSettings={kenyaSettings}>
      <MechiHomePageShell />
    </RegionalSettingsProvider>
  );
}
