'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { PLATFORMS, GAMES, REGIONS, getGamesForPlatforms } from '@/lib/config';
import type { PlatformKey, GameKey } from '@/types';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Check, ChevronRight, ChevronLeft, Loader2 } from 'lucide-react';

type Step = 1 | 2 | 3;

interface FormData {
  username: string;
  phone: string;
  email: string;
  password: string;
  region: string;
  platforms: PlatformKey[];
  game_ids: Record<string, string>;
  selected_games: GameKey[];
  whatsapp_notifications: boolean;
  whatsapp_number: string;
}

export default function RegisterPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    username: '', phone: '', email: '', password: '', region: 'Nairobi',
    platforms: [], game_ids: {}, selected_games: [],
    whatsapp_notifications: false, whatsapp_number: '',
  });

  const step1Valid = formData.username.trim().length >= 3 && formData.phone.trim().length >= 9 && formData.password.length >= 6;
  const step2Valid = formData.platforms.length > 0;
  const availableGames = getGamesForPlatforms(formData.platforms).filter((g) => GAMES[g].mode === '1v1');

  const togglePlatform = (platform: PlatformKey) => {
    setFormData((prev) => {
      const has = prev.platforms.includes(platform);
      const newPlatforms = has ? prev.platforms.filter((p) => p !== platform) : [...prev.platforms, platform];
      const newGameIds = { ...prev.game_ids };
      if (has) delete newGameIds[platform];
      const newGames = prev.selected_games.filter((g) => GAMES[g]?.platforms.some((p) => newPlatforms.includes(p)));
      return { ...prev, platforms: newPlatforms, game_ids: newGameIds, selected_games: newGames };
    });
  };

  const toggleGame = (game: GameKey) => {
    setFormData((prev) => {
      const has = prev.selected_games.includes(game);
      if (!has && prev.selected_games.length >= 3) { toast.error('Maximum 3 games'); return prev; }
      return { ...prev, selected_games: has ? prev.selected_games.filter((g) => g !== game) : [...prev.selected_games, game] };
    });
  };

  const handleSubmit = async () => {
    if (formData.selected_games.length === 0) { toast.error('Select at least 1 game'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? 'Registration failed'); return; }
      login(data.token, data.user);
      toast.success(`Welcome to Mechi, ${data.user.username}!`);
      router.push('/dashboard');
    } catch { toast.error('Network error.'); }
    finally { setLoading(false); }
  };

  const STEP_LABELS = ['Account', 'Platforms', 'Games'];

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Nav */}
      <nav className="px-5 sm:px-8 h-16 flex items-center">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center font-bold text-white text-xs">M</div>
          <span className="font-bold text-white text-sm tracking-tight">Mechi</span>
        </Link>
      </nav>

      <div className="flex-1 flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-md">
          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-8">
            {([1, 2, 3] as Step[]).map((s) => (
              <div key={s} className="flex items-center gap-2 flex-1">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
                  step >= s ? 'bg-emerald-500 text-white' : 'bg-white/[0.06] text-white/20'
                }`}>
                  {step > s ? <Check size={12} /> : s}
                </div>
                <span className={`text-xs font-medium transition-colors ${step === s ? 'text-white' : 'text-white/20'}`}>
                  {STEP_LABELS[s - 1]}
                </span>
                {s < 3 && <div className={`flex-1 h-px ${step > s ? 'bg-emerald-500' : 'bg-white/[0.06]'}`} />}
              </div>
            ))}
          </div>

          {/* Step 1 */}
          {step === 1 && (
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">Create account</h1>
              <p className="text-white/30 text-sm mb-6">Your basic info to get started</p>

              <div className="space-y-4">
                <div>
                  <label className="label">Username</label>
                  <input type="text" value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="GameKing254" className="input" minLength={3} maxLength={30} />
                </div>
                <div>
                  <label className="label">Phone Number</label>
                  <input type="tel" value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="0712 345 678" className="input" inputMode="tel" />
                </div>
                {/* WhatsApp opt-in */}
                <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <div className="relative mt-0.5 flex-shrink-0">
                      <input
                        type="checkbox"
                        checked={formData.whatsapp_notifications}
                        onChange={(e) => setFormData({
                          ...formData,
                          whatsapp_notifications: e.target.checked,
                          whatsapp_number: e.target.checked ? formData.phone : '',
                        })}
                        className="sr-only"
                      />
                      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                        formData.whatsapp_notifications ? 'border-green-500 bg-green-500' : 'border-white/20'
                      }`}>
                        {formData.whatsapp_notifications && <Check size={11} className="text-white" />}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">📲 WhatsApp match alerts</p>
                      <p className="text-xs text-white/30 mt-0.5">Get notified when a match is found or result is confirmed</p>
                    </div>
                  </label>
                  {formData.whatsapp_notifications && (
                    <div className="mt-3 pt-3 border-t border-white/[0.06]">
                      <label className="label">WhatsApp Number</label>
                      <input
                        type="tel"
                        value={formData.whatsapp_number}
                        onChange={(e) => setFormData({ ...formData, whatsapp_number: e.target.value })}
                        placeholder="0712 345 678"
                        className="input"
                        inputMode="tel"
                      />
                      <p className="text-xs text-white/20 mt-1.5">Leave as-is if same as your phone above</p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="label">Email <span className="text-white/15 font-normal">(optional — for match notifications)</span></label>
                  <input type="email" value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="you@example.com" className="input" />
                </div>
                <div>
                  <label className="label">Region</label>
                  <select value={formData.region} onChange={(e) => setFormData({ ...formData, region: e.target.value })} className="input">
                    {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Password</label>
                  <div className="relative">
                    <input type={showPassword ? 'text' : 'password'} value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Min 6 characters" className="input pr-12" minLength={6} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/40 p-1.5 transition-colors">
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <button onClick={() => step1Valid && setStep(2)} disabled={!step1Valid} className="w-full btn-primary mt-2">
                  Next <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">Your Platforms</h1>
              <p className="text-white/30 text-sm mb-6">Select what you play on</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-5">
                {(Object.keys(PLATFORMS) as PlatformKey[]).map((key) => {
                  const platform = PLATFORMS[key];
                  const isSelected = formData.platforms.includes(key);
                  return (
                    <div key={key} className={`border rounded-xl overflow-hidden transition-colors ${
                      isSelected ? 'border-emerald-500/30 bg-emerald-500/[0.04]' : 'border-white/[0.06] bg-white/[0.02]'
                    }`}>
                      <button type="button" onClick={() => togglePlatform(key)} className="w-full flex items-center gap-3 p-3 text-left">
                        <span className="text-lg">{platform.icon}</span>
                        <span className="font-medium text-white flex-1 text-sm">{platform.label}</span>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                          isSelected ? 'border-emerald-500 bg-emerald-500' : 'border-white/15'
                        }`}>
                          {isSelected && <Check size={11} className="text-white" />}
                        </div>
                      </button>
                      {isSelected && (
                        <div className="px-3 pb-3">
                          <input type="text" value={formData.game_ids[key] ?? ''}
                            onChange={(e) => setFormData({ ...formData, game_ids: { ...formData.game_ids, [key]: e.target.value } })}
                            placeholder={platform.placeholder} className="input text-sm" />
                          <p className="text-xs text-white/15 mt-1">{platform.idLabel}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="btn-ghost flex-1"><ChevronLeft size={14} /> Back</button>
                <button onClick={() => step2Valid && setStep(3)} disabled={!step2Valid} className="btn-primary flex-1">Next <ChevronRight size={14} /></button>
              </div>
            </div>
          )}

          {/* Step 3 */}
          {step === 3 && (
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">Your Games</h1>
              <p className="text-white/30 text-sm mb-6">Select up to 3 games to compete in</p>
              {availableGames.length === 0 ? (
                <div className="text-center py-8 text-white/20">
                  <p className="text-sm">No 1v1 games for your platforms.</p>
                  <button onClick={() => setStep(2)} className="text-emerald-400 mt-2 text-sm font-medium">Add more platforms</button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-5 max-h-80 overflow-y-auto">
                  {availableGames.map((gameKey) => {
                    const game = GAMES[gameKey];
                    const isSelected = formData.selected_games.includes(gameKey);
                    return (
                      <button key={gameKey} type="button" onClick={() => toggleGame(gameKey)}
                        className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                          isSelected ? 'border-emerald-500/30 bg-emerald-500/[0.04]' : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]'
                        }`}>
                        <div className="flex gap-1">
                          {game.platforms.map((p) => <span key={p} className="text-sm">{PLATFORMS[p]?.icon}</span>)}
                        </div>
                        <span className="font-medium text-white flex-1 text-sm">{game.label}</span>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                          isSelected ? 'border-emerald-500 bg-emerald-500' : 'border-white/15'
                        }`}>
                          {isSelected && <Check size={11} className="text-white" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
              <p className="text-xs text-white/15 mb-4 text-center">{formData.selected_games.length}/3 selected</p>
              <div className="flex gap-3">
                <button onClick={() => setStep(2)} className="btn-ghost flex-1"><ChevronLeft size={14} /> Back</button>
                <button onClick={handleSubmit} disabled={loading || formData.selected_games.length === 0} className="btn-primary flex-1">
                  {loading ? <><Loader2 size={14} className="animate-spin" /> Creating...</> : 'Create Account'}
                </button>
              </div>
            </div>
          )}

          <p className="text-center text-white/20 text-sm mt-8">
            Already have an account?{' '}
            <Link href="/login" className="text-emerald-400 font-semibold hover:text-emerald-300 transition-colors">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
