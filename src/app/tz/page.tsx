import type { Metadata } from 'next';
import { MechiHomePageShell } from '@/app/home/mechi-home-page';
import { RegionalSettingsProvider } from '@/components/RegionalSettingsProvider';
import { buildRegionalSettings } from '@/lib/regional-settings';

export const metadata: Metadata = {
  title: 'Mechi Tanzania | Mechi.club',
  description:
    'Mechi.club kwa Kiswahili: wasifu wa wachezaji, lobbies, mashindano, rewards, na njia safi ya kuingia kwenye PlayMechi Tanzania.',
  alternates: {
    canonical: '/tz',
  },
};

const tanzaniaSettings = buildRegionalSettings('tanzania', 'manual');

export default function TanzaniaPage() {
  return (
    <RegionalSettingsProvider initialSettings={tanzaniaSettings}>
      <MechiHomePageShell />
    </RegionalSettingsProvider>
  );
}
