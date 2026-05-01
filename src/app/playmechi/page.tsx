import type { Metadata } from 'next';
import { OnlineTournamentClient } from '@/app/online-gaming-tournament/online-tournament-client';
import { ONLINE_TOURNAMENT_TITLE } from '@/lib/online-tournament';

export const metadata: Metadata = {
  title: `${ONLINE_TOURNAMENT_TITLE} | Mechi.club`,
  description:
    'Register for the Mechi.club Online Gaming Tournament featuring PUBG Mobile, Call of Duty Mobile, and eFootball.',
};

export default function PlayMechiPage() {
  return <OnlineTournamentClient />;
}
