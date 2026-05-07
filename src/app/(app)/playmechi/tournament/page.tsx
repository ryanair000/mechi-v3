import type { Metadata } from 'next';
import { Suspense } from 'react';
import { OnlineTournamentArenaClient } from '@/app/playmechi/tournament/online-tournament-arena-client';
import { ONLINE_TOURNAMENT_TITLE } from '@/lib/online-tournament';

export const metadata: Metadata = {
  title: `Tournament | ${ONLINE_TOURNAMENT_TITLE}`,
  description:
    'PlayMechi tournament arena for brackets, rooms, standings, screenshot uploads, and score updates.',
};

export default function PlayMechiTournamentPage() {
  return (
    <Suspense fallback={<div className="page-container py-8">Loading tournament...</div>}>
      <OnlineTournamentArenaClient />
    </Suspense>
  );
}
