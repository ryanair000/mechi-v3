import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { CodmModeratorClient } from '@/app/playmechi/moderator/codm/codm-moderator-client';
import { verifyToken } from '@/lib/auth';
import { readModeratorTournamentKeyFromGameIds } from '@/lib/moderator-tournaments';
import { ONLINE_TOURNAMENT_TITLE } from '@/lib/online-tournament';
import { createServiceClient } from '@/lib/supabase';

export const metadata: Metadata = {
  title: `Moderators | ${ONLINE_TOURNAMENT_TITLE}`,
  description: 'Independent Mechi moderator workspace for tournament check-ins, lobbies, rooms, results, and standings.',
};

async function shouldUseTanzaniaDesk() {
  const token = (await cookies()).get('auth_token')?.value;
  const payload = token ? verifyToken(token) : null;
  if (!payload?.sub) return false;

  const supabase = createServiceClient();
  const { data } = await supabase
    .from('profiles')
    .select('game_ids')
    .eq('id', payload.sub)
    .maybeSingle();

  return (
    readModeratorTournamentKeyFromGameIds((data as { game_ids?: unknown } | null)?.game_ids) ===
    'days_esports_tz_efootball'
  );
}

export default async function ModeratorsPage() {
  if (await shouldUseTanzaniaDesk()) {
    redirect('/moderators/tz');
  }

  return (
    <Suspense
      fallback={
        <div className="rounded-lg border border-[var(--border-color)] bg-[var(--surface-elevated)] px-4 py-8 text-sm text-[var(--text-secondary)]">
          Loading moderator desk...
        </div>
      }
    >
      <CodmModeratorClient />
    </Suspense>
  );
}
