import { redirect } from 'next/navigation';
import { ONLINE_TOURNAMENT_ARENA_PATH } from '@/lib/online-tournament';

export default function OnlineGamingTournamentArenaRedirectPage() {
  redirect(ONLINE_TOURNAMENT_ARENA_PATH);
}
