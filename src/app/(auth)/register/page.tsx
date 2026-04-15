'use client';

import Link from 'next/link';
import { useState } from 'react';
import toast from 'react-hot-toast';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Loader2,
} from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { GameCover } from '@/components/GameCover';
import { PlatformLogo } from '@/components/PlatformLogo';
import { FullScreenSignup } from '@/components/ui/full-screen-signup';
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
import { normalizePhoneNumber } from '@/lib/phone';
import type { GameKey, PlatformKey } from '@/types';

type Step = 1 | 2 | 3 | 4;
const FREE_GAME_LIMIT = 1;

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
  const { user, login } = useAuth();
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
  const emailIsValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim());

  const step1Valid =
    formData.username.trim().length >= 3 &&
    formData.phone.trim().length >= 9;
  const step2Valid =
    emailIsValid &&
    formData.region.trim().length > 0 &&
    formData.password.length >= 6;
  const setupPlatforms = getPlatformsForGameSetup(
    formData.selected_games,
    formData.game_ids,
    formData.platforms
  );
  const selectableGames = Object.keys(GAMES) as GameKey[];
  const requiredIdFields = formData.selected_games.reduce<
    Array<{ key: string; game: GameKey; platform: PlatformKey }>
  >((fields, game) => {
    const platform = getConfiguredPlatformForGame(game, formData.game_ids, setupPlatforms);
    if (!platform) return fields;

    const key = getGameIdKey(game, platform);
    if (!fields.some((field) => field.key === key)) {
      fields.push({ key, game, platform });
    }

    return fields;
  }, []);
  const hasMissingGamePlatform = formData.selected_games.some(
    (game) => !getConfiguredPlatformForGame(game, formData.game_ids, setupPlatforms)
  );
  const step3Valid = formData.selected_games.length > 0;
  const step4Valid = step3Valid && !hasMissingGamePlatform;

  const toggleGame = (game: GameKey) => {
    setFormData((prev) => {
      const hasGame = prev.selected_games.includes(game);
      if (!hasGame && prev.selected_games.length >= FREE_GAME_LIMIT) {
        toast.error('Free plan starts with 1 game. Upgrade later for 3.');
        return prev;
      }

      const nextGameIds = { ...prev.game_ids };
      if (hasGame) {
        delete nextGameIds[getGamePlatformKey(game)];
        for (const platform of GAMES[game]?.platforms ?? []) {
          if (platform === 'mobile') {
            delete nextGameIds[getGameIdKey(game, platform)];
          }
        }
      } else if (GAMES[game]?.platforms.length === 1) {
        nextGameIds[getGamePlatformKey(game)] =
          nextGameIds[getGamePlatformKey(game)] ?? GAMES[game].platforms[0];
      }

      const nextSelectedGames = hasGame
        ? prev.selected_games.filter((item) => item !== game)
        : [...prev.selected_games, game];
      const nextPlatforms = getPlatformsForGameSetup(nextSelectedGames, nextGameIds, prev.platforms);

      return {
        ...prev,
        platforms: nextPlatforms,
        game_ids: nextGameIds,
        selected_games: nextSelectedGames,
      };
    });
  };

  const selectPlatformForGame = (game: GameKey, platform: PlatformKey) => {
    setFormData((prev) => {
      const nextGameIds = {
        ...prev.game_ids,
        [getGamePlatformKey(game)]: platform,
      };

      return {
        ...prev,
        game_ids: nextGameIds,
        platforms: getPlatformsForGameSetup(prev.selected_games, nextGameIds, prev.platforms),
      };
    });
  };

  const handleSubmit = async () => {
    if (formData.selected_games.length === 0) {
      toast.error('Select at least 1 game');
      return;
    }

    const finalPlatforms = getPlatformsForGameSetup(
      formData.selected_games,
      formData.game_ids,
      formData.platforms
    );
    if (
      formData.selected_games.some(
        (game) => !getConfiguredPlatformForGame(game, formData.game_ids, finalPlatforms)
      )
    ) {
      toast.error('Choose a platform for each game');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          platforms: finalPlatforms,
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
      // Use a hard navigation so auth cookie guards see the latest cookie immediately.
      window.location.assign('/dashboard');
    } catch {
      toast.error('Network error.');
    } finally {
      setLoading(false);
    }
  };

  const STEP_LABELS = ['Basics', 'Details', 'Games', 'Platforms'];

  return (
    <FullScreenSignup
      title=""
      subtitle=""
      sideTitle="Join Mechi"
      sideDescription=""
      sidePoints={[
        'Start with 1 main game on Free',
        'Add only the IDs those games need',
        'Upgrade later to unlock up to 3 games',
      ]}
    >
      <div className="card p-5 sm:p-6">
            <div className="mb-6 grid grid-cols-4 gap-2">
              {([1, 2, 3, 4] as Step[]).map((currentStep) => (
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
                <div className="mt-4 space-y-4">
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
                <div className="mt-4 space-y-4">
                  <div>
                    <label className="label">Region</label>
                    <input
                      type="text"
                      list="register-region-options"
                      value={formData.region}
                      onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                      className="input"
                      placeholder="Type your region"
                    />
                    <datalist id="register-region-options">
                      {REGIONS.map((region) => (
                        <option key={region} value={region}>
                          {region}
                        </option>
                      ))}
                    </datalist>
                  </div>
                  <div>
                    <label className="label">Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="you@example.com"
                      className="input"
                      required
                    />
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
                      </div>
                    )}
                  </div>
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
                  Pick the games you want Mechi to organize for you.
                </p>
                <div className="mb-5 grid max-h-72 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2">
                  {selectableGames.map((gameKey) => {
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
                        <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg border border-[var(--border-color)] bg-[var(--surface)]">
                          <GameCover gameKey={gameKey} variant="header" className="h-full w-full" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-[var(--text-primary)]">{game.label}</span>
                          <div className="mt-1 flex gap-1">
                            {game.platforms.map((platform) => (
                              <PlatformLogo key={platform} platform={platform} size={12} />
                            ))}
                          </div>
                        </div>
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
                <p className="mb-4 text-center text-xs text-[var(--text-soft)]">
                  {formData.selected_games.length}/{FREE_GAME_LIMIT} selected on Free
                </p>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setStep(2)} className="btn-ghost flex-1">
                    <ChevronLeft size={14} /> Back
                  </button>
                  <button
                    type="button"
                    onClick={() => step3Valid && setStep(4)}
                    disabled={!step3Valid}
                    className="btn-primary flex-1"
                  >
                    Next <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}

            {step === 4 && (
              <div>
                <p className="section-title">Step 4</p>
                <h1 className="mb-1 mt-3 text-[1.9rem] font-black text-[var(--text-primary)]">
                  Set platform IDs
                </h1>
                <p className="mb-5 text-sm leading-6 text-[var(--text-secondary)]">
                  Choose a platform for each game, then add the IDs opponents will need.
                </p>
                <div className="mb-5 space-y-3">
                  {formData.selected_games.map((gameKey) => {
                    const game = GAMES[gameKey];
                    const selectedPlatform = getConfiguredPlatformForGame(
                      gameKey,
                      formData.game_ids,
                      formData.platforms
                    );

                    return (
                      <div
                        key={gameKey}
                        className="rounded-xl border border-[var(--border-color)] bg-[var(--surface-strong)] p-3"
                      >
                        <div className="mb-3 flex items-center gap-2">
                          <div className="h-10 w-10 overflow-hidden rounded-lg border border-[var(--border-color)] bg-[var(--surface)]">
                            <GameCover gameKey={gameKey} variant="header" className="h-full w-full" />
                          </div>
                          <p className="text-sm font-semibold text-[var(--text-primary)]">{game.label}</p>
                        </div>
                        {game.platforms.length > 1 ? (
                          <div className="flex flex-wrap gap-2">
                            {game.platforms.map((platform) => {
                              const isSelected = selectedPlatform === platform;

                              return (
                                <button
                                  key={platform}
                                  type="button"
                                  onClick={() => selectPlatformForGame(gameKey, platform)}
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
                            <PlatformLogo platform={game.platforms[0]} size={16} />
                            {PLATFORMS[game.platforms[0]]?.label}
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
                            value={getGameIdValue(formData.game_ids, field.game, field.platform)}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                game_ids: { ...formData.game_ids, [field.key]: e.target.value },
                              })
                            }
                            placeholder={getGameIdPlaceholder(field.game, field.platform)}
                            className="input text-sm"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setStep(3)} className="btn-ghost flex-1">
                    <ChevronLeft size={14} /> Back
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={loading || !step4Valid}
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
                href={user ? '/dashboard' : '/login'}
                className="brand-link-coral font-semibold"
              >
                Sign in
              </Link>
            </p>
      </div>
    </FullScreenSignup>
  );
}
