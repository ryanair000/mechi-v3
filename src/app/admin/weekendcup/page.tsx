import { WeekendCupOpsClient } from '@/app/weekendcup/ops/weekend-cup-ops-client';

export default function AdminWeekendCupPage() {
  return (
    <WeekendCupOpsClient
      apiPath="/api/admin/weekendcup-registrations"
      heading="Admin Weekend Cup desk"
      subheading="Confirm payments, set tiers, capture refs, and keep paid vs pending clean for Season 1 without touching the live PlayMechi Launch event."
    />
  );
}
