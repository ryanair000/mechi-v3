'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Check, Gamepad2, Loader2, Save, Trash2 } from 'lucide-react';
import { useAuth, useAuthFetch } from '@/components/AuthProvider';
import { GameCover } from '@/components/GameCover';
import { PlatformLogo } from '@/components/PlatformLogo';
import {
  GAMES,
  PLATFORMS,
  getConfiguredPlatformForGame,
  getGameIdKey,
  getGameIdLabel,
  getGameIdPlaceholder,
  getGameIdValue,
  getGamePlatformKey,
  getSelectableGameKeys,
  getPlatformsForGameSetup,
  normalizeGameIdKeys,
  normalizeSelectedGameKeys,
} from '@/lib/config';
import { canSelectGames, getPlan } from '@/lib/plans';
import type { GameKey, PlatformKey, Plan } from '@/types';

type ProfileSnapshot = {
  plan?: Plan | null;
  platforms?: PlatformKey[] | null;
  game_ids?: Record<string, string> | null;
  selected_games?: GameKey[] | null;
};

function getRequiredIdFields(
  selectedGames: GameKey[],
  gameIds: Record<string, string>,
  platforms: PlatformKey[]
) {
  return selectedGames.reduce<Array<{ key: string; game: GameKey; platform: PlatformKey }>>(
    (fields, game) => {
      const platform = getConfiguredPlatformForGame(game, gameIds, platforms);
      if (!platform) return fields;

      const key = getGameIdKey(game, platform);
      if (!fields.some((field) => field.key === key)) {
        fields.push({ key, game, platform });
      }

      return fields;
    },
    []
  );
}

function getCleanGameIds(
  selectedGames: GameKey[],
  gameIds: Record<string, string>,
  platforms: PlatformKey[]
) {
  const cleanGameIds: Record<string, string> = {};

  for (const game of selectedGames) {
    const platform = getConfiguredPlatformForGame(game, gameIds, platforms);
    if (!platform) continue;

    cleanGameIds[getGamePlatformKey(game)] = platform;

    const idKey = getGameIdKey(game, platform);
    const idValue = getGameIdValue(gameIds, game, platform).trim();
    if (idValue) {
      cleanGameIds[idKey] = idValue;
    }
  }

  return cleanGameIds;
}

