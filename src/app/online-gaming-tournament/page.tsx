import type { Metadata } from 'next';
import { OnlineTournamentClient } from './online-tournament-client';
import { ONLINE_TOURNAMENT_TITLE } from '@/lib/online-tournament';

export const metadata: Metadata = {
  title: `${ONLINE_TOURNAMENT_TITLE} | Mechi.club`,
  description:
    'Register on mechi.club for Playmechi Launch featuring PUBG Mobile, CODM, and eFootball.',
};

export default function OnlineGamingTournamentPage() {
  return <OnlineTournamentClient />;
}
