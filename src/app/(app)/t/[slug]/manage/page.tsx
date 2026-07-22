import { TournamentControlClient } from './tournament-control-client';

export default async function TournamentManagePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <TournamentControlClient slug={slug} />;
}
