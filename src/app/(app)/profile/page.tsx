'use client';

import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Bell, Camera, Gamepad2, Loader2, MapPin, Save } from 'lucide-react';
import { useAuth, useAuthFetch } from '@/components/AuthProvider';
import {
  GAMES,
  PLATFORMS,
  getConfiguredPlatformForGame,
  getGameIdKey,
  getGameIdLabel,
  getGameIdPlaceholder,
  getGameIdValue,
  getGamePlatformKey,
  getPlatformsForGameSetup,
  getSelectableGameKeys,
  normalizeGameIdKeys,
  normalizeSelectedGameKeys,
} from '@/lib/config';
import { COUNTRY_OPTIONS, getRegionsForCountry, resolveProfileLocation } from '@/lib/location';
import { getPlan } from '@/lib/plans';
import type { CountryKey, GameKey, PlatformKey, Plan } from '@/types';

type Profile = {
  [key: string]: unknown;
  avatar_url?: string | null;
  country?: CountryKey | null;
  cover_url?: string | null;
  email?: string | null;
  game_ids?: Record<string, string>;
  phone?: string | null;
  platforms?: PlatformKey[];
  plan?: Plan;
  region?: string;
  selected_games?: GameKey[];
  username?: string;
  whatsapp_notifications?: boolean;
  whatsapp_number?: string | null;
};

const selectableGames = getSelectableGameKeys();

function getProfileInitial(username?: string | null) {
  return username?.trim().charAt(0).toUpperCase() || 'M';
}

