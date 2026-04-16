'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  BarChart2,
  Camera,
  Check,
  ImagePlus,
  Loader2,
  LogOut,
  MapPin,
  Settings,
  Swords,
} from 'lucide-react';
import { useAuth, useAuthFetch } from '@/components/AuthProvider';
import { GameCover } from '@/components/GameCover';
import { InviteMenu } from '@/components/InviteMenu';
import { PaywallModal } from '@/components/PaywallModal';
import { PlanBadge } from '@/components/PlanBadge';
import { PlatformLogo } from '@/components/PlatformLogo';
import { ShareMenu } from '@/components/ShareMenu';
import { TierMedal } from '@/components/TierMedal';
import {
  GAMES,
  PLATFORMS,
  REGIONS,
  getConfiguredPlatformForGame,
  getGameIdKey,
  getGameIdLabel,
  getGameIdPlaceholder,
  getGameIdValue,
  getGamePlatformKey,
  getPlatformsForGameSetup,
} from '@/lib/config';
import {
  ACHIEVEMENTS,
  getLevelFromXp,
  getRankDivision,
  getXpProgress,
  withAlpha,
} from '@/lib/gamification';
import { canSelectGames, getPlan } from '@/lib/plans';
import {
  getProfileOgImageUrl,
  getProfileShareUrl,
  profileShareText,
} from '@/lib/share';
import type { GameKey, Plan, PlatformKey } from '@/types';

interface Profile {
  [key: string]: unknown;
  region?: string;
  avatar_url?: string | null;
  cover_url?: string | null;
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
  const { user, logout, refresh } = useAuth();
  const authFetch = useAuthFetch();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [achievementKeys, setAchievementKeys] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState<'avatar' | 'cover' | null>(null);
  const [tab, setTab] = useState<'stats' | 'settings'>('stats');
  const [showPaywall, setShowPaywall] = useState(false);

  const [region, setRegion] = useState('Nairobi');
  const [platforms, setPlatforms] = useState<PlatformKey[]>([]);
  const [gameIds, setGameIds] = useState<Record<string, string>>({});
  const [selectedGames, setSelectedGames] = useState<GameKey[]>([]);

  const fetchProfile = useCallback(async () => {
    try {
      const [profileRes, achievementsRes] = await Promise.all([
        authFetch('/api/users/profile'),
        authFetch('/api/users/achievements'),
      ]);

      if (profileRes.ok) {
        const data = await profileRes.json();
        setProfile(data.profile);
        setRegion((data.profile.region as string) ?? 'Nairobi');
        setPlatforms((data.profile.platforms as PlatformKey[]) ?? []);
        setGameIds((data.profile.game_ids as Record<string, string>) ?? {});
        setSelectedGames((data.profile.selected_games as GameKey[]) ?? []);
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
    void fetchProfile();
  }, [fetchProfile]);

  const toggleGame = (game: GameKey) => {
    setSelectedGames((prev) => {
      if (prev.includes(game)) {
        setGameIds((ids) => {
          const nextIds = { ...ids };
          delete nextIds[getGamePlatformKey(game)];
          for (const platform of GAMES[game]?.platforms ?? []) {
            if (platform === 'mobile') {
              delete nextIds[getGameIdKey(game, platform)];
            }
          }
          return nextIds;
        });
        return prev.filter((item) => item !== game);
      }
      if (!canSelectGames(currentPlan.id, prev.length + 1)) {
        toast.error(
          currentPlan.id === 'free'
            ? 'Free plan saves 1 game. Upgrade to unlock 3.'
            : `Max ${currentPlan.maxGames} games on this plan`
        );
        setShowPaywall(true);
        return prev;
      }
      const defaultPlatform = GAMES[game]?.platforms.length === 1 ? GAMES[game].platforms[0] : null;
      if (defaultPlatform) {
        setGameIds((ids) => ({
          ...ids,
          [getGamePlatformKey(game)]: ids[getGamePlatformKey(game)] ?? defaultPlatform,
        }));
      }
      return [...prev, game];
    });
  };

  const selectPlatformForGame = (game: GameKey, platform: PlatformKey) => {
    setGameIds((ids) => ({
      ...ids,
      [getGamePlatformKey(game)]: platform,
    }));
  };

  const handleMediaUpload = async (kind: 'avatar' | 'cover', file: File | null) => {
    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error('Pick an image file');
      return;
    }

    const formData = new FormData();
    formData.set('kind', kind);
    formData.set('file', file);

    setUploadingMedia(kind);
    try {
      const res = await fetch('/api/users/profile/media', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? 'Failed to upload image');
        return;
      }

      setProfile(data.profile);
      await refresh();
      toast.success(kind === 'avatar' ? 'Display photo updated' : 'Cover photo updated');
    } catch {
      toast.error('Network error');
    } finally {
      setUploadingMedia(null);
    }
  };

