import type { Metadata } from 'next';
import { Suspense } from 'react';
import { TanzaniaModeratorClient } from '@/app/moderators/tz/tanzania-moderator-client';
import { TZ_TOURNAMENT } from '@/lib/tanzania-tournament';

export const metadata: Metadata = {
  title: `TZ Payments | ${TZ_TOURNAMENT.title}`,
  description: 'Days Esports Tanzania moderator panel for registration and Airtel Money payment confirmation.',
};

export default function TanzaniaModeratorPage() {
  return (
    <Suspense fallback={<div className="page-container py-8">Loading Tanzania registrations...</div>}>
      <TanzaniaModeratorClient />
    </Suspense>
  );
}
