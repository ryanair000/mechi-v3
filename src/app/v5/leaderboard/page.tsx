import type { Metadata } from 'next';
import { V5LeaderboardPage } from '@/components/v5/V5Public';

export const metadata: Metadata = {
  title: 'Leaderboard | Mechi V5',
  description: 'See the PlayMechi V5 leaderboard UI for ranked players and streaks.',
};

export default function Page() {
  return <V5LeaderboardPage />;
}
