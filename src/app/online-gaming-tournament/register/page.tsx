import type { Metadata } from 'next';
import { Suspense } from 'react';
import { OnlineTournamentRegistrationClient } from './online-tournament-registration-client';
import { ONLINE_TOURNAMENT_TITLE } from '@/lib/online-tournament';

export const metadata: Metadata = {
  title: `Register | ${ONLINE_TOURNAMENT_TITLE}`,
  description:
    'Register for PUBG Mobile, Call of Duty Mobile, or eFootball in Playmechi Launch.',
};

export default function OnlineTournamentRegisterPage() {
  return (
    <Suspense fallback={<div className="page-container py-8">Loading registration...</div>}>
      <OnlineTournamentRegistrationClient />
    </Suspense>
  );
}
