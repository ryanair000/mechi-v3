'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, ChevronRight, CirclePlay, ShieldCheck, Swords, Trophy, Users } from 'lucide-react';
import { openAppOnboarding } from '@/components/AppOnboarding';
import { useAuth, useAuthFetch } from '@/components/AuthProvider';
import { GameCard } from '@/components/GameCard';
import { DASHBOARD_FEATURE_ITEMS } from '@/lib/app-shell-nav';
import {
  GAMES,
  getGameRatingKey,
  normalizeSelectedGameKeys,
  supportsLobbyMode,
} from '@/lib/config';
import { getLevelFromXp, getRankDivision, getXpProgress } from '@/lib/gamification';
import { getPlan } from '@/lib/plans';
import type { GameKey, Match, PlatformKey } from '@/types';

interface UserProfile {
  id: string;
  username: string;
  whatsapp_number?: string | null;
  whatsapp_notifications?: boolean;
  platforms: PlatformKey[];
  game_ids?: Record<string, string>;
  selected_games: GameKey[];
  region: string;
  [key: string]: unknown;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const authFetch = useAuthFetch();
  const router = useRouter();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activeMatch, setActiveMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      try {
        const [profileRes, activeMatchRes] = await Promise.all([
          authFetch('/api/users/profile'),
          authFetch('/api/matches/current'),
        ]);

        if (cancelled) return;

        const [profileData, matchData] = await Promise.all([
          profileRes.ok ? profileRes.json() : Promise.resolve(null),
          activeMatchRes.ok ? activeMatchRes.json() : Promise.resolve(null),
        ]);

        if (cancelled) return;

        if (profileRes.ok) {
          setProfile(profileData.profile as UserProfile);
        }

        if (activeMatchRes.ok) {
          setActiveMatch((matchData.match as Match | null | undefined) ?? null);
        } else {
          setActiveMatch(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [authFetch]);

  const userGames = normalizeSelectedGameKeys(profile?.selected_games ?? []);
  const rankedGames = userGames.filter((game) => GAMES[game]?.mode === '1v1');
  const lobbyGames = userGames.filter((game) => supportsLobbyMode(game));

  const bestRating = rankedGames.reduce((best, game) => {
    const rating = (profile?.[getGameRatingKey(game)] as number) ?? 1000;
    return rating > best ? rating : best;
  }, 1000);
  const bestDivision = getRankDivision(bestRating);
  const xp = (profile?.xp as number) ?? 0;
  const level = (profile?.level as number) ?? getLevelFromXp(xp);
  const mp = (profile?.mp as number) ?? 0;
  const streak = (profile?.win_streak as number) ?? 0;
  const xpProgress = getXpProgress(xp, level);
  const currentPlan = getPlan((profile?.plan as string | undefined) ?? user?.plan ?? 'free');

  if (loading) {
    return (
      <div className="page-container space-y-4">
        <div className="h-28 shimmer rounded-xl" />
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="h-[5.5rem] shimmer rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="h-40 shimmer rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const panelBase =
    'rounded-xl border border-[var(--border-color)] bg-[var(--surface-strong)] shadow-[var(--shadow-soft)]';

  return (
    <div className="page-container space-y-4">
      <div className={`${panelBase} relative overflow-hidden`}>
        <div className="absolute bottom-0 left-0 top-0 w-[3px] bg-[var(--brand-teal)]" />
        <div className="flex flex-col gap-4 px-5 py-4 pl-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg border border-[rgba(50,224,196,0.24)] bg-[rgba(50,224,196,0.1)] text-lg font-black text-[var(--brand-teal)]">
              {user?.username?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="rounded border border-[rgba(50,224,196,0.22)] bg-[rgba(50,224,196,0.1)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--accent-secondary-text)]">
                  Lv {level}
                </span>
                {rankedGames.length > 0 ? (
                  <span className="rounded border border-[rgba(255,107,107,0.22)] bg-[rgba(255,107,107,0.1)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--brand-coral)]">
                    {bestDivision.label}
                  </span>
                ) : null}
                <span className="rounded border border-[var(--border-color)] bg-[var(--surface)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--text-soft)]">
                  {currentPlan.name}
                </span>
              </div>
              <h1 className="mt-1 text-xl font-black leading-tight text-[var(--text-primary)] sm:text-2xl">
                {user?.username ?? 'Player'}
              </h1>
            </div>
          </div>

          <div className="flex flex-col gap-2.5 sm:min-w-[17rem] sm:items-end">
            <div className="w-full sm:max-w-[17rem]">
              <div className="mb-1 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-[var(--text-soft)]">
                <span>XP - Lv {level}</span>
                <span>{xpProgress.nextLevelXp - xp} to next</span>
              </div>
              <div className="h-[5px] overflow-hidden rounded-sm bg-[var(--border-color)]">
                <div
                  className="h-full transition-all"
                  style={{
                    width: `${xpProgress.progressPercent}%`,
                    background: 'linear-gradient(90deg, var(--brand-teal), var(--brand-coral))',
                  }}
                />
              </div>
              <p className="mt-1 text-[11px] text-[var(--text-soft)]">
                {xp} XP - {mp} MP
              </p>
            </div>
            <div className="flex items-center gap-2">
              {userGames.length === 0 ? (
                <Link href="/games" className="btn-primary text-sm">
                  Set Up Games
                </Link>
              ) : null}
              <button type="button" onClick={openAppOnboarding} className="btn-outline text-sm">
                <CirclePlay size={13} />
                Intro
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className={`${panelBase} overflow-hidden`}>
          <div className="h-[3px] bg-[var(--brand-teal)]" />
          <div className="p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-soft)]">
              Best Rank
            </p>
            <p className="mt-1.5 text-xl font-black text-[var(--accent-secondary-text)] sm:text-2xl">
              {rankedGames.length > 0 ? bestDivision.label : 'Ready'}
            </p>
            <p className="mt-1 hidden text-xs leading-5 text-[var(--text-soft)] sm:block">
              {rankedGames.length > 0
                ? 'Your strongest saved competitive lane right now.'
                : 'Add games to start tracking competitive progress.'}
            </p>
          </div>
        </div>

        <div className={`${panelBase} overflow-hidden`}>
          <div className="h-[3px] bg-[var(--border-strong)]" />
          <div className="p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-soft)]">
              Ranked Titles
            </p>
            <p className="mt-1.5 text-xl font-black text-[var(--text-primary)] sm:text-2xl">
              {rankedGames.length}
            </p>
            <p className="mt-1 hidden text-xs leading-5 text-[var(--text-soft)] sm:block">
              Competitive games currently saved on your profile.
            </p>
          </div>
        </div>

        <div className={`${panelBase} overflow-hidden`}>
          <div className="h-[3px] bg-[var(--brand-coral)]" />
          <div className="p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-soft)]">
              Streak
            </p>
            {streak > 0 ? (
              <p className="mt-1.5 text-xl font-black text-[var(--brand-coral)] sm:text-2xl">
                {streak}
              </p>
            ) : (
              <p className="mt-1.5 text-xl font-black text-[var(--text-soft)] sm:text-2xl">-</p>
            )}
            <p className="mt-1 hidden text-xs leading-5 text-[var(--text-soft)] sm:block">
              Consecutive wins from your latest reported run.
            </p>
          </div>
        </div>
      </div>

      <section>
        <div className="mb-4 flex items-center gap-3">
          <div className="h-4 w-[3px] rounded-full bg-[var(--brand-teal)]" />
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-primary)]">
            Feature Hub
          </p>
          <div className="h-px flex-1 bg-[var(--border-color)]" />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {DASHBOARD_FEATURE_ITEMS.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${panelBase} group flex min-h-[10rem] flex-col justify-between overflow-hidden p-4 transition-all hover:border-[rgba(50,224,196,0.28)] hover:bg-[var(--surface-elevated)]`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[rgba(50,224,196,0.18)] bg-[rgba(50,224,196,0.08)] text-[var(--accent-secondary-text)]">
                    <Icon size={18} />
                  </div>
                  <ChevronRight
                    size={16}
                    className="text-[var(--text-soft)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--brand-teal)]"
                  />
                </div>

                <div className="mt-6">
                  <p className="text-base font-black text-[var(--text-primary)]">{item.label}</p>
                  {item.description ? (
                    <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                      {item.description}
                    </p>
                  ) : null}
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {activeMatch ? (
        <Link href={`/match/${activeMatch.id}`} className="block">
          <div className="flex items-center gap-4 rounded-xl border border-[rgba(50,224,196,0.28)] bg-[rgba(50,224,196,0.08)] p-4 transition-all hover:border-[rgba(50,224,196,0.44)] hover:bg-[rgba(50,224,196,0.12)]">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-[rgba(50,224,196,0.18)]">
              <Swords size={16} className="text-[var(--brand-teal)]" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-[var(--text-primary)]">Match in Progress</p>
              <p className="truncate text-xs text-[var(--text-secondary)]">
                {GAMES[activeMatch.game]?.label} - open the room to submit your result.
              </p>
            </div>
            <ChevronRight size={15} className="flex-shrink-0 text-[var(--brand-teal)]" />
          </div>
        </Link>
      ) : null}

      {userGames.length === 0 ? (
        <div className="flex items-start gap-3 rounded-xl border border-[rgba(255,107,107,0.2)] bg-[rgba(255,107,107,0.06)] p-4">
          <AlertCircle size={15} className="mt-0.5 flex-shrink-0 text-[var(--brand-coral)]" />
          <div>
            <p className="text-sm font-bold text-[var(--text-primary)]">No games selected yet</p>
            <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
              Pick your focus title{currentPlan.maxGames > 1 ? 's' : ''} and Mechi will build your
              ladder from there.
            </p>
            <Link href="/games" className="brand-link-coral mt-2 inline-block text-xs font-bold">
              Choose games
            </Link>
          </div>
        </div>
      ) : null}

      {rankedGames.length > 0 ? (
        <section>
          <div className="mb-4 flex items-center gap-3">
            <div className="h-4 w-[3px] rounded-full bg-[var(--brand-teal)]" />
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-primary)]">
              Ranked Overview
            </p>
            <div className="h-px flex-1 bg-[var(--border-color)]" />
            <Link href="/leaderboard" className="brand-link text-xs font-bold whitespace-nowrap">
              Leaderboard
            </Link>
          </div>

          <div className={`${panelBase} p-5`}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-2xl">
                <div className="flex items-center gap-2 text-[var(--accent-secondary-text)]">
                  <Trophy size={16} />
                  <p className="text-[10px] font-black uppercase tracking-[0.18em]">Competitive lane</p>
                </div>
                <h2 className="mt-3 text-xl font-black text-[var(--text-primary)]">
                  Keep ranked progress visible without reopening hidden queue screens.
                </h2>
                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                  Use leaderboard to check movement, use challenges when you want a direct match,
                  and keep your saved titles ready for the next update cycle.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[18rem]">
                <div className="rounded-[0.9rem] border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--text-soft)]">
                    Best placement
                  </p>
                  <p className="mt-2 text-lg font-black text-[var(--accent-secondary-text)]">
                    {bestDivision.label}
                  </p>
                </div>
                <div className="rounded-[0.9rem] border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--text-soft)]">
                    Tracked titles
                  </p>
                  <p className="mt-2 text-lg font-black text-[var(--text-primary)]">
                    {rankedGames.length}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {rankedGames.map((game) => (
                <span key={game} className="brand-chip">
                  {GAMES[game].label}
                </span>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <Link href="/leaderboard" className="btn-outline text-sm">
                <Trophy size={13} />
                Open leaderboard
              </Link>
              <Link href="/challenges" className="btn-outline text-sm">
                <ShieldCheck size={13} />
                Open challenges
              </Link>
            </div>
          </div>
        </section>
      ) : null}

      {lobbyGames.length > 0 ? (
        <section>
          <div className="mb-4 flex items-center gap-3">
            <div className="h-4 w-[3px] rounded-full bg-[var(--brand-teal)]" />
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-primary)]">
              Lobby Games
            </p>
            <div className="h-px flex-1 bg-[var(--border-color)]" />
            <span className="flex items-center gap-1 rounded border border-[var(--border-color)] bg-[var(--surface)] px-2 py-0.5 text-[10px] font-bold text-[var(--text-soft)]">
              <Users size={10} />
              {lobbyGames.length} title{lobbyGames.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {lobbyGames.map((game) => (
              <GameCard
                key={game}
                gameKey={game}
                onViewLobby={() => router.push(`/lobbies?game=${game}`)}
                displayMode="lobby"
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
