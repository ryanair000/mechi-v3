import { redirect } from 'next/navigation';
import { ONLINE_TOURNAMENT_CODM_MODERATOR_PATH } from '@/lib/online-tournament';

export default function LegacyCodmModeratorPage() {
  redirect(ONLINE_TOURNAMENT_CODM_MODERATOR_PATH);
}
