import type { Metadata } from 'next';
import { Suspense } from 'react';
import { OnlineTournamentArenaClient } from '@/app/playmechi/tournament/online-tournament-arena-client';
import { ONLINE_TOURNAMENT_TITLE } from '@/lib/online-tournament';

export const metadata: Metadata = {
  title: `Tournament view | ${ONLINE_TOURNAMENT_TITLE}`,
  description:
    'Moderator view of the PlayMechi tournament desk while staying inside the moderator workspace.',
};

export default function ModeratorTournamentViewPage() {
  return (
    <Suspense fallback={<div className="page-container py-8">Loading tournament...</div>}>
      <OnlineTournamentArenaClient surface="moderator" view="tournament" />
    </Suspense>
  );
}
