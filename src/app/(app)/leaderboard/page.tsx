'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
  username: string | null;
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

const WEEKEND_CUP_EMPTY_MESSAGE =
  'Weekend Cup results appear here after check-in and admin verification. Registration is open now.';

const LAUNCH_WINNERS = [
  {
    game: 'PUBG Mobile',
    winner: 'HM TOP',
    result: '13 kills across 3 verified rooms',
    prize: 'KSh 1,500',
    image: '/images/playmechi/leaderboard/pubgm-winners.png',
  },
  {
    game: 'CODM',
    winner: 'WhyNot',
    result: '112 final points',
    prize: 'KSh 1,200',
    image: '/images/playmechi/leaderboard/codm-winners.png',
  },
  {
    game: 'eFootball',
    winner: 'Samuuo11',
    result: '8-2 final win',
    prize: 'KSh 1,000',
    image: '/images/playmechi/leaderboard/efootball-winners.png',
  },
];

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

function getLeaderboardProfileHref(entry: TournamentLeaderboardEntry, gameLabel: string) {
  if (entry.username) {
    return `/profile/${encodeURIComponent(entry.username)}`;
  }

  const params = new URLSearchParams({
    detail: entry.detailText,
    game: gameLabel,
    latest: entry.latestLabel ?? 'Verified tournament result',
    name: entry.name,
    score: entry.scoreText,
  });

  return `/profile/player?${params.toString()}`;
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
    <div className="rounded-[var(--radius-panel)] border border-[var(--border-color)] bg-[var(--surface)] px-4 py-4">
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
  const router = useRouter();
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
  const isWeekendCupWaitingForResults =
    !loading && totalCheckIns === 0 && totalVerifiedResults === 0;

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
            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-soft)]">
              Tap a player to open the profile card.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center sm:min-w-80">
            <div className="rounded-[var(--radius-panel)] border border-[var(--border-color)] bg-[var(--surface-elevated)] px-3 py-2">
              <p className="text-lg font-black text-[var(--text-primary)]">{totalCheckIns}</p>
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-soft)]">
                Verified Check-ins
              </p>
            </div>
            <div className="rounded-[var(--radius-panel)] border border-[var(--border-color)] bg-[var(--surface-elevated)] px-3 py-2">
              <p className="text-lg font-black text-[var(--text-primary)]">{totalGames}</p>
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-soft)]">
                Games
              </p>
            </div>
            <div className="rounded-[var(--radius-panel)] border border-[var(--border-color)] bg-[var(--surface-elevated)] px-3 py-2">
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
                className={`inline-flex min-h-9 items-center rounded-[var(--radius-control)] border px-3 text-xs font-bold ${
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

        {isWeekendCupWaitingForResults ? (
          <div className="mt-5 rounded-[var(--radius-panel)] border border-[rgba(50,224,196,0.22)] bg-[rgba(50,224,196,0.08)] px-4 py-3">
            <p className="text-sm font-semibold leading-6 text-[var(--text-primary)]">
              {WEEKEND_CUP_EMPTY_MESSAGE}
            </p>
            <Link
              href="/weekendcup/register"
              className="mt-2 inline-flex text-xs font-bold uppercase tracking-[0.12em] text-[var(--accent-secondary-text)]"
            >
              Register for Weekend Cup
            </Link>
          </div>
        ) : null}
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
            {WEEKEND_CUP_EMPTY_MESSAGE}
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
              <div className="rounded-[var(--radius-panel)] border border-[var(--border-color)] bg-[var(--surface-elevated)] px-4 py-3 text-right">
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
                  {activeBoard.leaderboard.map((entry) => {
                    const profileHref = getLeaderboardProfileHref(entry, activeBoard.label);

                    return (
                    <tr
                      key={entry.id}
                      className="cursor-pointer border-b border-[var(--border-color)] transition last:border-b-0 hover:bg-[rgba(255,255,255,0.02)]"
                      onClick={() => {
                        router.push(profileHref);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          router.push(profileHref);
                        }
                      }}
                      role="link"
                      tabIndex={0}
                    >
                      <td className="py-3 pr-3 text-sm font-black text-[var(--accent-secondary-text)]">
                        #{entry.rank}
                      </td>
                      <td className="px-3 py-3">
                        <Link
                          href={profileHref}
                          onClick={(event) => event.stopPropagation()}
                          className="group flex items-center gap-3 rounded-[var(--radius-card)] px-1 py-1 transition hover:bg-[rgba(255,255,255,0.03)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(50,224,196,0.35)]"
                        >
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[var(--border-color)] bg-[var(--surface-elevated)] text-xs font-black text-[var(--text-primary)]">
                            {entry.avatarUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={entry.avatarUrl} alt="" className="h-full w-full object-cover" />
                            ) : (
                              entry.name.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-black text-[var(--text-primary)] transition group-hover:text-[var(--accent-secondary-text)]">
                              {entry.name}
                            </p>
                            <p className="truncate text-xs text-[var(--text-secondary)]">
                              {entry.detailText} | Open profile
                            </p>
                          </div>
                        </Link>
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
                  )})}
                  {activeBoard.leaderboard.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-sm text-[var(--text-secondary)]">
                        {WEEKEND_CUP_EMPTY_MESSAGE}
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      <section className="card p-4 sm:p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="section-title">Previous winners</p>
            <h2 className="mt-2 text-xl font-black text-[var(--text-primary)]">
              PlayMechi Launch champions
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
              Weekend Cup boards fill after admin verification. Until then, here are verified
              winners from the PlayMechi Launch event.
            </p>
          </div>
          <Link
            href="/playmechi"
            className="brand-link inline-flex min-h-10 items-center text-sm font-semibold"
          >
            View launch event
          </Link>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {LAUNCH_WINNERS.map((winner) => (
            <article
              key={winner.game}
              className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--surface-elevated)]"
            >
              <div className="aspect-[16/9] overflow-hidden bg-[var(--surface)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={winner.image}
                  alt={`${winner.game} launch winners`}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </div>
              <div className="p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--text-soft)]">
                  {winner.game}
                </p>
                <h3 className="mt-1 text-lg font-black text-[var(--text-primary)]">
                  {winner.winner}
                </h3>
                <p className="mt-2 text-sm font-semibold text-[var(--text-secondary)]">
                  {winner.result}
                </p>
                <p className="mt-3 inline-flex rounded-full border border-[var(--border-color)] bg-[var(--surface)] px-3 py-1 text-xs font-bold text-[var(--accent-secondary-text)]">
                  1st prize: {winner.prize}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