export default function ProfilePage() {
  const { refresh, user } = useAuth();
  const authFetch = useAuthFetch();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState<'avatar' | 'cover' | null>(null);
  const [country, setCountry] = useState<CountryKey | ''>('');
  const [region, setRegion] = useState('');
  const [selectedGames, setSelectedGames] = useState<GameKey[]>([]);
  const [gameIds, setGameIds] = useState<Record<string, string>>({});
  const [platforms, setPlatforms] = useState<PlatformKey[]>([]);
  const [whatsappNotifications, setWhatsappNotifications] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState('');

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/users/profile');
      if (!res.ok) {
        toast.error('Could not load profile');
        return;
      }

      const data = (await res.json()) as { profile?: Profile };
      const nextProfile = data.profile ?? {};
      const location = resolveProfileLocation(nextProfile);
      setProfile({ ...nextProfile, country: location.country, region: location.region });
      setCountry(location.country ?? '');
      setRegion(location.region);
      setSelectedGames(normalizeSelectedGameKeys(nextProfile.selected_games ?? []));
      setGameIds(normalizeGameIdKeys(nextProfile.game_ids ?? {}));
      setPlatforms(nextProfile.platforms ?? []);
      setWhatsappNotifications(Boolean(nextProfile.whatsapp_notifications));
      setWhatsappNumber(
        typeof nextProfile.whatsapp_number === 'string' ? nextProfile.whatsapp_number : ''
      );
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const currentPlan = getPlan((profile?.plan ?? user?.plan ?? 'free') as Plan);
  const avatarUrl = profile?.avatar_url ?? user?.avatar_url ?? null;
  const coverUrl = profile?.cover_url ?? user?.cover_url ?? null;
  const regions = getRegionsForCountry(country || null);

  const setGameSelected = (game: GameKey, selected: boolean) => {
    setSelectedGames((current) => {
      if (!selected) {
        setGameIds((ids) => {
          const nextIds = { ...ids };
          delete nextIds[getGamePlatformKey(game)];
          for (const platform of GAMES[game].platforms) {
            delete nextIds[getGameIdKey(game, platform)];
          }
          return nextIds;
        });
        return current.filter((item) => item !== game);
      }

      if (current.includes(game)) {
        return current;
      }

      if (current.length >= currentPlan.maxGames) {
        toast.error(`${currentPlan.name} can save ${currentPlan.maxGames} game${currentPlan.maxGames === 1 ? '' : 's'}`);
        return current;
      }

      const defaultPlatform = GAMES[game].platforms[0];
      if (defaultPlatform) {
        setGameIds((ids) => ({
          ...ids,
          [getGamePlatformKey(game)]: ids[getGamePlatformKey(game)] ?? defaultPlatform,
        }));
        setPlatforms((items) => (items.includes(defaultPlatform) ? items : [...items, defaultPlatform]));
      }

      return [...current, game];
    });
  };

  const selectPlatform = (game: GameKey, platform: PlatformKey) => {
    setGameIds((ids) => ({
      ...ids,
      [getGamePlatformKey(game)]: platform,
    }));
    setPlatforms((items) => (items.includes(platform) ? items : [...items, platform]));
  };

  const updateGameId = (game: GameKey, platform: PlatformKey, value: string) => {
    setGameIds((ids) => ({
      ...ids,
      [getGameIdKey(game, platform)]: value,
    }));
  };

  const uploadMedia = async (kind: 'avatar' | 'cover', file: File | null) => {
    if (!file) return;
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
      const data = (await res.json()) as { error?: string; profile?: Profile };

      if (!res.ok || !data.profile) {
        toast.error(data.error ?? 'Could not upload image');
        return;
      }

      toast.success(kind === 'avatar' ? 'Photo updated' : 'Cover updated');
      await Promise.all([loadProfile(), refresh()]);
    } catch {
      toast.error('Could not upload image');
    } finally {
      setUploadingMedia(null);
    }
  };

  const saveProfile = async () => {
    if ((country && !region) || (!country && region)) {
      toast.error('Choose both country and region');
      return;
    }

    const setupPlatforms = getPlatformsForGameSetup(selectedGames, gameIds, platforms);
    const missingGame = selectedGames.find((game) => {
      const platform = getConfiguredPlatformForGame(game, gameIds, setupPlatforms);
      return !platform || !getGameIdValue(gameIds, game, platform).trim();
    });

    if (missingGame) {
      toast.error(`Add your ${GAMES[missingGame].label} player ID`);
      return;
    }

    const cleanGameIds = Object.fromEntries(
      Object.entries(gameIds).map(([key, value]) => [key, value.trim()])
    );
    const payload: Record<string, unknown> = {
      game_ids: cleanGameIds,
      platforms: setupPlatforms,
      selected_games: selectedGames,
      whatsapp_notifications: whatsappNotifications,
      whatsapp_number: whatsappNotifications ? whatsappNumber.trim() || null : null,
    };

    if (country && region) {
      payload.country = country;
      payload.region = region;
    }

    setSaving(true);
    try {
      const res = await authFetch('/api/users/profile', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { error?: string };

      if (!res.ok) {
        toast.error(data.error ?? 'Could not save profile');
        return;
      }

      toast.success('Profile saved');
      await Promise.all([loadProfile(), refresh()]);
    } catch {
      toast.error('Could not save profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="page-container space-y-4">
        <div className="h-40 shimmer" />
        <div className="h-72 shimmer" />
      </div>
    );
  }

  return (
    <div className="page-container space-y-5">
      <section className="card overflow-hidden p-0">
        <div className="relative h-36 bg-[var(--surface-strong)] sm:h-44">
          {coverUrl ? (
            <Image src={coverUrl} alt="" fill sizes="(min-width: 1024px) 960px, 100vw" className="object-cover" />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--surface)] via-transparent to-transparent" />
          <label className="btn-outline absolute right-4 top-4 cursor-pointer text-xs">
            {uploadingMedia === 'cover' ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
            Cover
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(event) => void uploadMedia('cover', event.target.files?.[0] ?? null)}
            />
          </label>
        </div>

        <div className="flex flex-col gap-4 px-5 pb-5 sm:flex-row sm:items-end sm:justify-between sm:px-6 sm:pb-6">
          <div className="-mt-10 flex items-end gap-4">
            <div className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-[var(--radius-panel)] border border-[var(--border-color)] bg-[var(--surface-strong)] text-2xl font-black text-[var(--text-primary)] shadow-[var(--shadow-soft)]">
              {avatarUrl ? (
                <Image src={avatarUrl} alt="" fill sizes="80px" className="object-cover" />
              ) : (
                getProfileInitial(profile?.username ?? user?.username)
              )}
            </div>
            <label className="btn-outline mb-1 cursor-pointer text-xs">
              {uploadingMedia === 'avatar' ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
              Photo
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(event) => void uploadMedia('avatar', event.target.files?.[0] ?? null)}
              />
            </label>
          </div>

          <button type="button" onClick={saveProfile} disabled={saving} className="btn-primary text-sm">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Save changes
          </button>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="card space-y-5 p-5 sm:p-6">
          <div>
            <p className="section-title">Account</p>
            <h1 className="mt-2 text-2xl font-black text-[var(--text-primary)]">Profile</h1>
          </div>

          <div className="grid gap-3">
            <label className="space-y-2">
              <span className="label">Username</span>
              <input className="input-field" value={profile?.username ?? user?.username ?? ''} readOnly />
            </label>
            <label className="space-y-2">
              <span className="label">Phone</span>
              <input className="input-field" value={profile?.phone ?? user?.phone ?? ''} readOnly />
            </label>
            <label className="space-y-2">
              <span className="label">Mail address</span>
              <input className="input-field" value={profile?.email ?? user?.email ?? ''} readOnly />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="label flex items-center gap-1.5">
                <MapPin size={13} />
                Country
              </span>
              <select
                value={country}
                onChange={(event) => {
                  setCountry(event.target.value as CountryKey | '');
                  setRegion('');
                }}
                className="input-field"
              >
                <option value="">Select country</option>
                {COUNTRY_OPTIONS.map((item) => (
                  <option key={item.key} value={item.key}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2">
              <span className="label">Region</span>
              <select
                value={region}
                onChange={(event) => setRegion(event.target.value)}
                disabled={!country}
                className="input-field"
              >
                <option value="">{country ? 'Select region' : 'Choose country first'}</option>
                {regions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="label flex items-center gap-1.5">
                  <Bell size={13} />
                  WhatsApp alerts
                </p>
                <p className="mt-1 text-xs text-[var(--text-soft)]">Optional match and tournament backup alerts.</p>
              </div>
              <button
                type="button"
                onClick={() => setWhatsappNotifications((current) => !current)}
                className={`h-7 w-12 rounded-full border p-1 transition-colors ${
                  whatsappNotifications
                    ? 'border-[rgba(50,224,196,0.28)] bg-[var(--brand-teal)]'
                    : 'border-[var(--border-color)] bg-[var(--surface-strong)]'
                }`}
                aria-pressed={whatsappNotifications}
              >
                <span
                  className={`block h-5 w-5 rounded-full bg-white transition-transform ${
                    whatsappNotifications ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
            {whatsappNotifications ? (
              <input
                value={whatsappNumber}
                onChange={(event) => setWhatsappNumber(event.target.value)}
                placeholder="0712 345 678"
                className="input-field mt-3"
              />
            ) : null}
          </div>
        </div>

        <div className="card space-y-5 p-5 sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="section-title">Games</p>
              <h2 className="mt-2 text-xl font-black text-[var(--text-primary)]">Player IDs</h2>
            </div>
            <p className="text-xs text-[var(--text-soft)]">
              {selectedGames.length}/{currentPlan.maxGames} saved
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {selectableGames.map((game) => {
              const selected = selectedGames.includes(game);

              return (
                <button
                  key={game}
                  type="button"
                  onClick={() => setGameSelected(game, !selected)}
                  className={`flex items-center justify-between rounded-[var(--radius-card)] border px-3 py-3 text-left text-sm transition-colors ${
                    selected
                      ? 'border-[rgba(50,224,196,0.28)] bg-[rgba(50,224,196,0.1)] text-[var(--text-primary)]'
                      : 'border-[var(--border-color)] bg-[var(--surface-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <span className="font-semibold">{GAMES[game].label}</span>
                  <Gamepad2 size={15} className={selected ? 'text-[var(--brand-teal)]' : 'text-[var(--text-soft)]'} />
                </button>
              );
            })}
          </div>

          {selectedGames.length > 0 ? (
            <div className="space-y-3">
              {selectedGames.map((game) => {
                const platform = getConfiguredPlatformForGame(game, gameIds, platforms) ?? GAMES[game].platforms[0];
                const gameConfig = GAMES[game];

                return (
                  <div key={game} className="rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4">
                    <p className="font-black text-[var(--text-primary)]">{gameConfig.label}</p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-[0.8fr_1.2fr]">
                      <label className="space-y-2">
                        <span className="label">Platform</span>
                        <select
                          value={platform}
                          onChange={(event) => selectPlatform(game, event.target.value as PlatformKey)}
                          className="input-field"
                        >
                          {gameConfig.platforms.map((item) => (
                            <option key={item} value={item}>
                              {PLATFORMS[item].label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="space-y-2">
                        <span className="label">{getGameIdLabel(game, platform)}</span>
                        <input
                          value={getGameIdValue(gameIds, game, platform)}
                          onChange={(event) => updateGameId(game, platform, event.target.value)}
                          placeholder={getGameIdPlaceholder(game, platform)}
                          className="input-field"
                        />
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-[var(--radius-card)] border border-dashed border-[var(--border-color)] px-4 py-8 text-center text-sm text-[var(--text-soft)]">
              Pick a game to add the ID other players need.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
