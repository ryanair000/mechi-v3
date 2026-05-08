'use client';

import { useEffect, useState } from 'react';
import { ShieldCheck, Swords, Trophy, type LucideIcon } from 'lucide-react';
import { useAuthFetch } from '@/components/AuthProvider';
import {
  ONLINE_TOURNAMENT_GAMES,
  type OnlineTournamentGameKey,
} from '@/lib/online-tournament';

type TournamentLeaderboardEntry = {
  avatarUrl: string | null;
  checkedInAt: string | null;
  detailText: string;
  id: string;
  latestLabel: string | null;
  name: string;
  rank: number;
  score: number;
  scoreText: string;
  verifiedCount: number;
  verifiedText: string;
};

type TournamentLeaderboardGame = {
  game: OnlineTournamentGameKey;
  label: string;
  leaderboard: TournamentLeaderboardEntry[];
  players: number;
  scoreLabel: string;
  shortLabel: string;
  verifiedLabel: string;
  verifiedResults: number;
};

type TournamentLeaderboardResponse = {
  leaderboards?: TournamentLeaderboardGame[];
  summary?: {
    games?: number;
    players?: number;
    verifiedResults?: number;
  };
};

function formatCheckInTime(value: string | null | undefined) {
  if (!value) return 'Verified';

  try {
    return new Intl.DateTimeFormat('en-KE', {
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      month: 'short',
    }).format(new Date(value));
  } catch {
    return 'Verified';
  }
}

function SummaryCard({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--surface)] px-4 py-4">
      <div className="flex items-center gap-2 text-[var(--text-soft)]">
        <Icon size={15} />
        <p className="text-xs font-bold uppercase tracking-[0.12em]">{label}</p>
      </div>
      <p className="mt-2 text-2xl font-black text-[var(--text-primary)]">
        {value.toLocaleString()}
      </p>
    </div>
  );
}

