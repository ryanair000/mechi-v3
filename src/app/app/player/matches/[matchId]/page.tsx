import { V5AppShell } from '@/components/v5/app/V5AppShell';
import { V5MatchRoom } from '@/components/v5/app/V5MatchRoom';

export default async function PlayerMatchRoomPage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const { matchId } = await params;
  return (
    <V5AppShell workspace="player" section="matches">
      <V5MatchRoom matchId={matchId} />
    </V5AppShell>
  );
}
