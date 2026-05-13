import { redirect } from 'next/navigation';
import { WEEKEND_CUP_DASHBOARD_PATH } from '@/lib/weekend-cup';

export default function WeekendCupCheckInRedirectPage() {
  redirect(WEEKEND_CUP_DASHBOARD_PATH);
}
