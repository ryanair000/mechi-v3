import type { Metadata } from 'next';
import { Suspense } from 'react';
import { CodmModeratorClient } from '@/app/playmechi/moderator/codm/codm-moderator-client';
import { ONLINE_TOURNAMENT_TITLE } from '@/lib/online-tournament';

export const metadata: Metadata = {
  title: `Moderators | ${ONLINE_TOURNAMENT_TITLE}`,
  description: 'Independent Mechi moderator workspace for tournament check-ins, lobbies, rooms, results, and standings.',
};

export default function ModeratorsPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-lg border border-[var(--border-color)] bg-[var(--surface-elevated)] px-4 py-8 text-sm text-[var(--text-secondary)]">
          Loading moderator desk...
        </div>
      }
    >
      <CodmModeratorClient />
    </Suspense>
  );
}
