import type { Metadata } from 'next';
import { Suspense } from 'react';
import { OnlineTournamentArenaClient } from '@/app/playmechi/tournament/online-tournament-arena-client';
import { ONLINE_TOURNAMENT_TITLE } from '@/lib/online-tournament';

export const metadata: Metadata = {
  title: `Check in | ${ONLINE_TOURNAMENT_TITLE}`,
  description:
    'PlayMechi tournament check-in for registered players before match rooms, standings, and uploads unlock.',
};

export default function PlayMechiCheckInPage() {
  return (
    <Suspense fallback={<div className="page-container py-8">Loading check-in...</div>}>
      <OnlineTournamentArenaClient />
    </Suspense>
  );
}
