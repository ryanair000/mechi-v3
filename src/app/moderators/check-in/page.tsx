import type { Metadata } from 'next';
import { Suspense } from 'react';
import { OnlineTournamentArenaClient } from '@/app/playmechi/tournament/online-tournament-arena-client';
import { ONLINE_TOURNAMENT_TITLE } from '@/lib/online-tournament';

export const metadata: Metadata = {
  title: `Player check-in | ${ONLINE_TOURNAMENT_TITLE}`,
  description:
    'Moderator view of the PlayMechi player check-in page while staying inside the moderator workspace.',
};

export default function ModeratorPlayerCheckInPage() {
  return (
    <Suspense fallback={<div className="page-container py-8">Loading check-in...</div>}>
      <OnlineTournamentArenaClient surface="moderator" view="check-in" />
    </Suspense>
  );
}
