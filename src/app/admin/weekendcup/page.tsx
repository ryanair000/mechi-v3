import { WeekendCupOpsClient } from '@/app/weekendcup/ops/weekend-cup-ops-client';

export default function AdminWeekendCupPage() {
  return (
    <WeekendCupOpsClient
      apiPath="/api/admin/weekendcup-registrations"
      heading="Admin Weekend Cup desk"
      subheading="Track Paystack-confirmed payments, capacity, revenue, and check-in data for Weekend Cup without manual payment marking."
    />
  );
}
