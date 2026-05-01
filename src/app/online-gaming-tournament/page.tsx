import type { Metadata } from 'next';
import { OnlineTournamentClient } from './online-tournament-client';
import { ONLINE_TOURNAMENT_TITLE } from '@/lib/online-tournament';

export const metadata: Metadata = {
  title: `${ONLINE_TOURNAMENT_TITLE} | Mechi.club`,
  description:
    'Register on mechi.club for the official Mechi.club Online Gaming Tournament featuring PUBG Mobile, CODM, and eFootball.',
};

export default function OnlineGamingTournamentPage() {
  return <OnlineTournamentClient />;
}
