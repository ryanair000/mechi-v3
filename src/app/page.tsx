import type { Metadata } from 'next';
import { WeekendCupClient } from '@/app/weekendcup/weekend-cup-client';
import { WEEKEND_CUP_EVENT_DATES, WEEKEND_CUP_TITLE } from '@/lib/weekend-cup';

export const metadata: Metadata = {
  title: `${WEEKEND_CUP_TITLE} | Mechi.club`,
  description:
    `Vote for the mystery game and register for ${WEEKEND_CUP_TITLE}, running ${WEEKEND_CUP_EVENT_DATES}.`,
};

export default function HomePage() {
  return <WeekendCupClient />;
}
