'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Camera, Check, ImagePlus, Loader2, LogOut } from 'lucide-react';
import { useAuth, useAuthFetch } from '@/components/AuthProvider';
import { GameCover } from '@/components/GameCover';
import { PaywallModal } from '@/components/PaywallModal';
import { PlanBadge } from '@/components/PlanBadge';
import { PlatformLogo } from '@/components/PlatformLogo';
import { ProfileImageCropper } from '@/components/ProfileImageCropper';
import {
  GAMES,
  PLATFORMS,
  getConfiguredPlatformForGame,
  getGameIdKey,
  getGameIdLabel,
  getGameIdPlaceholder,
  getGameIdValue,
  getGamePlatformKey,
  getGameRatingKey,
  getPlatformsForGameSetup,
  getSelectableGameKeys,
  normalizeGameIdKeys,
  normalizeSelectedGameKeys,
} from '@/lib/config';
import {
  COUNTRY_OPTIONS,
  formatLocationLabel,
  getRegionsForCountry,
  resolveProfileLocation,
} from '@/lib/location';
import { getRankDivision, withAlpha } from '@/lib/gamification';
import { canSelectGames, getPlan } from '@/lib/plans';
import type { CountryKey, GameKey, Plan, PlatformKey } from '@/types';

interface Profile {
  [key: string]: unknown;
  country?: CountryKey | null;
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

export default function ProfileSettingsPage() {
  const { user, logout, refresh } = useAuth();
  const authFetch = useAuthFetch();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState<'avatar' | 'cover' | null>(null);
  const [pendingMedia, setPendingMedia] = useState<{
    kind: 'avatar' | 'cover';
    file: File;
  } | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);

  const [country, setCountry] = useState<CountryKey | ''>('');
  const [region, setRegion] = useState('');
  const [platforms, setPlatforms] = useState<PlatformKey[]>([]);
  const [gameIds, setGameIds] = useState<Record<string, string>>({});
  const [selectedGames, setSelectedGames] = useState<GameKey[]>([]);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await authFetch('/api/users/profile');

      if (!res.ok) {
        return;
      }

      const data = await res.json();
      const location = resolveProfileLocation(data.profile as Record<string, unknown>);
      setProfile({
        ...(data.profile as Profile),
        country: location.country,
        region: location.region,
      });
      setCountry(location.country ?? '');
      setRegion(location.region);
      setPlatforms((data.profile.platforms as PlatformKey[]) ?? []);
      setGameIds(normalizeGameIdKeys((data.profile.game_ids as Record<string, string>) ?? {}));
      setSelectedGames(normalizeSelectedGameKeys(data.profile.selected_games ?? []));
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

      const defaultPlatform = GAMES[game]?.platforms[0] ?? null;
      if (defaultPlatform) {
        setGameIds((ids) => ({
          ...ids,
          [getGamePlatformKey(game)]: ids[getGamePlatformKey(game)] ?? defaultPlatform,
        }));
        setPlatforms((prevPlatforms) =>
          prevPlatforms.includes(defaultPlatform) ? prevPlatforms : [...prevPlatforms, defaultPlatform]
        );
      }

