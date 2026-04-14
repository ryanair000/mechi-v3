'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { PLATFORMS, GAMES, REGIONS, getGamesForPlatforms } from '@/lib/config';
import type { PlatformKey, GameKey } from '@/types';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Check, ChevronRight, ChevronLeft } from 'lucide-react';

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
}

export default function RegisterPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    username: '',
    phone: '',
    email: '',
    password: '',
    region: 'Nairobi',
    platforms: [],
    game_ids: {},
    selected_games: [],
  });

  // Step 1 validation
  const step1Valid =
    formData.username.trim().length >= 3 &&
    formData.phone.trim().length >= 9 &&
    formData.password.length >= 6;

  // Step 2 validation
  const step2Valid = formData.platforms.length > 0;

  // Available games for step 3 based on selected platforms
  const availableGames = getGamesForPlatforms(formData.platforms).filter(
    (g) => GAMES[g].mode === '1v1'
  );

  const togglePlatform = (platform: PlatformKey) => {
    setFormData((prev) => {
      const has = prev.platforms.includes(platform);
      const newPlatforms = has
        ? prev.platforms.filter((p) => p !== platform)
        : [...prev.platforms, platform];

      // Remove game IDs for removed platforms
      const newGameIds = { ...prev.game_ids };
      if (has) delete newGameIds[platform];

      // Remove selected games that no longer have a matching platform
      const newGames = prev.selected_games.filter((g) =>
        GAMES[g]?.platforms.some((p) => newPlatforms.includes(p))
      );

      return { ...prev, platforms: newPlatforms, game_ids: newGameIds, selected_games: newGames };
    });
  };

  const toggleGame = (game: GameKey) => {
    setFormData((prev) => {
      const has = prev.selected_games.includes(game);
      if (!has && prev.selected_games.length >= 3) {
        toast.error('Maximum 3 games allowed');
        return prev;
      }
      return {
        ...prev,
        selected_games: has
          ? prev.selected_games.filter((g) => g !== game)
          : [...prev.selected_games, game],
      };
    });
  };

  const handleSubmit = async () => {
    if (formData.selected_games.length === 0) {
      toast.error('Please select at least 1 game');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? 'Registration failed');
        return;
      }

      login(data.token, data.user);
      toast.success(`Welcome to Mechi, ${data.user.username}! 🎮`);
      router.push('/dashboard');
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-4 py-12">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 mb-6">
        <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center font-black text-white text-lg">
          M
        </div>
        <span className="font-black text-white text-2xl tracking-tight">Mechi</span>
      </Link>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6">
        {([1, 2, 3] as Step[]).map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                step > s
                  ? 'bg-emerald-600 text-white'
                  : step === s
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-800 text-gray-500'
              }`}
            >
              {step > s ? <Check size={14} /> : s}
            </div>
            {s < 3 && (
              <div
                className={`w-8 h-0.5 ${step > s ? 'bg-emerald-600' : 'bg-gray-800'}`}
              />
            )}
          </div>
        ))}
      </div>

      <div className="w-full max-w-sm">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          {/* STEP 1 */}
          {step === 1 && (
            <>
              <h1 className="text-xl font-bold text-white mb-1">Create account</h1>
              <p className="text-sm text-gray-400 mb-5">Your basic info</p>

              <div className="space-y-4">
                <div>
                  <label className="label text-gray-300">Username</label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="GameKing254"
                    className="input"
                    minLength={3}
                    maxLength={30}
                  />
                </div>

                <div>
                  <label className="label text-gray-300">Phone Number</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="0712345678"
                    className="input"
                  />
                </div>

                <div>
                  <label className="label text-gray-300">Email (optional)</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="you@example.com"
                    className="input"
                  />
                </div>

                <div>
                  <label className="label text-gray-300">Region</label>
                  <select
                    value={formData.region}
                    onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                    className="input"
                  >
                    {REGIONS.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label text-gray-300">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Min 6 characters"
                      className="input pr-10"
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => step1Valid && setStep(2)}
                  disabled={!step1Valid}
                  className="w-full btn-primary mt-2"
                >
                  Next <ChevronRight size={16} />
                </button>
              </div>
            </>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <>
              <h1 className="text-xl font-bold text-white mb-1">Your Platforms</h1>
              <p className="text-sm text-gray-400 mb-5">Select platforms you own and enter your IDs</p>

              <div className="space-y-3 mb-5">
                {(Object.keys(PLATFORMS) as PlatformKey[]).map((key) => {
                  const platform = PLATFORMS[key];
                  const isSelected = formData.platforms.includes(key);
                  return (
                    <div key={key} className={`border rounded-xl overflow-hidden transition-colors ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-900/10'
                        : 'border-gray-700 bg-gray-800/50'
                    }`}>
                      <button
                        type="button"
                        onClick={() => togglePlatform(key)}
                        className="w-full flex items-center gap-3 p-3 text-left"
                      >
                        <span className="text-xl">{platform.icon}</span>
                        <span className="font-medium text-white flex-1">{platform.label}</span>
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
                            value={formData.game_ids[key] ?? ''}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                game_ids: { ...formData.game_ids, [key]: e.target.value },
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

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="btn-ghost flex-1"
                >
                  <ChevronLeft size={16} /> Back
                </button>
                <button
                  onClick={() => step2Valid && setStep(3)}
                  disabled={!step2Valid}
                  className="btn-primary flex-1"
                >
                  Next <ChevronRight size={16} />
                </button>
              </div>
            </>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <>
              <h1 className="text-xl font-bold text-white mb-1">Your Games</h1>
              <p className="text-sm text-gray-400 mb-1">
                Select up to 3 games
              </p>
              <p className="text-xs text-gray-500 mb-5">
                Showing games for your platforms ({formData.platforms.map(p => PLATFORMS[p].label).join(', ')})
              </p>

              {availableGames.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No 1v1 games available for your platforms.</p>
                  <button onClick={() => setStep(2)} className="text-emerald-400 mt-2 text-sm">
                    Go back and add more platforms
                  </button>
                </div>
              ) : (
                <div className="space-y-2 mb-5 max-h-72 overflow-y-auto pr-1">
                  {availableGames.map((gameKey) => {
                    const game = GAMES[gameKey];
                    const isSelected = formData.selected_games.includes(gameKey);
                    return (
                      <button
                        key={gameKey}
                        type="button"
                        onClick={() => toggleGame(gameKey)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-colors ${
                          isSelected
                            ? 'border-emerald-500 bg-emerald-900/10'
                            : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                        }`}
                      >
                        <div className="flex gap-1">
                          {game.platforms.map((p) => (
                            <span key={p} className="text-base">
                              {PLATFORMS[p]?.icon}
                            </span>
                          ))}
                        </div>
                        <span className="font-medium text-white flex-1 text-sm">{game.label}</span>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                          isSelected ? 'border-emerald-500 bg-emerald-500' : 'border-gray-600'
                        }`}>
                          {isSelected && <Check size={12} className="text-white" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              <p className="text-xs text-gray-500 mb-4 text-center">
                {formData.selected_games.length}/3 games selected
              </p>

              <div className="flex gap-3">
                <button onClick={() => setStep(2)} className="btn-ghost flex-1">
                  <ChevronLeft size={16} /> Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading || formData.selected_games.length === 0}
                  className="btn-primary flex-1"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Creating...
                    </span>
                  ) : (
                    'Create Account'
                  )}
                </button>
              </div>
            </>
          )}
        </div>

        <p className="text-center text-gray-500 text-sm mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-emerald-400 font-semibold hover:text-emerald-300">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
