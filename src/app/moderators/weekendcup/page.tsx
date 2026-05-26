import type { Metadata } from 'next';
import { WeekendCupOpsClient } from '@/app/weekendcup/ops/weekend-cup-ops-client';

export const metadata: Metadata = {
  title: 'Weekend Cup moderator desk',
  description:
    'Moderator view for Weekend Cup payment confirmation and player status tracking.',
};

export default function ModeratorWeekendCupPage() {
  return (
    <WeekendCupOpsClient
      apiPath="/api/moderators/weekendcup-registrations"
      heading="Moderator Weekend Cup desk"
      subheading="Handle your assigned Weekend Cup game with the latest payment, capacity, revenue, and check-in data. Confirm payment safely and keep the roster clean before match day."
    />
  );
}
