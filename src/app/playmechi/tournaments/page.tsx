import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PlayMechiTournamentsClient } from './playmechi-tournaments-client';

export const metadata: Metadata = {
  title: 'PlayMechi Tournaments | Discover Events',
  description:
    'Browse PlayMechi tournaments by game, status, entry fee, prize pool, and organizer.',
};

export default function PlayMechiTournamentsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f6f8fb] p-6 text-[#101828]">Loading tournaments...</div>}>
      <PlayMechiTournamentsClient />
    </Suspense>
  );
}
