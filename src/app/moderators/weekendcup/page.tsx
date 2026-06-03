import type { Metadata } from 'next';
import { WeekendCupOpsClient } from '@/app/weekendcup/ops/weekend-cup-ops-client';

export const metadata: Metadata = {
  title: 'Weekend Cup moderator desk',
  description:
    'Moderator view for Weekend Cup payment status and player tracking.',
};

export default function ModeratorWeekendCupPage() {
  return (
    <WeekendCupOpsClient
      apiPath="/api/moderators/weekendcup-registrations"
      heading="Moderator Weekend Cup desk"
      subheading="Handle your assigned Weekend Cup game with the latest Paystack payment status, capacity, revenue, and check-in data."
    />
  );
}
