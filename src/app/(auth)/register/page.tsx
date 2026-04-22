'use client';

import Link from 'next/link';
import { use, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Loader2,
} from 'lucide-react';
import { ActionFeedback, type ActionFeedbackState } from '@/components/ActionFeedback';
import { useAuth } from '@/components/AuthProvider';
import { GameCover } from '@/components/GameCover';
import { PlatformLogo } from '@/components/PlatformLogo';
import { FullScreenSignup } from '@/components/ui/full-screen-signup';
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
} from '@/lib/config';
import type { InvitePreview } from '@/lib/invite';
import { normalizeInviteCode } from '@/lib/invite';
import { COUNTRY_OPTIONS, getRegionsForCountry } from '@/lib/location';
import { getLoginPath, getSafeNextPath } from '@/lib/navigation';
import { normalizePhoneNumber } from '@/lib/phone';
import { PLANS } from '@/lib/plans';
import type { CountryKey, GameKey, PlatformKey } from '@/types';

type Step = 1 | 2 | 3 | 4;
const STARTER_TRIAL_GAME_LIMIT = PLANS.pro.maxGames;
const MIN_PASSWORD_LENGTH = 9;
type RegisterSearchParams = Promise<{ [key: string]: string | string[] | undefined }>;
const STEP_LABELS = ['Account', 'Security', 'Games', 'IDs'] as const;

const STEP_META: Record<
  Step,
  {
    title: string;
    subtitle: string;
    sideTitle: string;
    sideDescription: string;
    sidePoints: string[];
    progressSummary: string;
    continueLabel: string;
  }
> = {
  1: {
    title: 'Create your account.',
    subtitle:
      'Start with the details other players will recognise and the contacts you will use to sign in or recover the account.',
    sideTitle: 'Keep the start simple.',
    sideDescription:
      'The first step is only about the essentials so the rest of setup feels lighter.',
    sidePoints: [
      'Choose a username players can recognise quickly',
      'Use the phone number you want for sign-in alerts',
      'Add an email you can access for recovery and updates',
    ],
    progressSummary: 'Set your public identity and recovery contacts first.',
    continueLabel: 'Continue to security',
  },
  2: {
    title: 'Lock in your location and password.',
    subtitle:
      'Tell Mechi where you play from, choose a strong password, and decide if WhatsApp alerts should follow this account.',
    sideTitle: 'Security without friction.',
    sideDescription:
      'This step keeps sign-in safer and helps Mechi place you in the right local lane.',
    sidePoints: [
      'Choose your country and region for cleaner local matchmaking',
      'Use 9 or more characters for a stronger password',
      'WhatsApp alerts stay optional and can mirror your main phone',
    ],
    progressSummary: 'Protect the account and set the right local matchmaking lane.',
    continueLabel: 'Continue to games',
  },
  3: {
    title: 'Choose the games you want first.',
    subtitle:
      'Pick the titles you want Mechi to organise for your starter Pro trial. You can keep it focused and expand later.',
    sideTitle: 'Start with your main lanes.',
    sideDescription:
      'Focused setup is faster to finish and gives you cleaner queues on day one.',
    sidePoints: [
      `Pick up to ${STARTER_TRIAL_GAME_LIMIT} games for your starter setup`,
      'Keep the list to the titles you actually want to queue first',
      'Every selected game will ask for one matching platform ID next',
    ],
    progressSummary: 'Choose up to three games for the first version of your profile.',
    continueLabel: 'Continue to IDs',
  },
  4: {
    title: 'Add the IDs opponents will need.',
    subtitle:
      'Finish the setup by matching each selected game to the platform you use and the handle other players should search for.',
    sideTitle: 'One clean finish.',
    sideDescription:
      'This is the last step before your account goes live and your Pro trial starts.',
    sidePoints: [
      'Pick the platform you actually use for each selected game',
      'Add the exact handle opponents will search for',
      'Your 1-month Pro trial starts as soon as you create the account',
    ],
    progressSummary: 'Match every chosen game to the right platform and player ID.',
    continueLabel: 'Create Account',
  },
};

