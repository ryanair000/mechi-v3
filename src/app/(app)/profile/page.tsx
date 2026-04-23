'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight, MapPin, Settings, Swords, X } from 'lucide-react';
import { useAuth, useAuthFetch } from '@/components/AuthProvider';
import { GameCover } from '@/components/GameCover';
import { InviteMenu } from '@/components/InviteMenu';
import { PlanBadge } from '@/components/PlanBadge';
import { PlatformLogo } from '@/components/PlatformLogo';
import { ShareMenu } from '@/components/ShareMenu';
import { TierMedal } from '@/components/TierMedal';
import {
  GAMES,
  PLATFORMS,
  getGameLossesKey,
  getGameRatingKey,
  getGameWinsKey,
  normalizeSelectedGameKeys,
} from '@/lib/config';
import {
  ACHIEVEMENTS,
  getLevelFromXp,
  getRankDivision,
  getXpProgress,
  withAlpha,
} from '@/lib/gamification';
import { resolveProfileLocation } from '@/lib/location';
import { getPlan } from '@/lib/plans';
import {
  getSnapshotAccent,
  getSnapshotLabel,
  getSnapshotPreviewClassName,
  getSnapshotUrlKey,
} from '@/lib/profile-snapshots';
import {
  getProfileOgImageUrl,
  getProfileShareUrl,
  profileShareText,
} from '@/lib/share';
import type { CountryKey, GameKey, Plan, PlatformKey } from '@/types';

interface Profile {
  [key: string]: unknown;
  country?: CountryKey | null;
  region?: string;
  avatar_url?: string | null;
  cover_url?: string | null;
  snapshot_efootball_url?: string | null;
  snapshot_codm_url?: string | null;
  snapshot_pubgm_url?: string | null;
  invite_code?: string;
  platforms?: PlatformKey[];
  game_ids?: Record<string, string>;
  selected_games?: GameKey[];
  whatsapp_number?: string | null;
  whatsapp_notifications?: boolean;
  xp?: number;
  level?: number;
  mp?: number;
  win_streak?: number;
  max_win_streak?: number;
}

