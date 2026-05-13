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
      subheading="Handle your assigned Weekend Cup game, confirm payment safely, and keep the confirmed roster clean before check-in opens."
    />
  );
}