export default function LeaderboardPage() {
  const authFetch = useAuthFetch();
  const [payload, setPayload] = useState<TournamentLeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeGame, setActiveGame] = useState<OnlineTournamentGameKey>(
    ONLINE_TOURNAMENT_GAMES[0].game
  );

  useEffect(() => {
    let cancelled = false;

    async function fetchLeaderboard() {
      setLoading(true);

      try {
        const res = await authFetch('/api/users/leaderboard/tournaments');
        if (!res.ok) {
          if (!cancelled) {
            setPayload(null);
          }
          return;
        }

        const data = (await res.json()) as TournamentLeaderboardResponse;
        if (!cancelled) {
          setPayload(data);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void fetchLeaderboard();
    return () => {
      cancelled = true;
    };
  }, [authFetch]);

  const leaderboards = payload?.leaderboards ?? [];
  const selectedGame = leaderboards.some((leaderboard) => leaderboard.game === activeGame)
    ? activeGame
    : leaderboards[0]?.game ?? ONLINE_TOURNAMENT_GAMES[0].game;
  const activeBoard =
    leaderboards.find((leaderboard) => leaderboard.game === selectedGame) ?? null;
  const totalCheckIns = payload?.summary?.players ?? 0;
  const totalGames = payload?.summary?.games ?? ONLINE_TOURNAMENT_GAMES.length;
  const totalVerifiedResults = payload?.summary?.verifiedResults ?? 0;
  const topScore = activeBoard?.leaderboard[0]?.score ?? 0;

  return (
    <div className="page-container space-y-5">
      <section className="card circuit-panel p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="section-title">Leaderboard</p>
            <h1 className="mt-3 text-[1.55rem] font-black leading-[1.05] text-[var(--text-primary)] sm:text-[2rem]">
              Verified tournament check-ins
            </h1>
            <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
              Only players who checked in and were verified by the tournament desk appear here.
              Switch between PUBG Mobile, CODM, and eFootball for the three PlayMechi game boards.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center sm:min-w-80">
            <div className="rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--surface-elevated)] px-3 py-2">
              <p className="text-lg font-black text-[var(--text-primary)]">{totalCheckIns}</p>
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-soft)]">
                Verified Check-ins
              </p>
            </div>
            <div className="rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--surface-elevated)] px-3 py-2">
              <p className="text-lg font-black text-[var(--text-primary)]">{totalGames}</p>
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-soft)]">
                Games
              </p>
            </div>
            <div className="rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--surface-elevated)] px-3 py-2">
              <p className="text-lg font-black text-[var(--text-primary)]">{totalVerifiedResults}</p>
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-soft)]">
                Verified Results
              </p>
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {ONLINE_TOURNAMENT_GAMES.map((game) => {
            const leaderboard = leaderboards.find((item) => item.game === game.game);
            const isActive = game.game === selectedGame;

            return (
              <button
                key={game.game}
                type="button"
                onClick={() => setActiveGame(game.game)}
                className={`inline-flex min-h-9 items-center rounded-md border px-3 text-xs font-bold ${
                  isActive
                    ? 'border-[rgba(50,224,196,0.24)] bg-[rgba(50,224,196,0.12)] text-[var(--accent-secondary-text)]'
                    : 'border-[var(--border-color)] bg-[var(--surface-elevated)] text-[var(--text-secondary)]'
                }`}
              >
                {leaderboard?.shortLabel ?? game.shortLabel}
              </button>
            );
          })}
        </div>
      </section>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="h-24 shimmer rounded-[var(--radius-card)]" />
          ))}
        </div>
      ) : !activeBoard ? (
        <div className="card py-20 text-center text-[var(--text-soft)]">
          <Trophy size={36} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium text-[var(--text-primary)]">No verified tournament data yet</p>
          <p className="mt-1 text-xs">
            Players will appear here after check-in verification starts on the tournament desk.
          </p>
        </div>
      ) : (
        <>
          <section className="grid gap-3 md:grid-cols-3">
            <SummaryCard
              icon={ShieldCheck}
              label={`${activeBoard.shortLabel} Check-ins`}
              value={activeBoard.players}
            />
            <SummaryCard
              icon={Swords}
              label={`${activeBoard.shortLabel} ${activeBoard.verifiedLabel}`}
              value={activeBoard.verifiedResults}
            />
            <SummaryCard
              icon={Trophy}
              label={`Top ${activeBoard.scoreLabel}`}
              value={topScore}
            />
          </section>

          <section className="card p-4 sm:p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="section-title">{activeBoard.shortLabel} leaderboard</p>
                <h2 className="mt-2 text-xl font-black text-[var(--text-primary)]">
                  {activeBoard.label}
                </h2>
                <p className="mt-2 max-w-2xl text-sm text-[var(--text-secondary)]">
                  This board is filtered to verified check-ins only. Result columns fill in as
                  screenshots or bracket results are verified.
                </p>
              </div>
              <div className="rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--surface-elevated)] px-4 py-3 text-right">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-soft)]">
                  Live board
                </p>
                <p className="mt-1 text-sm font-black text-[var(--text-primary)]">
                  {activeBoard.players} verified check-ins
                </p>
              </div>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[680px] text-left">
                <thead>
                  <tr className="border-b border-[var(--border-color)] text-xs uppercase tracking-[0.12em] text-[var(--text-soft)]">
                    <th className="py-2 pr-3">Rank</th>
                    <th className="px-3 py-2">Player</th>
                    <th className="px-3 py-2">{activeBoard.scoreLabel}</th>
                    <th className="px-3 py-2">{activeBoard.verifiedLabel}</th>
                    <th className="px-3 py-2">Check-in</th>
                  </tr>
                </thead>
                <tbody>
                  {activeBoard.leaderboard.map((entry) => (
                    <tr key={entry.id} className="border-b border-[var(--border-color)] last:border-b-0">
                      <td className="py-3 pr-3 text-sm font-black text-[var(--accent-secondary-text)]">
                        #{entry.rank}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[var(--border-color)] bg-[var(--surface-elevated)] text-xs font-black text-[var(--text-primary)]">
                            {entry.avatarUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={entry.avatarUrl} alt="" className="h-full w-full object-cover" />
                            ) : (
                              entry.name.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-black text-[var(--text-primary)]">
                              {entry.name}
                            </p>
                            <p className="truncate text-xs text-[var(--text-secondary)]">
                              {entry.detailText}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-sm font-black text-[var(--text-primary)]">
                        {entry.scoreText}
                      </td>
                      <td className="px-3 py-3">
                        <p className="text-sm font-semibold text-[var(--text-primary)]">
                          {entry.verifiedText}
                        </p>
                        <p className="text-xs text-[var(--text-soft)]">
                          {entry.latestLabel ?? 'Verified check-in'}
                        </p>
                      </td>
                      <td className="px-3 py-3 text-xs text-[var(--text-secondary)]">
                        {formatCheckInTime(entry.checkedInAt)}
                      </td>
                    </tr>
                  ))}
                  {activeBoard.leaderboard.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-sm text-[var(--text-secondary)]">
                        No verified {activeBoard.label} check-ins yet.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
