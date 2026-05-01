import type { Metadata } from 'next';
import { OnlineTournamentRegistrationClient } from '@/app/online-gaming-tournament/register/online-tournament-registration-client';
import { ONLINE_TOURNAMENT_TITLE } from '@/lib/online-tournament';

export const metadata: Metadata = {
  title: `Register | ${ONLINE_TOURNAMENT_TITLE}`,
  description:
    'Register for PUBG Mobile, Call of Duty Mobile, or eFootball in the Mechi.club Online Gaming Tournament.',
};

export default function PlayMechiRegisterPage() {
  return <OnlineTournamentRegistrationClient />;
}
