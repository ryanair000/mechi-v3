import type { Metadata } from 'next';
import { TanzaniaRegistrationClient } from '@/app/tz/register/tanzania-registration-client';
import { TZ_TOURNAMENT } from '@/lib/tanzania-tournament';

export const metadata: Metadata = {
  title: 'Jisajili Days Esports Tanzania | Mechi.club',
  description: `Jisajili kwa ${TZ_TOURNAMENT.swahiliTitle} kupitia Mechi.club, kisha pata maelekezo ya Airtel Money na uthibitisho wa WhatsApp.`,
  alternates: {
    canonical: TZ_TOURNAMENT.registrationPath,
  },
};

export default function TanzaniaDaysEsportsRegisterPage() {
  return <TanzaniaRegistrationClient />;
}