  const handleSave = async () => {
    const setupPlatforms = getPlatformsForGameSetup(selectedGames, gameIds, platforms);
    const hasMissingPlatform = selectedGames.some(
      (game) => !getConfiguredPlatformForGame(game, gameIds, setupPlatforms)
    );

    if (selectedGames.length === 0) {
      toast.error('Pick at least 1 game');
      return;
    }

    if (hasMissingPlatform) {
      toast.error('Choose a platform for each game');
      return;
    }

    setSaving(true);
    try {
      const res = await authFetch('/api/users/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          region,
          platforms: setupPlatforms,
          game_ids: gameIds,
          selected_games: selectedGames,
          whatsapp_notifications: profile?.whatsapp_notifications ?? false,
          whatsapp_number: profile?.whatsapp_number ?? null,
        }),
      });
      if (res.ok) {
        toast.success('Profile updated!');
        await Promise.all([fetchProfile(), refresh()]);
      } else {
        const data = await res.json();
        if (data.limit_reached) {
          setShowPaywall(true);
        }
        toast.error(data.error ?? 'Failed to save');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="px-4 pb-16 pt-4 sm:px-6 lg:px-8 lg:pb-6">
        <div className="mx-auto w-full max-w-[88rem] space-y-4">
          <div className="h-56 shimmer" />
          <div className="h-12 shimmer" />
          <div className="h-36 shimmer" />
          <div className="h-36 shimmer" />
        </div>
      </div>
    );
  }

  const selectableGames = Object.keys(GAMES) as GameKey[];
  const setupPlatforms = getPlatformsForGameSetup(selectedGames, gameIds, platforms);
  const requiredIdFields = selectedGames.reduce<
    Array<{ key: string; game: GameKey; platform: PlatformKey }>
  >((fields, game) => {
    const platform = getConfiguredPlatformForGame(game, gameIds, setupPlatforms);
    if (!platform) return fields;

    const key = getGameIdKey(game, platform);
    if (!fields.some((field) => field.key === key)) {
      fields.push({ key, game, platform });
    }

    return fields;
  }, []);
  const userGames = (profile?.selected_games as GameKey[]) ?? [];
  const connectedPlatforms = ((profile?.platforms ?? []) as PlatformKey[]);
  const rankedUserGames = userGames.filter((game) => GAMES[game]?.mode === '1v1');
  const bestRating = rankedUserGames.reduce((best, game) => {
    const rating = (profile?.[`rating_${game}`] as number) ?? 1000;
    return rating > best ? rating : best;
  }, 1000);
  const bestDivision = getRankDivision(bestRating);
  const totalWins = rankedUserGames.reduce((sum, game) => sum + (((profile?.[`wins_${game}`] as number) ?? 0)), 0);
  const totalLosses = rankedUserGames.reduce((sum, game) => sum + (((profile?.[`losses_${game}`] as number) ?? 0)), 0);
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
  const whatsappNotifications = Boolean(profile?.whatsapp_notifications);
  const whatsappNumber = typeof profile?.whatsapp_number === 'string' ? profile.whatsapp_number : '';
  const avatarUrl = (profile?.avatar_url as string | null | undefined) ?? user?.avatar_url ?? null;
  const coverUrl = (profile?.cover_url as string | null | undefined) ?? user?.cover_url ?? null;
  const inviteCode =
    (typeof profile?.invite_code === 'string' ? profile.invite_code : null) ?? user?.invite_code ?? null;
  const usernameInitial = user?.username?.[0]?.toUpperCase() ?? '?';
  const platformCount = connectedPlatforms.length;
  const currentPlan = getPlan(((profile?.plan as Plan | undefined) ?? user?.plan ?? 'free'));
  const gameCountLabel = userGames.length === 1 ? '1 game selected' : `${userGames.length} games selected`;
  const setupChecklist = [
    { label: 'Display photo', complete: Boolean(avatarUrl) },
    { label: 'Cover image', complete: Boolean(coverUrl) },
    { label: 'Region chosen', complete: Boolean(profile?.region) },
    { label: 'Games selected', complete: userGames.length > 0 },
    { label: 'Platforms linked', complete: connectedPlatforms.length > 0 },
  ];
  const completedChecklistCount = setupChecklist.filter((item) => item.complete).length;
  const missingChecklistItems = setupChecklist.filter((item) => !item.complete);
  const profileStats = [
    {
      label: 'Wins',
      value: totalWins,
      color: 'var(--brand-teal)',
      hint: rankedUserGames.length > 0 ? 'Across ranked play' : 'No ranked games yet',
    },
    {
      label: 'Losses',
      value: totalLosses,
      color: 'var(--brand-coral)',
      hint: totalMatches > 0 ? `${totalMatches} total matches` : 'Nothing recorded yet',
    },
    {
      label: 'Win rate',
      value: totalMatches > 0 ? `${overallWinRate}%` : '--',
      color: '#60A5FA',
      hint: totalMatches > 0 ? 'Current conversion' : 'Play to unlock',
    },
    {
      label: 'Level',
      value: `Lv. ${level}`,
      color: 'var(--text-primary)',
      hint: `${xp} total XP`,
    },
    {
      label: 'Mechi Points',
      value: mp,
      color: 'var(--brand-coral)',
      hint: 'From wins and unlocks',
    },
    {
      label: 'Streak',
      value: winStreak,
      color: 'var(--brand-teal)',
      hint: `Best run ${maxWinStreak}`,
    },
  ];
  const overviewSummary = [
    {
      label: 'Strongest rank',
      value: bestDivision.label,
      hint: `Lv. ${level} progression`,
      color: bestDivision.color,
    },
    {
      label: 'Region',
      value: profile?.region ? (profile.region as string) : 'Add region',
      hint: 'Used for local matchmaking',
      color: 'var(--text-primary)',
    },
    {
      label: 'Platforms',
      value: platformCount === 0 ? 'Add platform' : `${platformCount} connected`,
      hint: whatsappNotifications ? 'WhatsApp alerts on' : 'Alerts currently off',
      color: 'var(--text-primary)',
    },
    {
      label: 'Game focus',
      value: rankedUserGames.length > 0 ? `${rankedUserGames.length} ranked titles` : gameCountLabel,
      hint: `${currentPlan.name} plan`,
      color: 'var(--text-primary)',
    },
  ];

  return (
    <div className="px-4 pb-16 pt-4 sm:px-6 lg:px-8 lg:pb-6">
      {showPaywall ? (
        <PaywallModal reason="game_limit" onClose={() => setShowPaywall(false)} />
      ) : null}
      <div className="mx-auto w-full max-w-[88rem]">
        <div className="card mb-5 overflow-hidden">
          <div
            className="relative h-32 sm:h-40 xl:h-48"
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
                priority
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
            <div className="absolute right-4 top-4 z-10">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-white/12 bg-[rgba(11,17,33,0.45)] px-3 py-2 text-xs font-semibold text-white backdrop-blur-sm transition-colors hover:bg-[rgba(11,17,33,0.62)]">
                {uploadingMedia === 'cover' ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <ImagePlus size={14} />
                )}
                {uploadingMedia === 'cover' ? 'Uploading...' : 'Change cover'}
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    void handleMediaUpload('cover', file);
                    event.target.value = '';
                  }}
                  disabled={uploadingMedia !== null}
                />
              </label>
            </div>
          </div>

          <div className="px-4 pb-5 sm:px-6">
            <div className="-mt-10 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
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
                  <label className="icon-button absolute -bottom-1 -right-1 h-10 w-10 cursor-pointer rounded-full">
                    {uploadingMedia === 'avatar' ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Camera size={14} />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={(event) => {
                        const file = event.target.files?.[0] ?? null;
                        void handleMediaUpload('avatar', file);
                        event.target.value = '';
                      }}
                      disabled={uploadingMedia !== null}
                    />
                  </label>
                </div>

                <div className="pb-1">
                  <h1 className="text-2xl font-black leading-tight text-[var(--text-primary)] sm:text-[2.2rem]">
                    {user?.username}
                  </h1>
                  <p className="mt-1.5 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
                    Keep your setup clear, your games ready, and your progress easy to scan.
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
                      {bestDivision.label} / Lv. {level}
                    </span>
                    <PlanBadge plan={currentPlan.id} size="md" />
                    {profile?.region ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-color)] bg-[var(--surface-elevated)] px-3 py-1 text-xs font-medium text-[var(--text-secondary)]">
                        <MapPin size={12} />
                        {profile.region as string}
                      </span>
                    ) : null}
                    <span className="brand-chip px-3 py-1">{gameCountLabel}</span>
                    <span className="brand-chip-coral px-3 py-1">
                      {platformCount === 1 ? '1 platform connected' : `${platformCount} platforms connected`}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                <button type="button" onClick={() => setTab('settings')} className="btn-ghost">
                  <Settings size={14} />
                  Edit profile
                </button>
                {inviteCode && user?.username ? (
                  <InviteMenu inviteCode={inviteCode} username={user.username} />
                ) : null}
                {user?.username ? (
                  <ShareMenu
                    text={profileShareText(user.username, bestDivision.label, level)}
                    url={getProfileShareUrl(user.username)}
                    title="My Mechi Profile"
                    imageUrl={getProfileOgImageUrl(user.username)}
                    imageFilename={`mechi-profile-${user.username}.png`}
                    variant="inline"
                  />
                ) : null}
              </div>
            </div>

            <div className="mb-4 mt-4 flex flex-wrap items-center gap-2">
              {((profile?.platforms ?? []) as PlatformKey[]).length > 0 ? (
                ((profile?.platforms ?? []) as PlatformKey[]).map((platform) => (
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
                <button
                  onClick={() => setTab('settings')}
                  className="brand-link text-xs font-semibold"
                >
                  + Add platforms
                </button>
              )}
            </div>

            <div className="grid gap-3 border-t border-[var(--border-color)] pt-4 sm:grid-cols-2 xl:grid-cols-6">
              {profileStats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4"
                >
                  <p className="stat-label">{stat.label}</p>
                  <p className="mt-2 text-lg font-black" style={{ color: stat.color }}>
                    {stat.value}
                  </p>
                  <p className="mt-1 text-xs text-[var(--text-soft)]">{stat.hint}</p>
                </div>
              ))}
            </div>

            <div className="mt-3 rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4">
              <div className="flex items-center justify-between gap-3 text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--text-soft)]">
                <span>XP Progress</span>
                <span>{xpProgress.progressInLevel}/{xpProgress.progressNeeded}</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--surface-strong)]">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${xpProgress.progressPercent}%`,
                    background: 'linear-gradient(90deg, var(--brand-teal), var(--brand-coral))',
                  }}
                />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[var(--text-secondary)]">
                <span className="brand-chip px-2 py-0.5">{xpProgress.progressPercent}% to next level</span>
                <span className="brand-chip-coral px-2 py-0.5">
                  {Math.max(0, xpProgress.nextLevelXp - xp)} XP left
                </span>
                <span>{rankedUserGames.length} ranked titles tracked</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6 flex gap-1 rounded-2xl border border-[var(--border-color)] bg-[var(--surface-strong)] p-1.5">
          {(['stats', 'settings'] as const).map((currentTab) => (
            <button
              key={currentTab}
              onClick={() => setTab(currentTab)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium transition-all ${
                tab === currentTab
                  ? 'bg-[var(--surface-elevated)] text-[var(--text-primary)] shadow-[0_12px_30px_rgba(11,17,33,0.08)]'
                  : 'text-[var(--text-soft)] hover:text-[var(--text-primary)]'
              }`}
            >
              {currentTab === 'stats' ? <BarChart2 size={14} /> : <Settings size={14} />}
              {currentTab === 'stats' ? 'Overview' : 'Edit profile'}
            </button>
          ))}
        </div>

        {tab === 'stats' && (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(280px,0.85fr)] xl:items-start">
            <div className="space-y-4">
            {userGames.length === 0 ? (
              <div className="card p-10 text-center">
                <div className="mb-4 text-5xl">Ã°Å¸Å½Â®</div>
                <p className="mb-1 font-semibold text-[var(--text-primary)]">No games set up yet</p>
                <p className="mx-auto mb-5 max-w-xs text-sm text-[var(--text-soft)]">
                  Add your platforms and choose your focus games to start climbing the ranks.
                </p>
                <button onClick={() => setTab('settings')} className="btn-primary">
                  <Settings size={14} /> Set Up Profile
                </button>
              </div>
            ) : rankedUserGames.length === 0 ? (
              <div className="card p-10 text-center">
                <div className="mb-4 text-5xl">Ã°Å¸Å½Â®</div>
                <p className="mb-1 font-semibold text-[var(--text-primary)]">No ranked games selected</p>
                <p className="mx-auto mb-5 max-w-xs text-sm text-[var(--text-soft)]">
                  Your mobile lobby games are saved. Add a 1v1 title when you want a tracked ladder.
                </p>
                <button onClick={() => setTab('settings')} className="btn-primary">
                  <Settings size={14} /> Edit Games
                </button>
              </div>
            ) : (
              <div className="grid gap-3 lg:grid-cols-2">
                {rankedUserGames.map((game) => {
                  const rating = (profile?.[`rating_${game}`] as number) ?? 1000;
                  const wins = (profile?.[`wins_${game}`] as number) ?? 0;
                  const losses = (profile?.[`losses_${game}`] as number) ?? 0;
                  const winRate = wins + losses > 0 ? Math.round((wins / (wins + losses)) * 100) : 0;
                  const division = getRankDivision(rating);

                  return (
                    <div key={game} className="card relative overflow-hidden p-4">
                      

                      <div className="relative mb-3 flex items-center justify-between gap-3">
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
                        <div className="flex items-center gap-2">
                          <TierMedal rating={rating} size="sm" />
                          <div
                            className="rounded-lg px-2.5 py-1 text-xs font-semibold"
                            style={{
                              background: withAlpha(division.color, '15'),
                              color: division.color,
                            }}
                          >
                            {division.label}
                          </div>
                        </div>
                      </div>

                      <div className="relative grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
                        <div>
                          <div className="text-sm font-black" style={{ color: division.color }}>
                            {division.label}
                          </div>
                          <div className="text-[10px] uppercase tracking-wide text-[var(--text-soft)]">Rank</div>
                        </div>
                        <div>
                          <div className="text-lg font-black text-[var(--brand-teal)]">{wins}</div>
                          <div className="text-[10px] uppercase tracking-wide text-[var(--text-soft)]">Wins</div>
                        </div>
                        <div>
                          <div className="text-lg font-black text-[var(--brand-coral)]">{losses}</div>
                          <div className="text-[10px] uppercase tracking-wide text-[var(--text-soft)]">Losses</div>
                        </div>
                        <div>
                          <div className="text-lg font-black text-[#60A5FA]">{winRate}%</div>
                          <div className="text-[10px] uppercase tracking-wide text-[var(--text-soft)]">W/R</div>
                        </div>
                      </div>

                      {wins + losses > 0 ? (
                        <div className="relative mt-4">
                          <div className="mb-1.5 flex justify-between text-[10px] text-[var(--text-soft)]">
                            <span>{wins} wins</span>
                            <span>{losses} losses</span>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-[var(--surface-strong)]">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${winRate}%`, background: division.color }}
                            />
                          </div>
                        </div>
                      ) : (
                        <p className="mt-3 flex items-center gap-1.5 text-[11px] text-[var(--text-soft)]">
                          <Swords size={12} />
                          No matches yet. Join queue to start your climb.
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="card p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="section-title">Achievements</p>
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">
                    Badges you&apos;ve already locked in on your climb.
                  </p>
                </div>
                <div className="brand-chip-coral px-2 py-1">
                  <span>{unlockedAchievements.length} unlocked</span>
                </div>
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
                  {unlockedAchievements.map((achievement) => (
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

            <div className="space-y-4 xl:sticky xl:top-4">
              <div className="card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="section-title">Quick summary</p>
                    <p className="mt-2 text-sm text-[var(--text-secondary)]">
                      Keep the essentials close and leave the editing work for the next tab.
                    </p>
                  </div>
                  <span className="brand-chip px-2 py-1">
                    {completedChecklistCount}/{setupChecklist.length} ready
                  </span>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
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

                <div className="mt-5 border-t border-[var(--border-color)] pt-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">
                    Next to clean up
                  </p>
                  <div className="mt-3 space-y-2">
                    {missingChecklistItems.length > 0 ? (
                      missingChecklistItems.slice(0, 3).map((item) => (
                        <div
                          key={item.label}
                          className="flex items-center justify-between rounded-xl border border-[var(--border-color)] bg-[var(--surface-elevated)] px-3 py-2.5"
                        >
                          <span className="text-sm font-medium text-[var(--text-primary)]">{item.label}</span>
                          <span className="rounded-full bg-[rgba(255,107,107,0.14)] px-2.5 py-1 text-[11px] font-semibold text-[var(--brand-coral)]">
                            Add now
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-xl border border-[rgba(50,224,196,0.22)] bg-[rgba(50,224,196,0.08)] px-3 py-3 text-sm text-[var(--accent-secondary-text)]">
                        Profile looks solid. Use edit mode when you want to refresh the visuals or change your games.
                      </div>
                    )}
                  </div>

                  <button type="button" onClick={() => setTab('settings')} className="btn-ghost mt-4 w-full">
                    <Settings size={14} />
                    Edit profile
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === 'settings' && (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] xl:items-start">
            <div className="space-y-4">
              <div className="card p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="section-title">Subscription</p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-sm font-semibold text-[var(--text-primary)]">{currentPlan.name}</span>
                      <PlanBadge plan={currentPlan.id} size="md" />
                    </div>
                    <p className="mt-2 text-sm text-[var(--text-secondary)]">
                      {currentPlan.id === 'free'
                        ? 'Free plan gives you 5 ranked matches/day and 1 selected game.'
                        : currentPlan.id === 'pro'
                          ? 'Pro unlocks unlimited ranked matches and up to 3 selected games.'
                          : 'Your premium access is active. New upgrades are Pro-only for now.'}
                    </p>
                    {typeof profile?.plan_expires_at === 'string' && currentPlan.id !== 'free' ? (
                      <p className="mt-2 text-xs text-[var(--text-soft)]">
                        Active until{' '}
                        {new Date(profile.plan_expires_at).toLocaleDateString('en-KE', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                    ) : null}
                  </div>

                  {currentPlan.id === 'free' ? (
                    <Link href="/pricing" className="btn-primary">
                      Upgrade
                    </Link>
                  ) : (
                    <button
                      type="button"
                      disabled={subscriptionLoading}
                      className="btn-outline"
                      onClick={async () => {
                        setSubscriptionLoading(true);
                        try {
                          const res = await authFetch('/api/subscriptions/cancel', { method: 'POST' });
                          const data = await res.json();
                          if (!res.ok) {
                            toast.error(data.error ?? 'Could not cancel subscription');
                            return;
                          }
                          toast.success('Subscription cancelled. Access stays active until expiry.');
                          await Promise.all([fetchProfile(), refresh()]);
                        } catch {
                          toast.error('Network error');
                        } finally {
                          setSubscriptionLoading(false);
                        }
                      }}
                    >
                      {subscriptionLoading ? 'Cancelling...' : 'Cancel renewal'}
                    </button>
                  )}
                </div>
              </div>

              <div className="card p-5">
                <div className="mb-4">
                  <p className="section-title">Profile look</p>
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">
                    Swap your display photo and cover any time to make the page feel more like yours.
                  </p>
                </div>

                <div className="grid gap-4 lg:grid-cols-[minmax(220px,0.7fr)_minmax(0,1.3fr)]">
                <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4">
                  <p className="label mb-3">Display photo</p>
                  <div className="flex items-center gap-4">
                    <div className="relative h-20 w-20 overflow-hidden rounded-[1.35rem] border border-[var(--border-color)] bg-[var(--surface)]">
                      {avatarUrl ? (
                        <Image
                          src={avatarUrl}
                          alt={`${user?.username ?? 'Player'} avatar preview`}
                          fill
                          sizes="80px"
                          className="object-cover"
                        />
                      ) : (
                        <div
                          className="flex h-full w-full items-center justify-center text-2xl font-black"
                          style={{
                            background: withAlpha(bestDivision.color, '20'),
                            color: bestDivision.color,
                          }}
                        >
                          {usernameInitial}
                        </div>
                      )}
                    </div>
                    <label className="btn-ghost cursor-pointer">
                      {uploadingMedia === 'avatar' ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Camera size={14} />
                          Change photo
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={(event) => {
                          const file = event.target.files?.[0] ?? null;
                          void handleMediaUpload('avatar', file);
                          event.target.value = '';
                        }}
                        disabled={uploadingMedia !== null}
                      />
                    </label>
                  </div>
                </div>

                <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4">
                  <p className="label mb-3">Cover image</p>
                  <div className="relative h-32 overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--surface)]">
                    {coverUrl ? (
                      <Image
                        src={coverUrl}
                        alt={`${user?.username ?? 'Player'} cover preview`}
                        fill
                        sizes="(min-width: 1024px) 420px, 100vw"
                        className="object-cover"
                      />
                    ) : null}
                    <div
                      className="absolute inset-0"
                      style={{
                        background: `linear-gradient(135deg, ${withAlpha(bestDivision.color, coverUrl ? '18' : '26')} 0%, ${withAlpha(bestDivision.color, '08')} 60%, transparent 100%)`,
                      }}
                    />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs text-[var(--text-secondary)]">Wide images work best here.</p>
                    <label className="btn-ghost cursor-pointer">
                      {uploadingMedia === 'cover' ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <ImagePlus size={14} />
                          Change cover
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={(event) => {
                          const file = event.target.files?.[0] ?? null;
                          void handleMediaUpload('cover', file);
                          event.target.value = '';
                        }}
                        disabled={uploadingMedia !== null}
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <div className="card p-5">
                <label className="label">Region</label>
                <p className="mb-3 mt-2 text-sm text-[var(--text-secondary)]">
                  Set the place you mostly queue from so nearby players can read you quickly.
                </p>
                <input
                  type="text"
                  list="profile-region-options"
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="input w-full"
                  placeholder="Type your region"
                />
                <datalist id="profile-region-options">
                  {REGIONS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </datalist>
              </div>

              <div className="card p-5">
                <label className="label mb-3">Notifications</label>
                <label className="flex cursor-pointer items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">WhatsApp match alerts</p>
                    <p className="mt-0.5 text-xs text-[var(--text-soft)]">
                      Get notified when matches are found or results are confirmed.
                    </p>
                    <p className="mt-2 text-xs text-[var(--text-soft)]">
                      Text <span className="font-semibold text-[var(--text-primary)]">Join Mechi</span> on WhatsApp first so Mechi can message you there.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setProfile((current) =>
                        current
                          ? {
                              ...current,
                              whatsapp_notifications: !Boolean(current.whatsapp_notifications),
                              whatsapp_number: !Boolean(current.whatsapp_notifications)
                                ? (typeof current.whatsapp_number === 'string' && current.whatsapp_number.length > 0
                                    ? current.whatsapp_number
                                    : user?.phone ?? '')
                                : current.whatsapp_number ?? null,
                            }
                          : current
                      )
                    }
                    aria-pressed={whatsappNotifications}
                    aria-label="Toggle WhatsApp match alerts"
                    className={`relative h-11 w-16 flex-shrink-0 rounded-full transition-colors ${
                      whatsappNotifications ? 'bg-[var(--brand-teal)]' : 'bg-[var(--surface-strong)]'
                    }`}
                  >
                    <span
                      className={`absolute top-2 h-7 w-7 rounded-full bg-white shadow transition-transform ${
                        whatsappNotifications ? 'translate-x-7' : 'translate-x-2'
                      }`}
                    />
                  </button>
                </label>

                {whatsappNotifications && (
                  <div className="mt-4 border-t border-[var(--border-color)] pt-4">
                    <label className="label">WhatsApp Number</label>
                    <input
                      type="tel"
                      value={whatsappNumber}
                      onChange={(e) =>
                        setProfile((current) =>
                          current ? { ...current, whatsapp_number: e.target.value } : current
                        )
                      }
                      placeholder="0712 345 678"
                      className="input"
                      inputMode="tel"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="card p-5">
              <div className="mb-3 flex items-center justify-between">
                <label className="label mb-0">Your games</label>
                <div className="flex gap-1.5">
                  {[0, 1, 2].map((index) => (
                    <div
                      key={index}
                      className={`h-2 w-2 rounded-full transition-colors ${
                        index < selectedGames.length ? 'bg-[var(--brand-coral)]' : 'bg-[var(--border-strong)]'
                      }`}
                    />
                  ))}
                </div>
              </div>
              <p className="mb-3 text-xs text-[var(--text-soft)]">
                {currentPlan.id === 'free'
                  ? 'Free plan saves 1 title. Upgrade to unlock up to 3.'
                  : `Pick up to ${currentPlan.maxGames} titles you actively play so your profile stays relevant.`}
              </p>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
                {selectableGames.map((game) => {
                  const isSelected = selectedGames.includes(game);

                  return (
                    <button
                      key={game}
                      type="button"
                      onClick={() => toggleGame(game)}
                      className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${
                        isSelected
                          ? 'surface-action'
                          : 'border-[var(--border-color)] bg-[var(--surface-elevated)] hover:bg-[var(--surface)]'
                      }`}
                    >
                      <div className="h-10 w-10 overflow-hidden rounded-lg border border-[var(--border-color)] bg-[var(--surface)]">
                          <GameCover gameKey={game} variant="header" className="h-full w-full" />
                        </div>
                      <span className="flex-1 text-sm font-medium text-[var(--text-primary)]">
                        {GAMES[game].label}
                      </span>
                      <div
                        className={`flex h-6 w-6 items-center justify-center rounded-full border-2 transition-colors ${
                          isSelected
                            ? 'border-[var(--brand-coral)] bg-[var(--brand-coral)]'
                            : 'border-[rgba(95,109,130,0.24)]'
                        }`}
                      >
                        {isSelected && <Check size={11} className="text-white" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {selectedGames.length > 0 && (
              <div className="card p-5">
                <label className="label mb-3">Platforms and player IDs</label>
                <div className="space-y-3">
                  {selectedGames.map((game) => {
                    const gameConfig = GAMES[game];
                    const selectedPlatform = getConfiguredPlatformForGame(game, gameIds, platforms);

                    return (
                      <div
                        key={game}
                        className="rounded-xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-3"
                      >
                        <div className="mb-3 flex items-center gap-2">
                          <div className="h-10 w-10 overflow-hidden rounded-lg border border-[var(--border-color)] bg-[var(--surface)]">
                          <GameCover gameKey={game} variant="header" className="h-full w-full" />
                        </div>
                          <p className="text-sm font-semibold text-[var(--text-primary)]">
                            {gameConfig.label}
                          </p>
                        </div>
                        {gameConfig.platforms.length > 1 ? (
                          <div className="flex flex-wrap gap-2">
                            {gameConfig.platforms.map((platform) => {
                              const isSelected = selectedPlatform === platform;

                              return (
                                <button
                                  key={platform}
                                  type="button"
                                  onClick={() => selectPlatformForGame(game, platform)}
                                  className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition-all ${
                                    isSelected
                                      ? 'border-[rgba(50,224,196,0.28)] bg-[rgba(50,224,196,0.14)] text-[var(--accent-secondary-text)]'
                                      : 'border-[var(--border-color)] bg-[var(--surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                  }`}
                                >
                                  <PlatformLogo platform={platform} size={16} />
                                  {PLATFORMS[platform]?.label}
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-color)] bg-[var(--surface)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)]">
                            <PlatformLogo platform={gameConfig.platforms[0]} size={16} />
                            {PLATFORMS[gameConfig.platforms[0]]?.label}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {requiredIdFields.length > 0 && (
                    <div className="grid grid-cols-1 gap-3 border-t border-[var(--border-color)] pt-3 sm:grid-cols-2">
                      {requiredIdFields.map((field) => (
                        <div key={field.key}>
                          <label className="label">{getGameIdLabel(field.game, field.platform)}</label>
                          <input
                            type="text"
                            value={getGameIdValue(gameIds, field.game, field.platform)}
                            placeholder={getGameIdPlaceholder(field.game, field.platform)}
                            onChange={(e) =>
                              setGameIds({ ...gameIds, [field.key]: e.target.value })
                            }
                            className="input"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            </div>

            <div className="space-y-4 xl:sticky xl:top-4">
              <div className="card p-5">
                <p className="section-title">Save and review</p>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  Once you save, your updated photo, cover, games, and alerts go live across your account.
                </p>

                <div className="mt-4 rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">
                    Profile completion
                  </p>
                  <p className="mt-2 text-2xl font-black text-[var(--text-primary)]">
                    {completedChecklistCount}/{setupChecklist.length}
                  </p>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">
                    The more complete this is, the easier it is for players to trust your setup.
                  </p>
                </div>

                <button onClick={handleSave} disabled={saving} className="btn-primary mt-4 w-full">
                  {saving ? (
                    <>
                      <Loader2 size={14} className="animate-spin" /> Saving...
                    </>
                  ) : (
                    <>
                      <Check size={14} /> Save Changes
                    </>
                  )}
                </button>
              </div>

              <div className="card p-5">
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--text-soft)]">
                  Account
                </p>
                <button onClick={logout} className="btn-danger w-full">
                  <LogOut size={14} /> Sign Out
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}