interface FormData {
  username: string;
  phone: string;
  email: string;
  whatsapp_notifications: boolean;
  whatsapp_number: string;
  password: string;
  country: CountryKey | '';
  region: string;
  platforms: PlatformKey[];
  game_ids: Record<string, string>;
  selected_games: GameKey[];
}

export default function RegisterPage({ searchParams }: { searchParams: RegisterSearchParams }) {
  const { user, login } = useAuth();
  const resolvedSearchParams = use(searchParams);
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [invitePreview, setInvitePreview] = useState<InvitePreview | null>(null);
  const [submitFeedback, setSubmitFeedback] = useState<ActionFeedbackState | null>(null);

  const [formData, setFormData] = useState<FormData>({
    username: '',
    phone: '',
    email: '',
    whatsapp_notifications: false,
    whatsapp_number: '',
    password: '',
    country: '',
    region: '',
    platforms: [],
    game_ids: {},
    selected_games: [],
  });
  const emailIsValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim());
  const rawInviteValue = resolvedSearchParams.invite;
  const rawInviteCode =
    typeof rawInviteValue === 'string'
      ? rawInviteValue
      : Array.isArray(rawInviteValue)
        ? rawInviteValue[0] ?? null
        : null;
  const normalizedInviteCode = normalizeInviteCode(rawInviteCode);
  const rawNextValue = resolvedSearchParams.next;
  const rawNext =
    typeof rawNextValue === 'string'
      ? rawNextValue
      : Array.isArray(rawNextValue)
        ? rawNextValue[0] ?? null
        : null;
  const nextPath = getSafeNextPath(rawNext);
  const loginHref = getLoginPath(rawNext ? nextPath : null);
  const currentStepMeta = STEP_META[step];

  useEffect(() => {
    if (!normalizedInviteCode) {
      setInvitePreview(null);
      return;
    }

    const inviteCode = normalizedInviteCode;
    let cancelled = false;

    async function loadInvite() {
      try {
        const res = await fetch(`/api/invite/${encodeURIComponent(inviteCode)}`);
        if (!res.ok) {
          if (!cancelled) {
            setInvitePreview(null);
          }
          return;
        }

        const data = await res.json();
        if (!cancelled) {
          setInvitePreview((data.inviter as InvitePreview | undefined) ?? null);
        }
      } catch {
        if (!cancelled) {
          setInvitePreview(null);
        }
      }
    }

    void loadInvite();

    return () => {
      cancelled = true;
    };
  }, [normalizedInviteCode]);

  const step1Valid =
    formData.username.trim().length >= 3 &&
    formData.phone.trim().length >= 9 &&
    emailIsValid;
  const step2Valid =
    Boolean(formData.country) &&
    formData.region.trim().length > 0 &&
    formData.password.length >= MIN_PASSWORD_LENGTH;
  const availableRegions = getRegionsForCountry(formData.country || null);
  const setupPlatforms = getPlatformsForGameSetup(
    formData.selected_games,
    formData.game_ids,
    formData.platforms
  );
  const selectableGames = getSelectableGameKeys();
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
  const hasMissingRequiredIds = requiredIdFields.some(
    (field) => !getGameIdValue(formData.game_ids, field.game, field.platform).trim()
  );
  const step3Valid = formData.selected_games.length > 0;
  const step4Valid = step3Valid && !hasMissingGamePlatform && !hasMissingRequiredIds;

  const toggleGame = (game: GameKey) => {
    setFormData((prev) => {
      const hasGame = prev.selected_games.includes(game);
      if (!hasGame && prev.selected_games.length >= STARTER_TRIAL_GAME_LIMIT) {
        toast.error(`Your Pro trial starts with up to ${STARTER_TRIAL_GAME_LIMIT} games.`);
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
      } else {
        const [defaultPlatform] = GAMES[game]?.platforms ?? [];
        if (defaultPlatform) {
          nextGameIds[getGamePlatformKey(game)] =
            nextGameIds[getGamePlatformKey(game)] ?? defaultPlatform;
        }
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
      setSubmitFeedback({
        tone: 'error',
        title: 'Choose at least one game before you create your account.',
        detail: 'Your Pro trial starts with the games you lock in here.',
      });
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
      setSubmitFeedback({
        tone: 'error',
        title: 'Every selected game needs a platform.',
        detail: 'Pick the platform you actually play on so Mechi can match you correctly.',
      });
      toast.error('Choose a platform for each game');
      return;
    }
    if (
      formData.selected_games.some((game) => {
        const platform = getConfiguredPlatformForGame(game, formData.game_ids, finalPlatforms);
        return !platform || !getGameIdValue(formData.game_ids, game, platform).trim();
      })
    ) {
      setSubmitFeedback({
        tone: 'error',
        title: 'Some game IDs are still missing.',
        detail: 'Add the IDs opponents need before you finish registration.',
      });
      toast.error('Add the game IDs opponents will need');
      return;
    }

    setLoading(true);
    setSubmitFeedback({
      tone: 'loading',
      title: 'Creating your Mechi account...',
      detail: "We're saving your profile, game setup, and Pro trial access now.",
    });
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          invite_code: invitePreview?.invite_code ?? null,
          platforms: finalPlatforms,
          phone: normalizePhoneNumber(formData.phone, formData.country || null),
          whatsapp_number: formData.whatsapp_number
            ? normalizePhoneNumber(formData.whatsapp_number, formData.country || null)
            : normalizePhoneNumber(formData.phone, formData.country || null),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubmitFeedback({
          tone: 'error',
          title: 'Registration did not go through.',
          detail: data.error ?? 'Please check your details and try again.',
        });
        toast.error(data.error ?? 'Registration failed');
        return;
      }
      login(data.token, data.user);
      setSubmitFeedback({
        tone: 'success',
        title: `Welcome to Mechi, ${data.user.username}.`,
        detail: 'Your Pro trial is live. Taking you into the app now.',
      });
      toast.success(`Welcome to Mechi, ${data.user.username}! Your Pro trial is active.`);
      // Use a hard navigation so auth cookie guards see the latest cookie immediately.
      window.location.assign(nextPath);
    } catch {
      setSubmitFeedback({
        tone: 'error',
        title: 'We could not reach the server.',
        detail: 'Your account was not created. Check your connection and try again.',
      });
      toast.error('Network error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <FullScreenSignup
      title={currentStepMeta.title}
      subtitle={currentStepMeta.subtitle}
      sideTitle={currentStepMeta.sideTitle}
      sideDescription={currentStepMeta.sideDescription}
      sidePoints={currentStepMeta.sidePoints}
    >
      <div className="space-y-5">
        <div className="subtle-card p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="section-title !mb-0">Step {step} of 4</p>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                {currentStepMeta.progressSummary}
              </p>
            </div>
            <span className="rounded-full border border-[rgba(50,224,196,0.2)] bg-[rgba(50,224,196,0.08)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--accent-secondary-text)]">
              {Math.round((step / 4) * 100)}% complete
            </span>
          </div>

          <div className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--surface-soft)]">
            <div
              className="h-full rounded-full bg-[var(--brand-coral)] transition-all duration-300"
              style={{ width: `${(step / 4) * 100}%` }}
            />
          </div>

          <div className="mt-4 grid grid-cols-4 gap-2">
            {([1, 2, 3, 4] as Step[]).map((currentStep) => {
              const isActive = step === currentStep;
              const isComplete = step > currentStep;

              return (
                <div
                  key={currentStep}
                  className={`rounded-xl border px-3 py-3 transition-all ${
                    isActive
                      ? 'border-[rgba(50,224,196,0.24)] bg-[rgba(50,224,196,0.08)]'
                      : isComplete
                        ? 'border-[rgba(255,107,107,0.18)] bg-[rgba(255,107,107,0.06)]'
                        : 'border-[var(--border-color)] bg-[var(--surface-soft)]'
                  }`}
                >
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold transition-all ${
                      isActive || isComplete
                        ? 'bg-[var(--brand-coral)] text-[var(--brand-night)]'
                        : 'bg-[rgba(95,109,130,0.12)] text-[var(--text-soft)]'
                    }`}
                  >
                    {isComplete ? <Check size={12} /> : `0${currentStep}`}
                  </div>
                  <span
                    className={`mt-2 block text-[10px] font-semibold uppercase tracking-[0.12em] transition-colors sm:text-[11px] ${
                      isActive ? 'text-[var(--text-primary)]' : 'text-[var(--text-soft)]'
                    }`}
                  >
                    {STEP_LABELS[currentStep - 1]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {invitePreview ? (
          <div className="rounded-xl border border-[rgba(50,224,196,0.2)] bg-[rgba(50,224,196,0.08)] px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--accent-secondary-text)]">
              Invite Active
            </p>
            <p className="mt-1 text-sm text-[var(--text-primary)]">
              Invited by <span className="font-semibold">{invitePreview.username}</span>
            </p>
          </div>
        ) : null}

        {step === 1 && (
          <div className="space-y-5">
            <div>
              <label htmlFor="register-username" className="label">
                Username
              </label>
              <input
                id="register-username"
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="GameKing254"
                className="input"
                minLength={3}
                maxLength={30}
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                autoFocus
              />
              <p className="mt-2 text-xs text-[var(--text-soft)]">
                This is the name players will notice first in ladders, queues, and match alerts.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="register-phone" className="label">
                  Phone Number
                </label>
                <input
                  id="register-phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="0712 345 678"
                  className="input"
                  inputMode="tel"
                  autoComplete="tel"
                  onBlur={() =>
                    setFormData((current) => ({
                      ...current,
                      phone: normalizePhoneNumber(current.phone, current.country || null),
                    }))
                  }
                />
                <p className="mt-2 text-xs text-[var(--text-soft)]">
                  Use the number you want for sign-in and important account alerts.
                </p>
              </div>

              <div>
                <label htmlFor="register-email" className="label">
                  Email
                </label>
                <input
                  id="register-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="you@example.com"
                  className="input"
                  required
                  autoComplete="email"
                  autoCapitalize="none"
                  spellCheck={false}
                />
                <p className="mt-2 text-xs text-[var(--text-soft)]">
                  We will use this for receipts, password recovery, and optional email sign-in links.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => step1Valid && setStep(2)}
              disabled={!step1Valid}
              className="btn-primary w-full"
            >
              {STEP_META[1].continueLabel} <ChevronRight size={14} />
            </button>
          </div>
        )}

        {step === 2 && (
          <div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="register-country" className="label">
                  Country
                </label>
                <select
                  id="register-country"
                  value={formData.country}
                  onChange={(e) =>
                    setFormData((current) => ({
                      ...current,
                      country: e.target.value as CountryKey | '',
                      region: '',
                    }))
                  }
                  className="input"
                >
                  <option value="">Select country</option>
                  {COUNTRY_OPTIONS.map((option) => (
                    <option key={option.key} value={option.key}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="register-region" className="label">
                  Region
                </label>
                <select
                  id="register-region"
                  value={formData.region}
                  onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                  className="input"
                  disabled={!formData.country}
                >
                  <option value="">
                    {formData.country ? 'Select region' : 'Choose country first'}
                  </option>
                  {availableRegions.map((region) => (
                    <option key={region} value={region}>
                      {region}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-xs text-[var(--text-soft)]">
                  Pick where you mainly play so Mechi can place you in the right local lane.
                </p>
              </div>
            </div>

            <div className="mt-4">
              <label htmlFor="register-password" className="label">
                Password
              </label>
              <div className="relative">
                <input
                  id="register-password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Use at least 9 characters"
                  className="input pr-12"
                  minLength={MIN_PASSWORD_LENGTH}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-[var(--text-soft)] transition-colors hover:text-[var(--text-primary)]"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <p
                className={`mt-2 text-xs ${
                  formData.password.length > 0 && formData.password.length < MIN_PASSWORD_LENGTH
                    ? 'text-[var(--brand-coral)]'
                    : 'text-[var(--text-soft)]'
                }`}
              >
                Use 9 or more characters to keep the account secure.
              </p>
            </div>

            <div className="subtle-card mt-4 p-4">
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
                    className={`flex h-6 w-6 items-center justify-center rounded-md border-2 transition-colors ${
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
                  <label htmlFor="register-whatsapp" className="label">
                    WhatsApp Number
                  </label>
                  <input
                    id="register-whatsapp"
                    type="tel"
                    value={formData.whatsapp_number}
                    onChange={(e) => setFormData({ ...formData, whatsapp_number: e.target.value })}
                    placeholder="0712 345 678"
                    className="input"
                    inputMode="tel"
                    autoComplete="tel"
                  />
                </div>
              )}
            </div>

            <div className="mt-5 flex gap-3">
              <button type="button" onClick={() => setStep(1)} className="btn-ghost flex-1">
                <ChevronLeft size={14} /> Back
              </button>
              <button
                type="button"
                onClick={() => step2Valid && setStep(3)}
                disabled={!step2Valid}
                className="btn-primary flex-1"
              >
                {STEP_META[2].continueLabel} <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <div className="subtle-card mb-5 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="section-title !mb-0">
                    Pick up to {STARTER_TRIAL_GAME_LIMIT} games
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                    Start with the titles you want Mechi to organise first. You can keep the setup
                    focused now and refine it later.
                  </p>
                </div>
                <span className="rounded-full border border-[var(--border-color)] bg-[var(--surface-strong)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                  {formData.selected_games.length}/{STARTER_TRIAL_GAME_LIMIT} selected
                </span>
              </div>
            </div>

            <div className="mb-5 grid max-h-none grid-cols-1 gap-2.5 sm:max-h-72 sm:grid-cols-2 sm:overflow-y-auto">
              {selectableGames.map((gameKey) => {
                const game = GAMES[gameKey];
                const isSelected = formData.selected_games.includes(gameKey);

                return (
                  <button
                    key={gameKey}
                    type="button"
                    onClick={() => toggleGame(gameKey)}
                    className={`flex min-h-16 items-center gap-3 rounded-lg border p-3 text-left transition-all ${
                      isSelected
                        ? 'surface-action'
                        : 'border-[var(--border-color)] bg-[var(--surface-strong)] hover:bg-[var(--surface)]'
                    }`}
                  >
                    <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg border border-[var(--border-color)] bg-[var(--surface)]">
                      <GameCover gameKey={gameKey} variant="header" className="h-full w-full" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span
                        className="block whitespace-normal text-sm font-medium leading-snug text-[var(--text-primary)]"
                        title={game.label}
                      >
                        {game.label}
                      </span>
                      <div className="mt-1 flex gap-1">
                        {game.platforms.map((platform) => (
                          <PlatformLogo key={platform} platform={platform} size={12} />
                        ))}
                      </div>
                    </div>
                    <div
                      className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
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
                {STEP_META[3].continueLabel} <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div>
            <div className="subtle-card mb-5 p-4">
              <p className="section-title !mb-0">Add one usable ID per game</p>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                Pick the exact platform you use, then add the handle opponents should search for
                there.
              </p>
            </div>

            <div className="mb-5 space-y-3">
              {formData.selected_games.map((gameKey) => {
                const game = GAMES[gameKey];
                const selectedPlatform = getConfiguredPlatformForGame(
                  gameKey,
                  formData.game_ids,
                  formData.platforms
                );
                const selectedGameId = selectedPlatform
                  ? getGameIdValue(formData.game_ids, gameKey, selectedPlatform)
                  : '';
                const isReady = Boolean(selectedPlatform && selectedGameId.trim());

                return (
                  <div key={gameKey} className="subtle-card p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 overflow-hidden rounded-lg border border-[var(--border-color)] bg-[var(--surface)]">
                          <GameCover gameKey={gameKey} variant="header" className="h-full w-full" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-[var(--text-primary)]">
                            {game.label}
                          </p>
                          <p className="mt-1 text-xs text-[var(--text-soft)]">
                            Choose the platform you actually play on.
                          </p>
                        </div>
                      </div>

                      <span
                        className={`rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] ${
                          isReady
                            ? 'border border-[rgba(50,224,196,0.24)] bg-[rgba(50,224,196,0.1)] text-[var(--accent-secondary-text)]'
                            : 'border border-[var(--border-color)] bg-[var(--surface-strong)] text-[var(--text-soft)]'
                        }`}
                      >
                        {isReady ? 'Ready' : 'Needs ID'}
                      </span>
                    </div>

                    <div className="mt-4">
                      {game.platforms.length > 1 ? (
                        <div className="flex flex-wrap gap-2">
                          {game.platforms.map((platform) => {
                            const isSelected = selectedPlatform === platform;

                            return (
                              <button
                                key={platform}
                                type="button"
                                onClick={() => selectPlatformForGame(gameKey, platform)}
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
                          <PlatformLogo platform={game.platforms[0]} size={16} />
                          {PLATFORMS[game.platforms[0]]?.label}
                        </div>
                      )}
                    </div>

                    {selectedPlatform ? (
                      <div className="mt-4">
                        <label htmlFor={`game-id-${gameKey}-${selectedPlatform}`} className="label">
                          {getGameIdLabel(gameKey, selectedPlatform)}
                        </label>
                        <input
                          id={`game-id-${gameKey}-${selectedPlatform}`}
                          type="text"
                          value={selectedGameId}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              game_ids: {
                                ...formData.game_ids,
                                [getGameIdKey(gameKey, selectedPlatform)]: e.target.value,
                              },
                            })
                          }
                          placeholder={getGameIdPlaceholder(gameKey, selectedPlatform)}
                          className="input"
                          autoCapitalize="none"
                          spellCheck={false}
                        />
                        <p className="mt-2 text-xs text-[var(--text-soft)]">
                          This is the handle opponents will use on{' '}
                          {PLATFORMS[selectedPlatform]?.label}.
                        </p>
                      </div>
                    ) : (
                      <p className="mt-4 text-xs text-[var(--text-soft)]">
                        Pick a platform above before you add the player ID.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {hasMissingGamePlatform || hasMissingRequiredIds ? (
              <p className="mb-4 text-center text-xs text-[var(--text-soft)]">
                {hasMissingGamePlatform
                  ? 'Choose a platform for every selected game.'
                  : 'Add each game ID to create your account.'}
              </p>
            ) : null}
            {submitFeedback ? (
              <ActionFeedback
                tone={submitFeedback.tone}
                title={submitFeedback.title}
                detail={submitFeedback.detail}
                className="mb-4"
              />
            ) : null}
            <div className="subtle-card mb-4 p-4">
              <p className="section-title !mb-0">Almost there</p>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                Your 1-month Pro trial starts immediately after you create the account.
              </p>
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
                  STEP_META[4].continueLabel
                )}
              </button>
            </div>
          </div>
        )}

        <p className="text-center text-sm text-[var(--text-soft)]">
          Already have an account?{' '}
          <Link
            href={user ? nextPath : loginHref}
            className="brand-link-coral inline-flex min-h-11 items-center font-semibold"
          >
            Sign in
          </Link>
        </p>
      </div>
    </FullScreenSignup>
  );
}
