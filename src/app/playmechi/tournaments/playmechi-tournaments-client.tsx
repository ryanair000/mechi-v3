'use client';

import { useEffect, useMemo, useState } from 'react';
import { PlayMechiWorkspace } from '@/components/playmechi/PlayMechiWorkspace';
import { PLAYMECHI_SCREEN_MAP, type WorkspaceScreenDefinition } from '@/components/playmechi/screen-definitions';

type PublicTournament = {
  slug: string;
  title: string;
  game_label?: string;
  game?: string;
  region: string;
  size: number;
  player_count?: number;
  entry_fee: number;
  prize_pool: number;
  status: string;
  organizer?: { username: string } | null;
  scheduled_for?: string | null;
};

type PublicTournamentResponse = {
  tournaments?: PublicTournament[];
};

function formatTournamentRow(tournament: PublicTournament): string[] {
  const fee = Number(tournament.entry_fee ?? 0);
  const prize = Number(tournament.prize_pool ?? 0);
  const protection = fee > 0 || prize > 0 ? ' · APPROVED' : '';
  const entry = fee > 0 ? `KES ${fee.toLocaleString('en-KE')} ENTRY` : 'FREE ENTRY';
  const reward = prize > 0 ? `KES ${prize.toLocaleString('en-KE')} PRIZE` : 'NO PRIZES';
  return [
    tournament.title,
    tournament.game_label ?? tournament.game ?? 'Tournament',
    `${entry} · ${reward}${protection}`,
    tournament.status === 'active' ? 'Live' : 'Open',
    `/s/t/${encodeURIComponent(tournament.slug)}`,
  ];
}

export function PlayMechiTournamentsClient() {
  const [tournaments, setTournaments] = useState<PublicTournament[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch('/api/public/tournaments?limit=50')
      .then(async (response) => response.ok ? response.json() as Promise<PublicTournamentResponse> : { tournaments: [] })
      .then((payload) => {
        if (active) setTournaments(payload.tournaments ?? []);
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const screen = useMemo(() => {
    const base = PLAYMECHI_SCREEN_MAP.get('tournament-directory');
    if (!base) throw new Error('Tournament directory screen is unavailable');
    if (!tournaments.length) return base;

    const rows = tournaments.map(formatTournamentRow);
    const open = tournaments.filter((tournament) => tournament.status === 'open').length;
    const live = tournaments.filter((tournament) => tournament.status === 'active').length;
    const updated: WorkspaceScreenDefinition = {
      ...base,
      metrics: [['Open', String(open)], ['Live', String(live)], ['Listed', String(tournaments.length)]],
      sections: [{
        ...base.sections[0],
        description: `${tournaments.length} tournaments · Live PlayMechi data`,
        rows,
      }],
    };
    return updated;
  }, [tournaments]);

  return (
    <div aria-busy={loading}>
      <PlayMechiWorkspace screen={screen} />
    </div>
  );
}