      return [...prev, game];
    });
  };

  const selectPlatformForGame = (game: GameKey, platform: PlatformKey) => {
    setGameIds((ids) => ({
      ...ids,
      [getGamePlatformKey(game)]: platform,
    }));
    setPlatforms((prevPlatforms) =>
      prevPlatforms.includes(platform) ? prevPlatforms : [...prevPlatforms, platform]
    );
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

      setProfile((data.profile as Profile) ?? null);
      await refresh();
      toast.success(kind === 'avatar' ? 'Display photo updated' : 'Cover photo updated');
      await fetchProfile();
    } catch {
      toast.error('Network error');
    } finally {
      setUploadingMedia(null);
    }
  };

  const openMediaEditor = (kind: 'avatar' | 'cover', file: File | null) => {
    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error('Pick an image file');
      return;
    }

    setPendingMedia({ kind, file });
  };

  const handleSave = async () => {
    if (!profile) {
      toast.error('Profile not loaded');
      return;
    }

    if ((country && !region) || (!country && region)) {
      toast.error('Choose both country and region');
      return;
    }

    const setupPlatforms = getPlatformsForGameSetup(selectedGames, gameIds, platforms);
    const hasMissingPlatform = selectedGames.some(
      (game) => !getConfiguredPlatformForGame(game, gameIds, setupPlatforms)
    );
    const requiredIdFields = selectedGames.reduce<Array<{ game: GameKey; platform: PlatformKey }>>(
      (fields, game) => {
        const platform = getConfiguredPlatformForGame(game, gameIds, setupPlatforms);
        if (!platform) {
          return fields;
        }

        fields.push({ game, platform });
        return fields;
      },
      []
    );
    const hasMissingGameId = requiredIdFields.some(({ game, platform }) => {
      return !getGameIdValue(gameIds, game, platform).trim();
    });

    if (selectedGames.length > 0 && hasMissingPlatform) {
      toast.error('Choose a platform for each game');
      return;
    }

    if (selectedGames.length > 0 && hasMissingGameId) {
      toast.error('Add the player IDs opponents will need');
      return;
    }

    setSaving(true);
    try {
      const currentSelectedGames = normalizeSelectedGameKeys((profile.selected_games as GameKey[]) ?? []);
      const currentGameIds = normalizeGameIdKeys((profile.game_ids as Record<string, string>) ?? {});
      const currentPlatforms = (profile.platforms as PlatformKey[]) ?? [];

      const normalizeArray = (values: string[]) => [...values].sort();
      const stableStringify = (value: Record<string, string>) => {
        const sortedEntries = Object.entries(value).sort(([a], [b]) => a.localeCompare(b));
        return JSON.stringify(Object.fromEntries(sortedEntries));
      };

      const payload: Record<string, unknown> = {
        whatsapp_notifications: profile.whatsapp_notifications ?? false,
        whatsapp_number: profile.whatsapp_number ?? null,
      };
      const currentLocation = resolveProfileLocation(profile);
      const nextLocationCountry = country || null;
      const nextLocationRegion = region.trim();

      if (nextLocationCountry && nextLocationRegion) {
        payload.country = nextLocationCountry;
        payload.region = nextLocationRegion;
      } else if (currentLocation.country && currentLocation.region) {
        payload.country = currentLocation.country;
        payload.region = currentLocation.region;
      }

      const nextSelectedGames = normalizeArray(selectedGames);
      const prevSelectedGames = normalizeArray(currentSelectedGames);
      const nextPlatforms = normalizeArray(setupPlatforms);
      const prevPlatforms = normalizeArray(currentPlatforms);

      if (JSON.stringify(nextSelectedGames) !== JSON.stringify(prevSelectedGames)) {
        payload.selected_games = selectedGames;
      }

      if (stableStringify(gameIds) !== stableStringify(currentGameIds)) {
        payload.game_ids = gameIds;
      }

      if (JSON.stringify(nextPlatforms) !== JSON.stringify(prevPlatforms)) {
        payload.platforms = setupPlatforms;
      }

      const res = await authFetch('/api/users/profile', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success('Profile updated');
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
      <div className="page-container space-y-4">
        <div className="h-24 shimmer" />
        <div className="h-56 shimmer" />
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.85fr)]">
          <div className="space-y-4">
            <div className="h-52 shimmer" />
            <div className="h-52 shimmer" />
          </div>
          <div className="space-y-4">
            <div className="h-44 shimmer" />
            <div className="h-24 shimmer" />
          </div>
        </div>
      </div>
    );
  }

  const selectableGames = getSelectableGameKeys();
  const availableRegions = getRegionsForCountry(country || null);
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
  const rankedSelectedGames = selectedGames.filter((game) => GAMES[game]?.mode === '1v1');
  const bestRating = rankedSelectedGames.length
    ? rankedSelectedGames.reduce((best, game) => {
        const rating = (profile?.[getGameRatingKey(game)] as number) ?? 1000;
        return rating > best ? rating : best;
      }, 1000)
    : 1000;
  const bestDivision = getRankDivision(bestRating);
  const avatarUrl = (profile?.avatar_url as string | null | undefined) ?? user?.avatar_url ?? null;
  const coverUrl = (profile?.cover_url as string | null | undefined) ?? user?.cover_url ?? null;
  const usernameInitial = user?.username?.[0]?.toUpperCase() ?? '?';
  const currentPlan = getPlan(((profile?.plan as Plan | undefined) ?? user?.plan ?? 'free'));
  const whatsappNotifications = Boolean(profile?.whatsapp_notifications);
  const whatsappNumber = typeof profile?.whatsapp_number === 'string' ? profile.whatsapp_number : '';
  const profileLocation = resolveProfileLocation(profile ?? {});
  const locationLabel = profileLocation.label;
  const setupChecklist = [
    { label: 'Display photo', complete: Boolean(avatarUrl) },
    { label: 'Cover image', complete: Boolean(coverUrl) },
    { label: 'Location chosen', complete: Boolean(locationLabel) },
    { label: 'Games selected', complete: selectedGames.length > 0 },
    { label: 'Platforms linked', complete: setupPlatforms.length > 0 },
  ];
  const completedChecklistCount = setupChecklist.filter((item) => item.complete).length;
  const missingChecklistItems = setupChecklist.filter((item) => !item.complete);

  return (
    <div className="page-container space-y-5">
      {showPaywall ? (
        <PaywallModal reason="game_limit" onClose={() => setShowPaywall(false)} />
      ) : null}

      {pendingMedia ? (
        <ProfileImageCropper
          kind={pendingMedia.kind}
          file={pendingMedia.file}
          onCancel={() => setPendingMedia(null)}
          onConfirm={async (blob) => {
            const nextFile = new File([blob], pendingMedia.file.name, {
              type: blob.type || pendingMedia.file.type,
            });
            await handleMediaUpload(pendingMedia.kind, nextFile);
            setPendingMedia(null);
          }}
        />
      ) : null}

      <section className="card p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-2xl">
            <p className="app-page-eyebrow">Profile settings</p>
            <h1 className="text-2xl font-bold leading-tight text-[var(--text-primary)] sm:text-[2.2rem]">
              Edit your setup in one place
            </h1>
            <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)] sm:text-base">
              Media, location, alerts, selected games, platforms, and player IDs live here now so the profile overview
              can stay read-first.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link href="/profile" className="btn-outline text-sm">
              Back to profile
            </Link>
            {currentPlan.id === 'free' ? (
              <Link href="/pricing" className="btn-primary text-sm">
                Upgrade
              </Link>
            ) : (
              <button
                type="button"
                disabled={subscriptionLoading}
                className="btn-outline text-sm"
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
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.85fr)] xl:items-start">
        <div className="space-y-5">
          <div className="subtle-card p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="section-title">Plan</p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-sm font-semibold text-[var(--text-primary)]">{currentPlan.name}</span>
                  <PlanBadge plan={currentPlan.id} size="md" />
                </div>
              </div>
            </div>
            <p className="text-sm leading-6 text-[var(--text-secondary)]">
              {currentPlan.id === 'free'
                ? 'Free keeps one saved game and a lighter ranked allowance.'
                : currentPlan.id === 'pro'
                  ? 'Pro unlocks unlimited ranked matches and up to three selected games.'
                  : 'Elite keeps the full stack live with fee-free tournaments and early access perks.'}
            </p>
          </div>

          <div className="card p-5">
            <div className="mb-4">
              <p className="section-title">Profile look</p>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                Update the display photo and cover here so the public profile stays clean.
              </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-[minmax(220px,0.7fr)_minmax(0,1.3fr)]">
              <div className="subtle-card p-4">
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
                        openMediaEditor('avatar', file);
                        event.target.value = '';
                      }}
                      disabled={uploadingMedia !== null}
                    />
                  </label>
                </div>
              </div>

              <div className="subtle-card p-4">
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
                        openMediaEditor('cover', file);
                        event.target.value = '';
                      }}
                      disabled={uploadingMedia !== null}
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            <div className="card p-5">
              <label className="label">Location</label>
              <p className="mb-3 mt-2 text-sm text-[var(--text-secondary)]">
                Set where you mostly play from so nearby players and brackets read you correctly.
              </p>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <select
                  value={country}
                  onChange={(event) => {
                    setCountry(event.target.value as CountryKey | '');
                    setRegion('');
                  }}
                  className="input w-full"
                >
                  <option value="">Select country</option>
                  {COUNTRY_OPTIONS.map((option) => (
                    <option key={option.key} value={option.key}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <select
                  value={region}
                  onChange={(event) => setRegion(event.target.value)}
                  className="input w-full"
                  disabled={!country}
                >
                  <option value="">{country ? 'Select region' : 'Choose country first'}</option>
                  {availableRegions.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
              {locationLabel ? (
                <p className="mt-3 text-xs text-[var(--text-soft)]">
                  Current public location: {formatLocationLabel(country || null, region) || locationLabel}
                </p>
              ) : null}
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
                    Text <span className="font-semibold text-[var(--text-primary)]">Join Mechi</span> on WhatsApp first
                    so Mechi can message you there.
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
                              ? typeof current.whatsapp_number === 'string' && current.whatsapp_number.length > 0
                                ? current.whatsapp_number
                                : user?.phone ?? ''
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

              {whatsappNotifications ? (
                <div className="mt-4 border-t border-[var(--border-color)] pt-4">
                  <label className="label">WhatsApp Number</label>
                  <input
                    type="tel"
                    value={whatsappNumber}
                    onChange={(event) =>
                      setProfile((current) =>
                        current ? { ...current, whatsapp_number: event.target.value } : current
                      )
                    }
                    placeholder="0712 345 678"
                    className="input"
                    inputMode="tel"
                  />
                </div>
              ) : null}
            </div>
          </div>

          <div className="card p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <label className="label mb-0">Your games</label>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  Select the titles you actively play so the rest of the product can stay focused.
                </p>
              </div>
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

            <p className="mb-4 text-xs text-[var(--text-soft)]">
              {currentPlan.id === 'free'
                ? 'Free plan saves 1 title. Upgrade to unlock up to 3.'
                : `Pick up to ${currentPlan.maxGames} titles you actively play so your profile stays relevant.`}
            </p>

            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
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
                    <span className="flex-1 text-sm font-medium text-[var(--text-primary)]">{GAMES[game].label}</span>
                    <div
                      className={`flex h-6 w-6 items-center justify-center rounded-full border-2 transition-colors ${
                        isSelected ? 'border-[var(--brand-coral)] bg-[var(--brand-coral)]' : 'border-[rgba(95,109,130,0.24)]'
                      }`}
                    >
                      {isSelected ? <Check size={11} className="text-white" /> : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {selectedGames.length > 0 ? (
            <div className="card p-5">
              <label className="label mb-3">Platforms and player IDs</label>
              <div className="space-y-3">
                {selectedGames.map((game) => {
                  const gameConfig = GAMES[game];
                  const selectedPlatform = getConfiguredPlatformForGame(game, gameIds, platforms);

                  return (
                    <div key={game} className="rounded-xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-3">
                      <div className="mb-3 flex items-center gap-2">
                        <div className="h-10 w-10 overflow-hidden rounded-lg border border-[var(--border-color)] bg-[var(--surface)]">
                          <GameCover gameKey={game} variant="header" className="h-full w-full" />
                        </div>
                        <p className="text-sm font-semibold text-[var(--text-primary)]">{gameConfig.label}</p>
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

                {requiredIdFields.length > 0 ? (
                  <div className="grid gap-3 border-t border-[var(--border-color)] pt-3 sm:grid-cols-2">
                    {requiredIdFields.map((field) => (
                      <div key={field.key}>
                        <label className="label">{getGameIdLabel(field.game, field.platform)}</label>
                        <input
                          type="text"
                          value={getGameIdValue(gameIds, field.game, field.platform)}
                          placeholder={getGameIdPlaceholder(field.game, field.platform)}
                          onChange={(event) => setGameIds({ ...gameIds, [field.key]: event.target.value })}
                          className="input"
                        />
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>

        <div className="space-y-4 xl:sticky xl:top-4">
          <div className="card p-5">
            <p className="section-title">Save and review</p>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Save once and your updated media, location, alerts, games, and IDs go live across the account.
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

            <div className="mt-4 space-y-2">
              {missingChecklistItems.length > 0 ? (
                missingChecklistItems.map((item) => (
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
                  Everything essential is in place.
                </div>
              )}
            </div>

            <button onClick={handleSave} disabled={saving} className="btn-primary mt-4 w-full">
              {saving ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <Check size={14} /> Save changes
                </>
              )}
            </button>
          </div>

          <div className="card p-5">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--text-soft)]">
              Account
            </p>
            <button onClick={logout} className="btn-danger w-full">
              <LogOut size={14} /> Sign out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
