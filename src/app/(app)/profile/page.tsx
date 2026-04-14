'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth, useAuthFetch } from '@/components/AuthProvider';
import { GAMES, PLATFORMS, REGIONS, getTier, getGamesForPlatforms } from '@/lib/config';
import { RatingBadge } from '@/components/RatingBadge';
import type { GameKey, PlatformKey } from '@/types';
import toast from 'react-hot-toast';
import { Edit2, Save, X, Check } from 'lucide-react';

interface Profile {
  id: string;
  username: string;
  phone: string;
  email?: string;
  region: string;
  platforms: PlatformKey[];
  game_ids: Record<string, string>;
  selected_games: GameKey[];
  [key: string]: unknown;
}

export default function ProfilePage() {
  const { user } = useAuth();
  const authFetch = useAuthFetch();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editData, setEditData] = useState<Partial<Profile>>({});
  const [activeTab, setActiveTab] = useState<'stats' | 'settings'>('stats');

  const fetchProfile = useCallback(async () => {
    const res = await authFetch('/api/users/profile');
    if (res.ok) {
      const data = await res.json();
      setProfile(data.profile);
    }
  }, [authFetch]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const startEditing = () => {
    if (!profile) return;
    setEditData({
      region: profile.region,
      platforms: [...profile.platforms],
      game_ids: { ...profile.game_ids },
      selected_games: [...profile.selected_games],
    });
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
    setEditData({});
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      const res = await authFetch('/api/users/profile', {
        method: 'PATCH',
        body: JSON.stringify(editData),
      });

      if (res.ok) {
        const data = await res.json();
        setProfile(data.profile);
        setEditing(false);
        toast.success('Profile updated!');
      } else {
        const data = await res.json();
        toast.error(data.error ?? 'Failed to save');
      }
    } finally {
      setSaving(false);
    }
  };

  const togglePlatform = (platform: PlatformKey) => {
    const current = editData.platforms ?? [];
    const has = current.includes(platform);
    const newPlatforms = has ? current.filter((p) => p !== platform) : [...current, platform];
    const newGameIds = { ...(editData.game_ids ?? {}) };
    if (has) delete newGameIds[platform];
    const newGames = (editData.selected_games ?? []).filter((g) =>
      GAMES[g]?.platforms.some((p) => newPlatforms.includes(p))
    );
    setEditData({ ...editData, platforms: newPlatforms, game_ids: newGameIds, selected_games: newGames });
  };

  const toggleGame = (game: GameKey) => {
    const current = editData.selected_games ?? [];
    const has = current.includes(game);
    if (!has && current.length >= 3) {
      toast.error('Max 3 games');
      return;
    }
    setEditData({
      ...editData,
      selected_games: has ? current.filter((g) => g !== game) : [...current, game],
    });
  };

  if (!profile) {
    return (
      <div className="page-container space-y-4">
        {[1, 2, 3].map((i) => <div key={i} className="h-24 shimmer rounded-2xl" />)}
      </div>
    );
  }

  const totalWins = (profile.selected_games ?? []).reduce((acc, g) => acc + ((profile[`wins_${g}`] as number) ?? 0), 0);
  const totalLosses = (profile.selected_games ?? []).reduce((acc, g) => acc + ((profile[`losses_${g}`] as number) ?? 0), 0);

  const availableGames = getGamesForPlatforms(editData.platforms ?? profile.platforms).filter(
    (g) => GAMES[g].mode === '1v1'
  );

  return (
    <div className="page-container">
      {/* Profile header */}
      <div className="card p-5 mb-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="w-14 h-14 rounded-2xl bg-emerald-600 flex items-center justify-center text-white font-black text-2xl mb-3">
              {profile.username[0].toUpperCase()}
            </div>
            <h1 className="text-xl font-black text-gray-900 dark:text-white">{profile.username}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{profile.phone}</p>
            {profile.email && <p className="text-sm text-gray-400">{profile.email}</p>}
          </div>
          <div className="text-right">
            {!editing ? (
              <button onClick={startEditing} className="btn-ghost text-sm px-3">
                <Edit2 size={14} /> Edit
              </button>
            ) : (
              <div className="flex gap-2">
                <button onClick={cancelEditing} className="btn-ghost text-sm px-3">
                  <X size={14} />
                </button>
                <button onClick={saveProfile} disabled={saving} className="btn-primary text-sm px-3">
                  <Save size={14} /> {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="stat-card">
            <div className="stat-value text-emerald-600">{totalWins}</div>
            <div className="stat-label">Wins</div>
          </div>
          <div className="stat-card">
            <div className="stat-value text-red-500">{totalLosses}</div>
            <div className="stat-label">Losses</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{profile.region}</div>
            <div className="stat-label">Region</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {(['stats', 'settings'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors capitalize ${
              activeTab === tab
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Stats tab */}
      {activeTab === 'stats' && (
        <div className="space-y-3">
          {(profile.selected_games ?? []).map((gameKey) => {
            const ratingKey = `rating_${gameKey}`;
            const winsKey = `wins_${gameKey}`;
            const lossesKey = `losses_${gameKey}`;
            const rating = (profile[ratingKey] as number) ?? 1000;
            const wins = (profile[winsKey] as number) ?? 0;
            const losses = (profile[lossesKey] as number) ?? 0;
            const tier = getTier(rating);
            const total = wins + losses;
            const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;

            return (
              <div key={gameKey} className="card p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-gray-900 dark:text-white text-sm">
                    {GAMES[gameKey].label}
                  </h3>
                  <RatingBadge rating={rating} size="sm" />
                </div>

                {/* Win rate bar */}
                <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden mb-2">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all"
                    style={{ width: `${winRate}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span className="text-emerald-600 font-bold">{wins}W</span>
                  <span>{winRate}% WR</span>
                  <span className="text-red-500 font-bold">{losses}L</span>
                </div>

                <div className="mt-2 flex gap-1 flex-wrap">
                  {GAMES[gameKey].platforms.map((p) => (
                    <span key={p} className="text-sm" title={PLATFORMS[p]?.label}>
                      {PLATFORMS[p]?.icon}
                    </span>
                  ))}
                  <span className={`text-xs font-semibold ml-auto ${tier.color}`}>{tier.name}</span>
                </div>
              </div>
            );
          })}

          {(profile.selected_games ?? []).length === 0 && (
            <div className="card p-8 text-center text-gray-400">
              <p>No games selected. Go to Settings to add games.</p>
            </div>
          )}
        </div>
      )}

      {/* Settings tab */}
      {activeTab === 'settings' && (
        <div className="space-y-4">
          {/* Region */}
          <div className="card p-4">
            <label className="label">Region</label>
            {editing ? (
              <select
                value={editData.region ?? profile.region}
                onChange={(e) => setEditData({ ...editData, region: e.target.value })}
                className="input"
              >
                {REGIONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            ) : (
              <p className="text-gray-900 dark:text-white font-medium">{profile.region}</p>
            )}
          </div>

          {/* Platforms */}
          <div className="card p-4">
            <h3 className="font-bold text-gray-900 dark:text-white mb-3 text-sm">My Platforms</h3>
            {editing ? (
              <div className="space-y-2">
                {(Object.keys(PLATFORMS) as PlatformKey[]).map((key) => {
                  const platform = PLATFORMS[key];
                  const isSelected = (editData.platforms ?? []).includes(key);
                  return (
                    <div key={key} className={`border rounded-xl overflow-hidden transition-colors ${
                      isSelected ? 'border-emerald-500 bg-emerald-900/10' : 'border-gray-700 bg-gray-800/50'
                    }`}>
                      <button
                        type="button"
                        onClick={() => togglePlatform(key)}
                        className="w-full flex items-center gap-3 p-3 text-left"
                      >
                        <span className="text-lg">{platform.icon}</span>
                        <span className="font-medium text-gray-900 dark:text-white flex-1 text-sm">{platform.label}</span>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                          isSelected ? 'border-emerald-500 bg-emerald-500' : 'border-gray-600'
                        }`}>
                          {isSelected && <Check size={12} className="text-white" />}
                        </div>
                      </button>
                      {isSelected && (
                        <div className="px-3 pb-3">
                          <input
                            type="text"
                            value={(editData.game_ids ?? {})[key] ?? ''}
                            onChange={(e) =>
                              setEditData({
                                ...editData,
                                game_ids: { ...(editData.game_ids ?? {}), [key]: e.target.value },
                              })
                            }
                            placeholder={platform.placeholder}
                            className="input text-sm"
                          />
                          <p className="text-xs text-gray-500 mt-1">{platform.idLabel}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-2">
                {(profile.platforms ?? []).map((p) => (
                  <div key={p} className="flex items-center gap-2 py-1">
                    <span className="text-lg">{PLATFORMS[p]?.icon}</span>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{PLATFORMS[p]?.label}</span>
                    <span className="text-sm text-gray-400 ml-auto">{profile.game_ids?.[p] || 'Not set'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Selected Games */}
          <div className="card p-4">
            <h3 className="font-bold text-gray-900 dark:text-white mb-3 text-sm">My Games (max 3)</h3>
            {editing ? (
              <div className="space-y-2">
                {availableGames.map((gameKey) => {
                  const isSelected = (editData.selected_games ?? []).includes(gameKey);
                  return (
                    <button
                      key={gameKey}
                      type="button"
                      onClick={() => toggleGame(gameKey)}
                      className={`w-full flex items-center gap-3 p-2.5 rounded-xl border text-left transition-colors ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-900/10'
                          : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                      }`}
                    >
                      <div className="flex gap-0.5">
                        {GAMES[gameKey].platforms.map((p) => (
                          <span key={p} className="text-sm">{PLATFORMS[p]?.icon}</span>
                        ))}
                      </div>
                      <span className="font-medium text-gray-900 dark:text-white flex-1 text-sm">
                        {GAMES[gameKey].label}
                      </span>
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                        isSelected ? 'border-emerald-500 bg-emerald-500' : 'border-gray-600'
                      }`}>
                        {isSelected && <Check size={10} className="text-white" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-1.5">
                {(profile.selected_games ?? []).map((g) => (
                  <div key={g} className="flex items-center gap-2 py-1">
                    <div className="flex gap-0.5">
                      {GAMES[g]?.platforms.map((p) => (
                        <span key={p} className="text-sm">{PLATFORMS[p]?.icon}</span>
                      ))}
                    </div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{GAMES[g]?.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
