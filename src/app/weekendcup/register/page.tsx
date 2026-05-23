import type { Metadata } from 'next';
import { Suspense } from 'react';
import { WeekendCupRegistrationClient } from './weekend-cup-registration-client';
import {
  WEEKEND_CUP_EVENT_DATES,
  WEEKEND_CUP_TITLE,
} from '@/lib/weekend-cup';

export const metadata: Metadata = {
  title: `Register | ${WEEKEND_CUP_TITLE}`,
  description: `${WEEKEND_CUP_TITLE} registration is open for ${WEEKEND_CUP_EVENT_DATES}. Pay now to confirm your Weekend Cup slot.`,
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