export default function GamesPage() {
  const { user, refresh } = useAuth();
  const authFetch = useAuthFetch();
  const [profile, setProfile] = useState<ProfileSnapshot | null>(null);
  const [selectedGames, setSelectedGames] = useState<GameKey[]>([]);
  const [gameIds, setGameIds] = useState<Record<string, string>>({});
  const [platforms, setPlatforms] = useState<PlatformKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const currentPlan = getPlan(profile?.plan ?? user?.plan ?? 'free');
  const selectableGames = useMemo(() => getSelectableGameKeys(), []);
  const setupPlatforms = getPlatformsForGameSetup(selectedGames, gameIds, platforms);
  const requiredIdFields = getRequiredIdFields(selectedGames, gameIds, setupPlatforms);
  const hasMissingPlatform = selectedGames.some(
    (game) => !getConfiguredPlatformForGame(game, gameIds, setupPlatforms)
  );
  const hasMissingGameId = requiredIdFields.some(
    (field) => !getGameIdValue(gameIds, field.game, field.platform).trim()
  );
  const selectedGameSet = new Set(selectedGames);

  const loadProfile = useCallback(async () => {
    try {
      const res = await authFetch('/api/users/profile');
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? 'Could not load profile games');
        return;
      }

      const nextProfile = data.profile as ProfileSnapshot;
      setProfile(nextProfile);
      setSelectedGames(normalizeSelectedGameKeys(nextProfile.selected_games ?? []));
      setGameIds(normalizeGameIdKeys(nextProfile.game_ids ?? {}));
      setPlatforms(nextProfile.platforms ?? []);
    } catch {
      toast.error('Network error');
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const toggleGame = (game: GameKey) => {
    setSelectedGames((current) => {
      if (current.includes(game)) {
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
        return current.filter((item) => item !== game);
      }

      if (!canSelectGames(currentPlan.id, current.length + 1)) {
        toast.error(
          currentPlan.id === 'free'
            ? 'Free plan saves 1 game. Upgrade to unlock 3.'
            : `Max ${currentPlan.maxGames} games on this plan`
        );
        return current;
      }

      const defaultPlatform = GAMES[game]?.platforms[0];
      if (defaultPlatform) {
        setGameIds((ids) => ({
          ...ids,
          [getGamePlatformKey(game)]: ids[getGamePlatformKey(game)] ?? defaultPlatform,
        }));
        setPlatforms((currentPlatforms) =>
          currentPlatforms.includes(defaultPlatform)
            ? currentPlatforms
            : [...currentPlatforms, defaultPlatform]
        );
      }

      return [...current, game];
    });
  };

  const selectPlatformForGame = (game: GameKey, platform: PlatformKey) => {
    setGameIds((ids) => ({
      ...ids,
      [getGamePlatformKey(game)]: platform,
    }));
    setPlatforms((currentPlatforms) =>
      currentPlatforms.includes(platform) ? currentPlatforms : [...currentPlatforms, platform]
    );
  };

  const saveGames = async () => {
    if (hasMissingPlatform) {
      toast.error('Choose a platform for each selected game');
      return;
    }

    if (hasMissingGameId) {
      toast.error('Add the game IDs opponents will need');
      return;
    }

    const cleanGameIds = getCleanGameIds(selectedGames, gameIds, setupPlatforms);
    const cleanPlatforms =
      selectedGames.length > 0
        ? getPlatformsForGameSetup(selectedGames, cleanGameIds, setupPlatforms)
        : [];

    setSaving(true);
    try {
      const res = await authFetch('/api/users/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          selected_games: selectedGames,
          game_ids: cleanGameIds,
          platforms: cleanPlatforms,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? 'Could not save games');
        return;
      }

      setProfile(data.profile as ProfileSnapshot);
      setSelectedGames(normalizeSelectedGameKeys(data.profile.selected_games ?? []));
      setGameIds(normalizeGameIdKeys((data.profile.game_ids as Record<string, string>) ?? {}));
      setPlatforms((data.profile.platforms as PlatformKey[]) ?? []);
      await refresh();
      toast.success('Games updated');
    } catch {
      toast.error('Network error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="px-4 pb-16 pt-4 sm:px-6 lg:px-8 lg:pb-6">
        <div className="mx-auto w-full max-w-[82rem] space-y-4">
          <div className="h-36 shimmer" />
          <div className="h-64 shimmer" />
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 pb-16 pt-4 sm:px-6 lg:px-8 lg:pb-6">
      <div className="mx-auto w-full max-w-[82rem] space-y-5">
        <div className="card p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="section-title">Game setup</p>
              <h1 className="mt-3 text-3xl font-black text-[var(--text-primary)]">
                Manage your games
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
                Add or remove the titles on your profile, then keep the platform IDs players need
                up to date.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="brand-chip px-3 py-1">
                {selectedGames.length}/{currentPlan.maxGames} saved
              </span>
              {currentPlan.id === 'free' ? (
                <Link href="/pricing" className="btn-outline">
                  Upgrade
                </Link>
              ) : null}
            </div>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)] xl:items-start">
          <div className="space-y-4">
            <div className="card p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="section-title">Available titles</p>
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">
                    Tap a game to add it. Tap again to remove it.
                  </p>
                </div>
                <Gamepad2 className="text-[var(--accent-secondary-text)]" size={22} />
              </div>

              <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
                {selectableGames.map((game) => {
                  const isSelected = selectedGameSet.has(game);

                  return (
                    <button
                      key={game}
                      type="button"
                      onClick={() => toggleGame(game)}
                      className={`flex min-h-16 items-center gap-3 rounded-lg border p-3 text-left transition-all ${
                        isSelected
                          ? 'surface-action'
                          : 'border-[var(--border-color)] bg-[var(--surface-elevated)] hover:bg-[var(--surface)]'
                      }`}
                    >
                      <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg border border-[var(--border-color)] bg-[var(--surface)]">
                        <GameCover gameKey={game} variant="header" className="h-full w-full" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span
                          className="block whitespace-normal text-sm font-semibold leading-snug text-[var(--text-primary)]"
                          title={GAMES[game].label}
                        >
                          {GAMES[game].label}
                        </span>
                        <span className="mt-1 flex gap-1">
                          {GAMES[game].platforms.map((platform) => (
                            <PlatformLogo key={platform} platform={platform} size={12} />
                          ))}
                        </span>
                      </div>
                      <div
                        className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                          isSelected
                            ? 'border-[var(--brand-coral)] bg-[var(--brand-coral)]'
                            : 'border-[rgba(95,109,130,0.24)]'
                        }`}
                      >
                        {isSelected ? <Check size={12} className="text-white" /> : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {selectedGames.length > 0 ? (
              <div className="card p-5">
                <div className="mb-4">
                  <p className="section-title">Platforms and IDs</p>
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">
                    Pick the right platform for each selected game, then add the ID opponents
                    should use.
                  </p>
                </div>

                <div className="space-y-3">
                  {selectedGames.map((game) => {
                    const gameConfig = GAMES[game];
                    const selectedPlatform = getConfiguredPlatformForGame(
                      game,
                      gameIds,
                      setupPlatforms
                    );

                    return (
                      <div
                        key={game}
                        className="rounded-lg border border-[var(--border-color)] bg-[var(--surface-elevated)] p-3"
                      >
                        <div className="mb-3 flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-2">
                            <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg border border-[var(--border-color)] bg-[var(--surface)]">
                              <GameCover gameKey={game} variant="header" className="h-full w-full" />
                            </div>
                            <p
                              className="min-w-0 whitespace-normal text-sm font-semibold leading-snug text-[var(--text-primary)]"
                              title={gameConfig.label}
                            >
                              {gameConfig.label}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => toggleGame(game)}
                            className="icon-button h-9 w-9 text-[var(--brand-coral)]"
                            aria-label={`Remove ${gameConfig.label}`}
                          >
                            <Trash2 size={14} />
                          </button>
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
                                  className={`inline-flex min-h-11 items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition-all ${
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
                          <div className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[var(--border-color)] bg-[var(--surface)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)]">
                            <PlatformLogo platform={gameConfig.platforms[0]} size={16} />
                            {PLATFORMS[gameConfig.platforms[0]]?.label}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {requiredIdFields.length > 0 ? (
                    <div className="grid grid-cols-1 gap-3 border-t border-[var(--border-color)] pt-3 sm:grid-cols-2">
                      {requiredIdFields.map((field) => (
                        <div key={field.key}>
                          <label className="label">{getGameIdLabel(field.game, field.platform)}</label>
                          <input
                            type="text"
                            value={getGameIdValue(gameIds, field.game, field.platform)}
                            placeholder={getGameIdPlaceholder(field.game, field.platform)}
                            onChange={(event) =>
                              setGameIds({ ...gameIds, [field.key]: event.target.value })
                            }
                            className="input"
                          />
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="card p-10 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-lg bg-[rgba(50,224,196,0.14)] text-[var(--accent-secondary-text)]">
                  <Gamepad2 size={24} />
                </div>
                <p className="font-semibold text-[var(--text-primary)]">No games selected</p>
                <p className="mx-auto mt-2 max-w-sm text-sm text-[var(--text-secondary)]">
                  Add at least one title when you are ready to queue, challenge players, or show
                  your setup on your profile.
                </p>
              </div>
            )}
          </div>

          <div className="space-y-4 xl:sticky xl:top-4">
            <div className="card p-5">
              <p className="section-title">Save setup</p>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                Your profile updates after saving. Removed games disappear from your public setup.
              </p>

              {hasMissingPlatform || hasMissingGameId ? (
                <p className="mt-4 rounded-lg border border-[rgba(255,107,107,0.24)] bg-[rgba(255,107,107,0.08)] px-3 py-2 text-sm text-[var(--brand-coral)]">
                  {hasMissingPlatform
                    ? 'Choose a platform for every selected game.'
                    : 'Add each game ID before saving.'}
                </p>
              ) : null}

              <button
                type="button"
                onClick={saveGames}
                disabled={saving}
                className="btn-primary mt-4 w-full"
              >
                {saving ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={14} />
                    Save games
                  </>
                )}
              </button>
            </div>

            <div className="card p-5">
              <p className="section-title">Current plan</p>
              <p className="mt-2 text-2xl font-black text-[var(--text-primary)]">
                {currentPlan.name}
              </p>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                {currentPlan.id === 'free'
                  ? 'One saved game is included.'
                  : `Up to ${currentPlan.maxGames} saved games are included.`}
              </p>
              {currentPlan.id === 'free' ? (
                <Link href="/pricing" className="btn-outline mt-4 w-full justify-center">
                  Unlock 3 games
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
