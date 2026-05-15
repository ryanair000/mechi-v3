import type { Metadata } from 'next';
import { Suspense } from 'react';
import { WeekendCupPaymentCompleteClient } from './payment-complete-client';
import { WEEKEND_CUP_TITLE } from '@/lib/weekend-cup';

export const metadata: Metadata = {
  title: `Payment Complete | ${WEEKEND_CUP_TITLE}`,
  description: 'Confirm your Weekend Cup payment and continue to your slot status.',
};

export default function WeekendCupPaymentCompletePage() {
  return (
    <Suspense fallback={<div className="page-container py-8">Confirming payment...</div>}>
      <WeekendCupPaymentCompleteClient />
    </Suspense>
  );
}
