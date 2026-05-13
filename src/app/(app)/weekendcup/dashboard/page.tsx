import type { Metadata } from 'next';
import { Suspense } from 'react';
import { WeekendCupDashboardClient } from '@/app/weekendcup/dashboard/weekend-cup-dashboard-client';
import { WEEKEND_CUP_TITLE } from '@/lib/weekend-cup';

export const metadata: Metadata = {
  title: `Dashboard | ${WEEKEND_CUP_TITLE}`,
  description:
    'Weekend Cup registration status, payment confirmation, and check-in.',
};

export default function WeekendCupDashboardPage() {
  return (
    <Suspense fallback={<div className="page-container py-8">Loading Weekend Cup dashboard...</div>}>
      <WeekendCupDashboardClient />
    </Suspense>
  );
}
