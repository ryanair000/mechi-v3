import type { Metadata } from 'next';
import { Suspense } from 'react';
import { WeekendCupRegistrationClient } from './register/weekend-cup-registration-client';
import {
  WEEKEND_CUP_EVENT_DATES,
  WEEKEND_CUP_TITLE,
} from '@/lib/weekend-cup';

export const metadata: Metadata = {
  title: `Register | ${WEEKEND_CUP_TITLE}`,
  description:
    `${WEEKEND_CUP_TITLE} registration is open for ${WEEKEND_CUP_EVENT_DATES}. Pay with Paystack to confirm your Weekend Cup slot.`,
};

export default function WeekendCupPage() {
  return (
    <Suspense fallback={<div className="page-container py-8">Loading Weekend Cup registration...</div>}>
      <WeekendCupRegistrationClient />
    </Suspense>
  );
}