export default function ProfilePage() {
  const { user } = useAuth();
  const authFetch = useAuthFetch();
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [achievementKeys, setAchievementKeys] = useState<string[]>([]);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    try {
      const [profileRes, achievementsRes] = await Promise.all([
        authFetch('/api/users/profile'),
        authFetch('/api/users/achievements'),
      ]);

      if (profileRes.ok) {
        const data = await profileRes.json();
        const location = resolveProfileLocation(data.profile as Record<string, unknown>);
        setProfile({
          ...(data.profile as Profile),
          country: location.country,
          region: location.region,
        });
      }

      if (achievementsRes.ok) {
        const data = await achievementsRes.json();
        setAchievementKeys((data.achievements as string[]) ?? []);
      } else {
        setAchievementKeys([]);
      }
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash === '#settings') {
      router.replace('/profile/settings');
      return;
    }

    void fetchProfile();
  }, [fetchProfile, router]);

  useEffect(() => {
    if (!lightboxUrl) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setLightboxUrl(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [lightboxUrl]);

  if (loading) {
    return (
      <div className="page-container space-y-4">
        <div className="h-52 shimmer" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="h-28 shimmer" />
          ))}
        </div>
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.86fr)]">
          <div className="space-y-4">
            <div className="h-80 shimmer" />
            <div className="h-56 shimmer" />
          </div>
          <div className="space-y-4">
            <div className="h-72 shimmer" />
            <div className="h-44 shimmer" />
          </div>
        </div>
      </div>
    );
  }

  const userGames = normalizeSelectedGameKeys((profile?.selected_games as GameKey[]) ?? []);
  const connectedPlatforms = (profile?.platforms as PlatformKey[] | undefined) ?? [];
  const rankedUserGames = userGames.filter((game) => GAMES[game]?.mode === '1v1');
  const bestRating = rankedUserGames.length
    ? rankedUserGames.reduce((best, game) => {
        const rating = (profile?.[getGameRatingKey(game)] as number) ?? 1000;
        return rating > best ? rating : best;
      }, 1000)
    : 1000;
  const bestDivision = getRankDivision(bestRating);
  const totalWins = rankedUserGames.reduce(
    (sum, game) => sum + (((profile?.[getGameWinsKey(game)] as number) ?? 0)),
    0
  );
  const totalLosses = rankedUserGames.reduce(
    (sum, game) => sum + (((profile?.[getGameLossesKey(game)] as number) ?? 0)),
    0
  );
  const totalMatches = totalWins + totalLosses;
  const overallWinRate = totalMatches > 0 ? Math.round((totalWins / totalMatches) * 100) : 0;
  const xp = (profile?.xp as number) ?? 0;
  const level = (profile?.level as number) ?? getLevelFromXp(xp);
  const mp = (profile?.mp as number) ?? 0;
  const winStreak = (profile?.win_streak as number) ?? 0;
  const maxWinStreak = (profile?.max_win_streak as number) ?? 0;
  const xpProgress = getXpProgress(xp, level);
  const unlockedAchievements = achievementKeys
    .map((key) => ACHIEVEMENTS.find((achievement) => achievement.key === key))
    .filter((achievement): achievement is (typeof ACHIEVEMENTS)[number] => Boolean(achievement));
  const avatarUrl = (profile?.avatar_url as string | null | undefined) ?? user?.avatar_url ?? null;
  const coverUrl = (profile?.cover_url as string | null | undefined) ?? user?.cover_url ?? null;
  const inviteCode =
    (typeof profile?.invite_code === 'string' ? profile.invite_code : null) ?? user?.invite_code ?? null;
  const usernameInitial = user?.username?.[0]?.toUpperCase() ?? '?';
  const platformCount = connectedPlatforms.length;
  const currentPlan = getPlan(((profile?.plan as Plan | undefined) ?? user?.plan ?? 'free'));
  const gameCountLabel = userGames.length === 1 ? '1 game selected' : `${userGames.length} games selected`;
  const profileLocation = resolveProfileLocation(profile ?? {});
  const locationLabel = profileLocation.label;
  const setupChecklist = [
    { label: 'Display photo', complete: Boolean(avatarUrl) },
    { label: 'Cover image', complete: Boolean(coverUrl) },
    { label: 'Location chosen', complete: Boolean(locationLabel) },
    { label: 'Games selected', complete: userGames.length > 0 },
    { label: 'Platforms linked', complete: connectedPlatforms.length > 0 },
  ];
  const completedChecklistCount = setupChecklist.filter((item) => item.complete).length;
  const missingChecklistItems = setupChecklist.filter((item) => !item.complete);
  const overviewSummary = [
    {
      label: 'Strongest rank',
      value: rankedUserGames.length > 0 ? bestDivision.label : 'Add a ranked game',
      hint: rankedUserGames.length > 0 ? `${bestRating} best rating` : 'Lobby titles do not build a ladder tier',
      color: rankedUserGames.length > 0 ? bestDivision.color : 'var(--text-primary)',
    },
    {
      label: 'Location',
      value: locationLabel || 'Add location',
      hint: 'Used for local matchmaking and discovery',
      color: 'var(--text-primary)',
    },
    {
      label: 'Platforms',
      value: platformCount === 0 ? 'Add platform' : `${platformCount} connected`,
      hint: 'Shown to teammates and opponents',
      color: 'var(--text-primary)',
    },
    {
      label: 'Game focus',
      value: rankedUserGames.length > 0 ? `${rankedUserGames.length} ranked titles` : gameCountLabel,
      hint: `${currentPlan.name} plan`,
      color: 'var(--text-primary)',
    },
  ];
  const statItems = [
    { label: 'Wins', value: totalWins, hint: rankedUserGames.length > 0 ? 'Across ranked play' : 'No ranked matches yet' },
    { label: 'Win rate', value: totalMatches > 0 ? `${overallWinRate}%` : '--', hint: totalMatches > 0 ? `${totalMatches} ranked matches` : 'Queue to start tracking' },
    { label: 'Level', value: `Lv. ${level}`, hint: `${Math.max(0, xpProgress.nextLevelXp - xp)} XP to next level` },
    { label: 'Streak', value: winStreak, hint: `Best run ${maxWinStreak} / ${mp} MP earned` },
  ];
  const snapshotCards = userGames.reduce<
    Array<{
      accent: string;
      game: GameKey;
      label: string;
      previewClassName: 'aspect-video' | 'aspect-[4/3]';
      url: string;
    }>
  >((cards, game) => {
    const snapshotUrlKey = getSnapshotUrlKey(game);
    const snapshotUrl = snapshotUrlKey
      ? ((profile?.[snapshotUrlKey] as string | null | undefined) ?? null)
      : null;

    if (!snapshotUrl) {
      return cards;
    }

    cards.push({
      accent: getSnapshotAccent(game),
      game,
      label: getSnapshotLabel(game),
      previewClassName: getSnapshotPreviewClassName(game),
      url: snapshotUrl,
    });

    return cards;
  }, []);

  return (
    <div className="page-container space-y-5">
      {lightboxUrl ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Snapshot preview"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setLightboxUrl(null);
            }
          }}
        >
          <button
            type="button"
            onClick={() => setLightboxUrl(null)}
            className="absolute right-4 top-4 inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white transition-colors hover:bg-white/16"
            aria-label="Close snapshot preview"
          >
            <X size={18} />
          </button>
          <div className="w-full max-w-4xl" onClick={(event) => event.stopPropagation()}>
            <Image
              src={lightboxUrl}
              alt="Snapshot preview"
              width={1600}
              height={1200}
              sizes="100vw"
              className="h-auto max-h-[90vh] w-full rounded-[1.15rem] object-contain"
            />
          </div>
        </div>
      ) : null}

      <section className="card overflow-hidden">
        <div
          className="relative h-36 sm:h-44 xl:h-52"
          style={{
            background: `linear-gradient(135deg, ${withAlpha(bestDivision.color, '26')} 0%, ${withAlpha(bestDivision.color, '10')} 58%, transparent 100%)`,
          }}
        >
          {coverUrl ? (
            <Image
              src={coverUrl}
              alt={`${user?.username ?? 'Player'} cover image`}
              fill
              sizes="(min-width: 1280px) 1200px, 100vw"
              className="object-cover"
              preload
            />
          ) : null}
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(11,17,33,0.08),rgba(11,17,33,0.52))]" />
          <div
            className="absolute inset-0 opacity-[0.12]"
            style={{
              backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.7) 1px, transparent 1px)',
              backgroundSize: '28px 28px',
            }}
          />
        </div>

        <div className="px-4 pb-5 sm:px-6">
          <div className="-mt-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <div className="relative h-20 w-20 shrink-0 sm:h-24 sm:w-24">
                <div
                  className="absolute -inset-[5px] rounded-[2rem] opacity-55 blur-[10px]"
                  style={{ background: bestDivision.color }}
                />
                <div className="relative h-full w-full overflow-hidden rounded-[2rem] border-4 border-[var(--surface-strong)] bg-[var(--surface-elevated)] shadow-[var(--shadow-strong)]">
                  {avatarUrl ? (
                    <Image
                      src={avatarUrl}
                      alt={`${user?.username ?? 'Player'} display photo`}
                      fill
                      sizes="112px"
                      className="object-cover"
                    />
                  ) : (
                    <div
                      className="flex h-full w-full items-center justify-center text-3xl font-black"
                      style={{
                        background: withAlpha(bestDivision.color, '20'),
                        color: bestDivision.color,
                      }}
                    >
                      {usernameInitial}
                    </div>
                  )}
                </div>
              </div>

              <div className="pb-1">
                <h1 className="text-2xl font-black leading-tight text-[var(--text-primary)] sm:text-[2.2rem]">
                  {user?.username}
                </h1>
                <p className="mt-1.5 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
                  Keep your public profile clean, your progress easy to scan, and the editing work in a dedicated
                  settings space.
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span
                    className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold"
                    style={{
                      background: withAlpha(bestDivision.color, '18'),
                      color: bestDivision.color,
                    }}
                  >
                    <TierMedal rating={bestRating} size="sm" />
                    {rankedUserGames.length > 0 ? `${bestDivision.label} / Lv. ${level}` : `Lv. ${level}`}
                  </span>
                  <PlanBadge plan={currentPlan.id} size="md" />
                  {locationLabel ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-color)] bg-[var(--surface-elevated)] px-3 py-1 text-xs font-medium text-[var(--text-secondary)]">
                      <MapPin size={12} />
                      {locationLabel}
                    </span>
                  ) : null}
                  <span className="brand-chip px-3 py-1">{gameCountLabel}</span>
                  <span className="brand-chip-coral px-3 py-1">
                    {platformCount === 1 ? '1 platform connected' : `${platformCount} platforms connected`}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
              <Link href="/profile/settings" className="btn-ghost">
                <Settings size={14} />
                Open settings
              </Link>
              {inviteCode && user?.username ? <InviteMenu inviteCode={inviteCode} username={user.username} /> : null}
              {user?.username ? (
                <ShareMenu
                  text={profileShareText(user.username, rankedUserGames.length > 0 ? bestDivision.label : 'Player', level)}
                  url={getProfileShareUrl(user.username)}
                  title="My Mechi Profile"
                  imageUrl={getProfileOgImageUrl(user.username)}
                  imageFilename={`mechi-profile-${user.username}.png`}
                  variant="inline"
                />
              ) : null}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {connectedPlatforms.length > 0 ? (
              connectedPlatforms.map((platform) => (
                <div
                  key={platform}
                  className="flex items-center gap-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--surface-elevated)] px-2.5 py-1"
                >
                  <PlatformLogo platform={platform} size={14} />
                  <span className="text-[11px] font-medium text-[var(--text-secondary)]">
                    {PLATFORMS[platform]?.label}
                  </span>
                </div>
              ))
            ) : (
              <Link href="/profile/settings" className="brand-link text-xs font-semibold">
                Add platforms
              </Link>
            )}
          </div>
        </div>
      </section>

      <section className="subtle-stat-strip sm:grid-cols-2 xl:grid-cols-4">
        {statItems.map((item) => (
          <div key={item.label} className="subtle-stat-item">
            <p className="subtle-stat-value">{item.value}</p>
            <p className="subtle-stat-label">{item.label}</p>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">{item.hint}</p>
          </div>
        ))}
      </section>

      <section className="subtle-card p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="section-title">Growth</p>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              Keep friends lookup and rewards on their own dedicated pages so each flow stays easier to
              scan on mobile and desktop.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/share" className="btn-ghost">
              Open friends
            </Link>
            <Link href="/rewards" className="btn-primary">
              Open rewards
            </Link>
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.86fr)] xl:items-start">
        <div className="space-y-5">
          <div className="subtle-card p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="section-title">Ranked overview</p>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  Your read-first summary of current ladder titles and results.
                </p>
              </div>
              <Link href="/profile/settings" className="brand-link text-xs font-semibold">
                Edit setup
              </Link>
            </div>

            {userGames.length === 0 ? (
              <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-6 text-center">
                <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-3xl bg-[rgba(50,224,196,0.14)] text-[var(--accent-secondary-text)]">
                  <Swords size={24} />
                </div>
                <p className="font-semibold text-[var(--text-primary)]">No games set up yet</p>
                <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[var(--text-secondary)]">
                  Add your games, platform, and player IDs in settings so this overview can stay focused on real progress.
                </p>
                <Link href="/profile/settings" className="btn-primary mt-4 inline-flex">
                  <Settings size={14} />
                  Set up profile
                </Link>
              </div>
            ) : rankedUserGames.length === 0 ? (
              <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-6 text-center">
                <p className="font-semibold text-[var(--text-primary)]">No ranked games selected</p>
                <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[var(--text-secondary)]">
                  Your lobby titles are saved. Add a 1v1 game in settings when you want tracked rank movement here.
                </p>
                <Link href="/profile/settings" className="btn-outline mt-4 inline-flex">
                  <Settings size={14} />
                  Edit games
                </Link>
              </div>
            ) : (
              <div className="grid gap-3 lg:grid-cols-2">
                {rankedUserGames.map((game) => {
                  const rating = (profile?.[getGameRatingKey(game)] as number) ?? 1000;
                  const wins = (profile?.[getGameWinsKey(game)] as number) ?? 0;
                  const losses = (profile?.[getGameLossesKey(game)] as number) ?? 0;
                  const winRate = wins + losses > 0 ? Math.round((wins / (wins + losses)) * 100) : 0;
                  const division = getRankDivision(rating);

                  return (
                    <div key={game} className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <div className="h-10 w-10 overflow-hidden rounded-lg border border-[var(--border-color)] bg-[var(--surface)]">
                            <GameCover gameKey={game} variant="header" className="h-full w-full" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-[var(--text-primary)]">{GAMES[game].label}</p>
                            <p className="mt-0.5 text-[11px] text-[var(--text-soft)]">
                              {wins + losses > 0 ? `${wins + losses} matches played` : 'Ready for your first queue'}
                            </p>
                          </div>
                        </div>
                        <TierMedal rating={rating} size="sm" />
                      </div>

                      <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--surface)] px-2 py-3">
                          <p className="text-sm font-bold" style={{ color: division.color }}>
                            {division.label}
                          </p>
                          <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-[var(--text-soft)]">Rank</p>
                        </div>
                        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--surface)] px-2 py-3">
                          <p className="text-sm font-bold text-[var(--text-primary)]">{wins}W-{losses}L</p>
                          <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-[var(--text-soft)]">Record</p>
                        </div>
                        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--surface)] px-2 py-3">
                          <p className="text-sm font-bold text-[#60A5FA]">{wins + losses > 0 ? `${winRate}%` : '--'}</p>
                          <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-[var(--text-soft)]">Win rate</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {snapshotCards.length > 0 ? (
            <div className="subtle-card p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="section-title">Snapshots</p>
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">
                    View the in-game screens that back up your active titles.
                  </p>
                </div>
                <span className="brand-chip px-2 py-1">{snapshotCards.length} live</span>
              </div>

              <div className="grid gap-3 lg:grid-cols-2">
                {snapshotCards.map((snapshot) => (
                  <div
                    key={snapshot.game}
                    className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4"
                  >
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="h-10 w-10 overflow-hidden rounded-lg border border-[var(--border-color)] bg-[var(--surface)]">
                          <GameCover gameKey={snapshot.game} variant="header" className="h-full w-full" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold" style={{ color: snapshot.accent }}>
                            {GAMES[snapshot.game].label}
                          </p>
                          <p className="mt-0.5 text-[11px] text-[var(--text-soft)]">Tap to open the full screenshot</p>
                        </div>
                      </div>
                      <span
                        className="rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]"
                        style={{
                          borderColor: withAlpha(snapshot.accent, '36'),
                          background: withAlpha(snapshot.accent, '14'),
                          color: snapshot.accent,
                        }}
                      >
                        {snapshot.label}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setLightboxUrl(snapshot.url)}
                      className={`group relative block w-full cursor-pointer overflow-hidden rounded-[1.15rem] ${snapshot.previewClassName}`}
                      aria-label={`Open ${GAMES[snapshot.game].label} snapshot`}
                    >
                      <Image
                        src={snapshot.url}
                        alt={`${GAMES[snapshot.game].label} ${snapshot.label.toLowerCase()}`}
                        fill
                        sizes="(min-width: 1280px) 520px, (min-width: 768px) 50vw, 100vw"
                        className="w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                      />
                      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(11,17,33,0.02),rgba(11,17,33,0.28))]" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="subtle-card p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="section-title">Achievements</p>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  A smaller preview of the badges you have already unlocked.
                </p>
              </div>
              <span className="brand-chip-coral px-2 py-1">{unlockedAchievements.length} unlocked</span>
            </div>

            {unlockedAchievements.length === 0 ? (
              <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] px-4 py-6 text-center">
                <p className="font-semibold text-[var(--text-primary)]">Your first badge is waiting.</p>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  Queue up, win matches, and your unlocks will start stacking here.
                </p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {unlockedAchievements.slice(0, 4).map((achievement) => (
                  <div
                    key={achievement.key}
                    className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[rgba(50,224,196,0.14)] text-xl">
                        {achievement.emoji}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-[var(--text-primary)]">{achievement.title}</p>
                        <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
                          {achievement.description}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <span className="brand-chip px-2 py-0.5">+{achievement.xpReward} XP</span>
                          <span className="brand-chip-coral px-2 py-0.5">+{achievement.mpReward} MP</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-5 xl:sticky xl:top-4">
          <div className="subtle-card p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="section-title">Quick summary</p>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  Identity and progression stay here. Editing work lives on the settings route.
                </p>
              </div>
              <span className="brand-chip px-2 py-1">
                {completedChecklistCount}/{setupChecklist.length} ready
              </span>
            </div>

            <div className="mt-4 grid gap-3">
              {overviewSummary.map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">
                    {item.label}
                  </p>
                  <p className="mt-2 text-lg font-black" style={{ color: item.color }}>
                    {item.value}
                  </p>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">{item.hint}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="subtle-card p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">
              Next to clean up
            </p>
            <div className="mt-3 space-y-2">
              {missingChecklistItems.length > 0 ? (
                missingChecklistItems.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between rounded-xl border border-[var(--border-color)] bg-[var(--surface-elevated)] px-3 py-2.5"
                  >
                    <span className="text-sm font-medium text-[var(--text-primary)]">{item.label}</span>
                    <ChevronRight size={14} className="text-[var(--text-soft)]" />
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-[rgba(50,224,196,0.22)] bg-[rgba(50,224,196,0.08)] px-3 py-3 text-sm text-[var(--accent-secondary-text)]">
                  Profile looks solid. Use settings whenever you want to refresh visuals or swap games.
                </div>
              )}
            </div>

            <Link href="/profile/settings" className="btn-ghost mt-4 w-full">
              <Settings size={14} />
              Open settings
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
