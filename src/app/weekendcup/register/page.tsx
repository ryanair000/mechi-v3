import type { Metadata } from 'next';
import { Suspense } from 'react';
import { WeekendCupRegistrationClient } from './weekend-cup-registration-client';
import {
  WEEKEND_CUP_MATCH_SCHEDULE_SUMMARY,
  WEEKEND_CUP_TITLE,
} from '@/lib/weekend-cup';

export const metadata: Metadata = {
  title: `Register | ${WEEKEND_CUP_TITLE}`,
  description: `${WEEKEND_CUP_TITLE} registration is open. ${WEEKEND_CUP_MATCH_SCHEDULE_SUMMARY}`,
  alternates: {
    canonical: '/weekendcup/register',
  },
};

export default function WeekendCupRegisterPage() {
  return (
    <Suspense fallback={<div className="page-container py-8">Loading Weekend Cup registration...</div>}>
      <WeekendCupRegistrationClient />
    </Suspense>
  );
}
