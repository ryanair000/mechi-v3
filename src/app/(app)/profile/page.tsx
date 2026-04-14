'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth, useAuthFetch } from '@/components/AuthProvider';
import { PLATFORMS, GAMES, REGIONS, getGamesForPlatforms, getTier } from '@/lib/config';
import type { PlatformKey, GameKey } from '@/types';
import toast from 'react-hot-toast';
import { Settings, BarChart2, Check, Loader2, LogOut } from 'lucide-react';
import { ShareMenu } from '@/components/ShareMenu';
import { profileShareText, getProfileShareUrl, getProfileOgImageUrl } from '@/lib/share';

interface Profile { [key: string]: unknown; }

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const authFetch = useAuthFetch();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<'stats' | 'settings'>('stats');

  const [region, setRegion] = useState('Nairobi');
  const [platforms, setPlatforms] = useState<PlatformKey[]>([]);
  const [gameIds, setGameIds] = useState<Record<string, string>>({});
  const [selectedGames, setSelectedGames] = useState<GameKey[]>([]);

  const fetchProfile = useCallback(async () => {
    const res = await authFetch('/api/users/profile');
    if (res.ok) {
      const d = await res.json();
      setProfile(d.profile);
      setRegion((d.profile.region as string) ?? 'Nairobi');
      setPlatforms((d.profile.platforms as PlatformKey[]) ?? []);
      setGameIds((d.profile.game_ids as Record<string, string>) ?? {});
      setSelectedGames((d.profile.selected_games as GameKey[]) ?? []);
    }
    setLoading(false);
  }, [authFetch]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const togglePlatform = (p: PlatformKey) => {
    setPlatforms((prev) => {
      const has = prev.includes(p);
      if (has) {
        setGameIds((ids) => { const n = { ...ids }; delete n[p]; return n; });
        setSelectedGames((gs) => gs.filter((g) => GAMES[g]?.platforms.some((pl) => prev.filter((x) => x !== p).includes(pl))));
        return prev.filter((x) => x !== p);
      }
      return [...prev, p];
    });
  };

  const toggleGame = (g: GameKey) => {
    setSelectedGames((prev) => {
      if (prev.includes(g)) return prev.filter((x) => x !== g);
      if (prev.length >= 3) { toast.error('Max 3 games'); return prev; }
      return [...prev, g];
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await authFetch('/api/users/profile', {
        method: 'PATCH',
        body: JSON.stringify({ region, platforms, game_ids: gameIds, selected_games: selectedGames }),
      });
      if (res.ok) { toast.success('Profile updated!'); fetchProfile(); }
      else { const d = await res.json(); toast.error(d.error ?? 'Failed to save'); }
    } catch { toast.error('Network error'); }
    finally { setSaving(false); }
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="max-w-2xl space-y-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-24 shimmer" />)}
        </div>
      </div>
    );
  }

  const selectedGamesForPlatforms = getGamesForPlatforms(platforms).filter((g) => GAMES[g].mode === '1v1');
  const userGames = (profile?.selected_games as GameKey[]) ?? [];
  const bestRating = userGames.reduce((best, g) => {
    const r = (profile?.[`rating_${g}`] as number) ?? 1000;
    return r > best ? r : best;
  }, 1000);
  const bestTier = getTier(bestRating);

  return (
    <div className="page-container">
      <div className="max-w-2xl">
        {/* Profile header */}
        <div className="card p-5 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 flex items-center justify-center text-xl font-bold text-emerald-400 flex-shrink-0">
              {user?.username?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold text-white truncate">{user?.username}</h1>
              <p className="text-xs text-white/25 mt-0.5">{profile?.region as string} · {(profile?.platforms as string[])?.length ?? 0} platforms</p>
              <div className="flex items-center gap-3 mt-2">
                <div className="flex gap-1.5">
                  {((profile?.platforms ?? []) as PlatformKey[]).map((p) => (
                    <span key={p} className="text-base" title={PLATFORMS[p]?.label}>{PLATFORMS[p]?.icon}</span>
                  ))}
                </div>
                {user?.username && (
                  <ShareMenu
                    text={profileShareText(user.username, bestTier.name, bestRating)}
                    url={getProfileShareUrl(user.username)}
                    title="My Mechi Profile"
                    imageUrl={getProfileOgImageUrl(user.username)}
                    imageFilename={`mechi-profile-${user.username}.png`}
                    variant="inline"
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-white/[0.03] rounded-xl mb-6">
          {(['stats', 'settings'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === t ? 'bg-white/[0.06] text-white' : 'text-white/30 hover:text-white/50'
              }`}>
              {t === 'stats' ? <BarChart2 size={14} /> : <Settings size={14} />}
              {t === 'stats' ? 'Stats' : 'Settings'}
            </button>
          ))}
        </div>

        {/* Stats tab */}
        {tab === 'stats' && (
          <div className="space-y-3">
            {userGames.length === 0 ? (
              <div className="text-center py-12 text-white/20">
                <p>No games selected yet</p>
                <button onClick={() => setTab('settings')} className="text-emerald-400 text-sm font-medium mt-2">
                  Go to Settings →
                </button>
              </div>
            ) : userGames.map((g) => {
              const rating = (profile?.[`rating_${g}`] as number) ?? 1000;
              const wins = (profile?.[`wins_${g}`] as number) ?? 0;
              const losses = (profile?.[`losses_${g}`] as number) ?? 0;
              const wr = wins + losses > 0 ? Math.round((wins / (wins + losses)) * 100) : 0;
              const tier = getTier(rating);
              return (
                <div key={g} className="card p-5">
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-semibold text-white text-sm">{GAMES[g].label}</p>
                    <div className="text-xs font-medium px-2.5 py-1 rounded-lg" style={{ background: tier.color + '15', color: tier.color }}>
                      {tier.name}
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-3 text-center">
                    <div><div className="text-lg font-bold text-white">{rating}</div><div className="text-[10px] text-white/20 uppercase">ELO</div></div>
                    <div><div className="text-lg font-bold text-emerald-400">{wins}</div><div className="text-[10px] text-white/20 uppercase">Wins</div></div>
                    <div><div className="text-lg font-bold text-red-400">{losses}</div><div className="text-[10px] text-white/20 uppercase">Losses</div></div>
                    <div><div className="text-lg font-bold text-blue-400">{wr}%</div><div className="text-[10px] text-white/20 uppercase">W/R</div></div>
                  </div>
                  {wins + losses > 0 && (
                    <div className="mt-3 h-1 rounded-full bg-white/[0.06] overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${wr}%` }} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Settings tab */}
        {tab === 'settings' && (
          <div className="space-y-5">
            <div>
              <label className="label">Region</label>
              <select value={region} onChange={(e) => setRegion(e.target.value)} className="input max-w-xs">
                {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            <div>
              <label className="label">Your Platforms</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(Object.keys(PLATFORMS) as PlatformKey[]).map((key) => {
                  const plat = PLATFORMS[key];
                  const isSel = platforms.includes(key);
                  return (
                    <div key={key} className={`border rounded-xl overflow-hidden transition-colors ${isSel ? 'border-emerald-500/30 bg-emerald-500/[0.04]' : 'border-white/[0.06] bg-white/[0.02]'}`}>
                      <button type="button" onClick={() => togglePlatform(key)} className="w-full flex items-center gap-3 p-3 text-left">
                        <span className="text-lg">{plat.icon}</span>
                        <span className="font-medium text-white flex-1 text-sm">{plat.label}</span>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${isSel ? 'border-emerald-500 bg-emerald-500' : 'border-white/15'}`}>
                          {isSel && <Check size={11} className="text-white" />}
                        </div>
                      </button>
                      {isSel && (
                        <div className="px-3 pb-3">
                          <input type="text" value={gameIds[key] ?? ''} placeholder={plat.placeholder}
                            onChange={(e) => setGameIds({ ...gameIds, [key]: e.target.value })} className="input text-sm" />
                          <p className="text-xs text-white/15 mt-1">{plat.idLabel}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {selectedGamesForPlatforms.length > 0 && (
              <div>
                <label className="label">Games to Play (max 3)</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {selectedGamesForPlatforms.map((g) => {
                    const isSel = selectedGames.includes(g);
                    return (
                      <button key={g} type="button" onClick={() => toggleGame(g)}
                        className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${isSel ? 'border-emerald-500/30 bg-emerald-500/[0.04]' : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]'}`}>
                        <div className="flex gap-1">
                          {GAMES[g].platforms.map((p) => <span key={p} className="text-sm">{PLATFORMS[p]?.icon}</span>)}
                        </div>
                        <span className="font-medium text-white flex-1 text-sm">{GAMES[g].label}</span>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${isSel ? 'border-emerald-500 bg-emerald-500' : 'border-white/15'}`}>
                          {isSel && <Check size={11} className="text-white" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-white/15 mt-2 text-center">{selectedGames.length}/3 games selected</p>
              </div>
            )}

            <button onClick={handleSave} disabled={saving} className="w-full btn-primary">
              {saving ? <><Loader2 size={14} className="animate-spin" /> Saving...</> : <><Check size={14} /> Save Changes</>}
            </button>

            <button onClick={logout} className="w-full btn-danger">
              <LogOut size={14} /> Sign Out
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
