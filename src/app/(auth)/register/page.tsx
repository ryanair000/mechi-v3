'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Loader2,
} from 'lucide-react';
import { BrandLogo } from '@/components/BrandLogo';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useAuth } from '@/components/AuthProvider';
import { GAMES, PLATFORMS, REGIONS, getGamesForPlatforms } from '@/lib/config';
import { normalizePhoneNumber } from '@/lib/phone';
import type { GameKey, PlatformKey } from '@/types';

type Step = 1 | 2 | 3;

interface FormData {
  username: string;
  phone: string;
  email: string;
  whatsapp_notifications: boolean;
  whatsapp_number: string;
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
    whatsapp_notifications: false,
    whatsapp_number: '',
    password: '',
    region: 'Nairobi',
    platforms: [],
    game_ids: {},
    selected_games: [],
  });

  const step1Valid =
    formData.username.trim().length >= 3 &&
    formData.phone.trim().length >= 9 &&
    formData.password.length >= 6;
  const step2Valid = formData.platforms.length > 0;
  const availableGames = getGamesForPlatforms(formData.platforms).filter(
    (game) => GAMES[game].mode === '1v1'
  );

  const togglePlatform = (platform: PlatformKey) => {
    setFormData((prev) => {
      const hasPlatform = prev.platforms.includes(platform);
      const nextPlatforms = hasPlatform
        ? prev.platforms.filter((item) => item !== platform)
        : [...prev.platforms, platform];
      const nextGameIds = { ...prev.game_ids };

      if (hasPlatform) {
        delete nextGameIds[platform];
      }

      const nextGames = prev.selected_games.filter((game) =>
        GAMES[game]?.platforms.some((item) => nextPlatforms.includes(item))
      );

      return {
        ...prev,
        platforms: nextPlatforms,
        game_ids: nextGameIds,
        selected_games: nextGames,
      };
    });
  };

  const toggleGame = (game: GameKey) => {
    setFormData((prev) => {
      const hasGame = prev.selected_games.includes(game);
      if (!hasGame && prev.selected_games.length >= 3) {
        toast.error('Maximum 3 games');
        return prev;
      }

      return {
        ...prev,
        selected_games: hasGame
          ? prev.selected_games.filter((item) => item !== game)
          : [...prev.selected_games, game],
      };
    });
  };

  const handleSubmit = async () => {
    if (formData.selected_games.length === 0) {
      toast.error('Select at least 1 game');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          phone: normalizePhoneNumber(formData.phone),
          whatsapp_number: formData.whatsapp_number
            ? normalizePhoneNumber(formData.whatsapp_number)
            : normalizePhoneNumber(formData.phone),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? 'Registration failed');
        return;
      }
      login(data.token, data.user);
      toast.success(`Welcome to Mechi, ${data.user.username}!`);
      router.push('/dashboard');
    } catch {
      toast.error('Network error.');
    } finally {
      setLoading(false);
    }
  };

  const STEP_LABELS = ['Account', 'Platforms', 'Games'];

  return (
    <div className="page-base flex min-h-screen flex-col">
      <nav className="landing-shell flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center">
          <BrandLogo size="sm" />
        </Link>
        <ThemeToggle />
      </nav>

      <div className="flex flex-1 items-start px-4 pb-10 pt-4 sm:px-6 lg:items-center">
        <div className="mx-auto grid w-full max-w-5xl gap-6 xl:grid-cols-[minmax(0,0.92fr)_30rem]">
          <div className="hidden xl:block">
            <div className="card circuit-panel p-8">
              <BrandLogo size="md" showTagline />
              <h1 className="mt-6 max-w-md text-[2rem] font-black leading-tight text-[var(--text-primary)]">
                Set up once. Lock in fast.
              </h1>
              <p className="mt-3 max-w-md text-sm leading-6 text-[var(--text-secondary)]">
                Pick your setup, choose your games, and get a profile that keeps up with your grind.
              </p>

              <div className="mt-6 grid gap-2.5">
                {[
                  'Add the platforms you actually touch',
                  'Lock in up to three main games',
                  'Keep your whole grind in one profile',
                ].map((item, index) => (
                  <div
                    key={item}
                    className={`flex items-center gap-3 rounded-xl border px-3.5 py-3 ${
                      index === 1 ? 'surface-action' : 'surface-live'
                    }`}
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--surface-strong)]">
                      <Check
                        size={13}
                        className={index === 1 ? 'text-[var(--brand-coral)]' : 'text-[var(--brand-teal)]'}
                      />
                    </div>
                    <span className="text-sm font-semibold text-[var(--text-primary)]">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card p-5 sm:p-6">
            <div className="mb-6 grid grid-cols-3 gap-2">
              {([1, 2, 3] as Step[]).map((currentStep) => (
                <div
                  key={currentStep}
                  className="rounded-xl border border-[var(--border-color)] bg-[var(--surface-soft)] px-3 py-2.5"
                >
                  <div
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold transition-all ${
                      step >= currentStep
                        ? 'bg-[var(--brand-coral)] text-[var(--brand-night)]'
                        : 'bg-[rgba(95,109,130,0.12)] text-[var(--text-soft)]'
                    }`}
                  >
                    {step > currentStep ? <Check size={12} /> : currentStep}
                  </div>
                  <span
                    className={`mt-2 block text-[11px] font-semibold uppercase tracking-[0.12em] transition-colors ${
                      step === currentStep
                        ? 'text-[var(--text-primary)]'
                        : 'text-[var(--text-soft)]'
                    }`}
                  >
                    {STEP_LABELS[currentStep - 1]}
                  </span>
                </div>
              ))}
            </div>

            {step === 1 && (
              <div>
                <p className="section-title">Step 1</p>
                <h1 className="mb-1 mt-3 text-[1.9rem] font-black text-[var(--text-primary)]">
                  Create your account
                </h1>
                <p className="mb-5 text-sm leading-6 text-[var(--text-secondary)]">
                  Start with the essentials and we will build the rest with you.
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="label">Username</label>
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
                    <label className="label">Phone Number</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="0712 345 678"
                      className="input"
                      inputMode="tel"
                      onBlur={() =>
                        setFormData((current) => ({
                          ...current,
                          phone: normalizePhoneNumber(current.phone),
                        }))
                      }
                    />
                  </div>
                  <div className="rounded-xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4">
                    <label className="flex cursor-pointer items-start gap-3">
                      <div className="relative mt-0.5 flex-shrink-0">
                        <input
                          type="checkbox"
                          checked={formData.whatsapp_notifications}
                          onChange={(e) =>
                            setFormData((current) => ({
                              ...current,
                              whatsapp_notifications: e.target.checked,
                              whatsapp_number: e.target.checked
                                ? current.whatsapp_number || current.phone
                                : '',
                            }))
                          }
                          className="sr-only"
                        />
                        <div
                          className={`flex h-5 w-5 items-center justify-center rounded-md border-2 transition-colors ${
                            formData.whatsapp_notifications
                              ? 'border-[var(--brand-teal)] bg-[var(--brand-teal)]'
                              : 'border-[var(--border-strong)] bg-transparent'
                          }`}
                        >
                          {formData.whatsapp_notifications && <Check size={11} className="text-white" />}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[var(--text-primary)]">
                          WhatsApp match alerts
                        </p>
                        <p className="mt-0.5 text-xs text-[var(--text-soft)]">
                          Get notified when a match is found or a result is confirmed.
                        </p>
                      </div>
                    </label>

                    {formData.whatsapp_notifications && (
                      <div className="mt-3 border-t border-[var(--border-color)] pt-3">
                        <label className="label">WhatsApp Number</label>
                        <input
                          type="tel"
                          value={formData.whatsapp_number}
                          onChange={(e) => setFormData({ ...formData, whatsapp_number: e.target.value })}
                          placeholder="0712 345 678"
                          className="input"
                          inputMode="tel"
                        />
                        <p className="mt-1.5 text-xs text-[var(--text-soft)]">
                          Leave this as your main phone if you use the same number on WhatsApp.
                        </p>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="label">
                      Email <span className="font-normal text-[var(--text-soft)]">(optional)</span>
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="you@example.com"
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="label">Region</label>
                    <select
                      value={formData.region}
                      onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                      className="input"
                    >
                      {REGIONS.map((region) => (
                        <option key={region} value={region}>
                          {region}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Password</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        placeholder="Min 6 characters"
                        className="input pr-12"
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-[var(--text-soft)] transition-colors hover:text-[var(--text-primary)]"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => step1Valid && setStep(2)}
                    disabled={!step1Valid}
                    className="btn-primary mt-2 w-full"
                  >
                    Next <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div>
                <p className="section-title">Step 2</p>
                <h1 className="mb-1 mt-3 text-[1.9rem] font-black text-[var(--text-primary)]">
                  Choose your platforms
                </h1>
                <p className="mb-5 text-sm leading-6 text-[var(--text-secondary)]">
                  Tell Mechi where you actually play so your profile stays organized.
                </p>
                <div className="mb-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {(Object.keys(PLATFORMS) as PlatformKey[]).map((key) => {
                  const platform = PLATFORMS[key];
                  const isSelected = formData.platforms.includes(key);
                  return (
                    <div
                      key={key}
                      className={`overflow-hidden rounded-lg border transition-colors ${
                        isSelected
                          ? 'surface-live'
                          : 'border-[var(--border-color)] bg-[var(--surface-strong)]'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => togglePlatform(key)}
                        className="flex w-full items-center gap-3 p-2.5 text-left"
                      >
                        <span className="text-lg">{platform.icon}</span>
                        <span className="flex-1 text-sm font-medium text-[var(--text-primary)]">
                          {platform.label}
                        </span>
                        <div
                          className={`flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors ${
                            isSelected
                              ? 'border-[var(--brand-teal)] bg-[var(--brand-teal)]'
                              : 'border-[rgba(95,109,130,0.24)]'
                          }`}
                        >
                          {isSelected && <Check size={11} className="text-white" />}
                        </div>
                      </button>
                      {isSelected && (
                        <div className="px-2.5 pb-2.5">
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
                          <p className="mt-1 text-xs text-[var(--text-soft)]">{platform.idLabel}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setStep(1)} className="btn-ghost flex-1">
                    <ChevronLeft size={14} /> Back
                  </button>
                  <button
                    type="button"
                    onClick={() => step2Valid && setStep(3)}
                    disabled={!step2Valid}
                    className="btn-primary flex-1"
                  >
                    Next <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div>
                <p className="section-title">Step 3</p>
                <h1 className="mb-1 mt-3 text-[1.9rem] font-black text-[var(--text-primary)]">
                  Select your games
                </h1>
                <p className="mb-5 text-sm leading-6 text-[var(--text-secondary)]">
                  Choose up to three competitive titles so your ladder stays focused.
                </p>
              {availableGames.length === 0 ? (
                <div className="py-8 text-center text-[var(--text-soft)]">
                  <p className="text-sm">No 1v1 games for your platforms.</p>
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="brand-link mt-2 text-sm font-semibold"
                  >
                    Add more platforms
                  </button>
                </div>
              ) : (
                <div className="mb-5 grid max-h-72 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2">
                  {availableGames.map((gameKey) => {
                    const game = GAMES[gameKey];
                    const isSelected = formData.selected_games.includes(gameKey);
                    return (
                      <button
                        key={gameKey}
                        type="button"
                        onClick={() => toggleGame(gameKey)}
                        className={`flex items-center gap-3 rounded-lg border p-2.5 text-left transition-all ${
                          isSelected
                            ? 'surface-action'
                            : 'border-[var(--border-color)] bg-[var(--surface-strong)] hover:bg-[var(--surface)]'
                        }`}
                      >
                        <div className="flex gap-1">
                          {game.platforms.map((platform) => (
                            <span key={platform} className="text-sm">{PLATFORMS[platform]?.icon}</span>
                          ))}
                        </div>
                        <span className="flex-1 text-sm font-medium text-[var(--text-primary)]">{game.label}</span>
                        <div
                          className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
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
              )}
                <p className="mb-4 text-center text-xs text-[var(--text-soft)]">
                  {formData.selected_games.length}/3 selected
                </p>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setStep(2)} className="btn-ghost flex-1">
                    <ChevronLeft size={14} /> Back
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={loading || formData.selected_games.length === 0}
                    className="btn-primary flex-1"
                  >
                    {loading ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Create Account'
                    )}
                  </button>
                </div>
              </div>
            )}

            <p className="mt-6 text-center text-sm text-[var(--text-soft)]">
              Already have an account?{' '}
              <Link
                href="/login"
                className="brand-link-coral font-semibold"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
