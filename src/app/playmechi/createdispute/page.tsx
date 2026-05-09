import type { Metadata } from 'next';
import { OnlineTournamentDisputeClient } from '@/app/online-gaming-tournament/createdispute/online-tournament-dispute-client';
import { ONLINE_TOURNAMENT_TITLE } from '@/lib/online-tournament';

export const metadata: Metadata = {
  title: `Report an issue | ${ONLINE_TOURNAMENT_TITLE}`,
  description:
    'Report cheating, score problems, room issues, or other PlayMechi tournament disputes.',
};

export default function PlayMechiCreateDisputePage() {
  return <OnlineTournamentDisputeClient />;
}
