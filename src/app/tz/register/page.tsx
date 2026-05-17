import type { Metadata } from 'next';
import { TanzaniaRegistrationClient } from '@/app/tz/register/tanzania-registration-client';
import { TZ_TOURNAMENT } from '@/lib/tanzania-tournament';

export const metadata: Metadata = {
  title: 'Jisajili Tanzania | Mechi.club',
  description: `Jisajili kwa ${TZ_TOURNAMENT.swahiliTitle} na upate maelekezo ya malipo ya Airtel Money.`,
  alternates: {
    canonical: '/tz/register',
  },
};

export default function TanzaniaRegisterPage() {
  return <TanzaniaRegistrationClient />;
}
