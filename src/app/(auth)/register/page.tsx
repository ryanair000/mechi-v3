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
import {
  normalizeUsername,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
  validateUsername,
} from '@/lib/username';
import type { CountryKey, GameKey, PlatformKey } from '@/types';

type Step = 1 | 2 | 3 | 4;
const STARTER_TRIAL_GAME_LIMIT = PLANS.pro.maxGames;
const MIN_PASSWORD_LENGTH = 9;
type RegisterSearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

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
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [invitePreview, setInvitePreview] = useState<InvitePreview | null>(null);
  const [usernameFeedback, setUsernameFeedback] = useState<ActionFeedbackState | null>(null);
  const [lastCheckedUsername, setLastCheckedUsername] = useState('');
  const [lastUsernameAvailability, setLastUsernameAvailability] = useState<boolean | null>(null);
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
  const normalizedUsername = normalizeUsername(formData.username);
  const usernameValidation = validateUsername(formData.username);
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
    !usernameValidation.error && formData.phone.trim().length >= 9 && emailIsValid;
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

  const handleCheckUsername = async () => {
    const { username, error } = validateUsername(formData.username);
    if (error) {
      setLastCheckedUsername('');
      setLastUsernameAvailability(null);
      setUsernameFeedback({
        tone: 'error',
        title: error,
        detail: `Use ${USERNAME_MIN_LENGTH} to ${USERNAME_MAX_LENGTH} characters before checking availability.`,
      });
      return;
    }

    setCheckingUsername(true);
    setFormData((current) => (current.username === username ? current : { ...current, username }));
    setUsernameFeedback(null);

    try {
      const res = await fetch(`/api/auth/register/username?username=${encodeURIComponent(username)}`, {
        method: 'GET',
        cache: 'no-store',
      });
      const data = await res.json();

      if (!res.ok) {
        setLastCheckedUsername(username);
        setLastUsernameAvailability(null);
        setUsernameFeedback({
          tone: 'error',
          title: data.error ?? 'Could not check username right now.',
          detail:
            res.status === 429
              ? 'Please wait a bit, then try the availability check again.'
              : 'Try again in a moment.',
        });
        return;
      }

      setLastCheckedUsername(data.username ?? username);
      setLastUsernameAvailability(Boolean(data.available));
      setUsernameFeedback(
        data.available
          ? {
              tone: 'success',
              title: 'Username is available.',
              detail: 'Nice. You can keep it and continue with signup.',
            }
          : {
              tone: 'error',
              title: 'Username already taken.',
              detail: 'Try a small variation, then check again before you continue.',
            }
      );
    } catch {
      setLastCheckedUsername(username);
      setLastUsernameAvailability(null);
      setUsernameFeedback({
        tone: 'error',
        title: 'Could not check username right now.',
        detail: 'Please try again in a moment.',
      });
    } finally {
      setCheckingUsername(false);
    }
  };

  const handleSubmit = async () => {
    if (lastCheckedUsername === normalizedUsername && lastUsernameAvailability === false) {
      setSubmitFeedback({
        tone: 'error',
        title: 'That username is already taken.',
        detail: 'Pick another username and check it again before you create your account.',
      });
      toast.error('Choose another username');
      return;
    }

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
          username: normalizedUsername,
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

  const STEP_LABELS = ['Basics', 'Details', 'Games', 'Platforms'] as const;
  const stepTitle =
    step === 1
      ? 'Set the account basics.'
      : step === 2
        ? 'Secure the profile and local lane.'
        : step === 3
          ? 'Choose the games you want Mechi to run.'
          : 'Finish the platform and player IDs.';
  const stepDescription =
    step === 1
      ? 'Start with the profile details other players and Mechi will use to recognize you.'
      : step === 2
        ? 'Pick the country you mainly play from, set your password, and decide whether WhatsApp alerts should follow you.'
        : step === 3
          ? `Your Pro trial starts with up to ${STARTER_TRIAL_GAME_LIMIT} core games, so lock in the ones you want first.`
          : 'Set the exact platform for each game and add the IDs opponents will need before the account goes live.';
  const registerStats = [
    { label: 'Step', value: `${step}/4` },
    {
      label: 'Games',
      value: `${formData.selected_games.length}/${STARTER_TRIAL_GAME_LIMIT}`,
    },
    {
      label: invitePreview ? 'Invite' : 'Plan',
      value: invitePreview ? invitePreview.username : 'Pro trial',
    },
  ];

  return (
    <FullScreenSignup
      title=""
      subtitle=""
      sideEyebrow="mechi.club"
      sideTitle="Create your Mechi profile."
      sideDescription="Set up the account, local lane, and starter games you want ready before your first queue."
      sidePoints={[
        'Start with a 1-month Pro trial',
        `Save up to ${STARTER_TRIAL_GAME_LIMIT} main games`,
        'Add only the IDs those games need',
      ]}
      hideMainHeader
      variant="marketing"
    >
      <div className="card p-4 sm:p-6">
        <div className="mb-5 rounded-xl border border-[rgba(50,224,196,0.2)] bg-[linear-gradient(135deg,rgba(14,26,44,0.96)_0%,rgba(10,18,32,0.92)_100%)] px-4 py-4 sm:mb-6 sm:px-5">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="max-w-2xl">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--accent-secondary-text)]">
                  {invitePreview ? 'Invite active' : 'Account setup flow'}
                </p>
                <h1 className="mt-2 text-[1.9rem] font-black leading-[0.98] text-[var(--text-primary)] sm:text-[2.2rem]">
                  {stepTitle}
                </h1>
                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                  {stepDescription}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:w-[19rem] sm:grid-cols-3">
                {registerStats.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-lg border border-[var(--border-color)] bg-[rgba(17,27,46,0.74)] px-3 py-3"
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">
                      {item.label}
                    </p>
                    <p
                      className="mt-1 truncate text-sm font-semibold text-[var(--text-primary)]"
                      title={item.value}
                    >
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {invitePreview ? (
              <div className="rounded-lg border border-[rgba(50,224,196,0.18)] bg-[rgba(50,224,196,0.08)] px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--accent-secondary-text)]">
                  Invited by {invitePreview.username}
                </p>
                <p className="mt-1 text-sm text-[var(--text-primary)]">
                  Your affiliate invite is locked in and the reward link will carry through signup.
                </p>
              </div>
            ) : null}
          </div>
        </div>

        <div className="mb-5 grid grid-cols-4 gap-1.5 sm:mb-6 sm:gap-2">
          {([1, 2, 3, 4] as Step[]).map((currentStep) => {
            const isActive = step === currentStep;
            const isComplete = step > currentStep;

            return (
              <div
                key={currentStep}
                className={`rounded-lg border px-2 py-2 sm:rounded-xl sm:px-3 sm:py-2.5 ${
                  isActive
                    ? 'border-[rgba(50,224,196,0.22)] bg-[rgba(50,224,196,0.08)]'
                    : isComplete
                      ? 'border-[rgba(255,107,107,0.18)] bg-[rgba(255,107,107,0.08)]'
                      : 'border-[var(--border-color)] bg-[var(--surface-soft)]'
                }`}
              >
                <div
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold transition-all sm:h-7 sm:w-7 ${
                    isComplete
                      ? 'bg-[var(--brand-coral)] text-[var(--brand-night)]'
                      : isActive
                        ? 'bg-[rgba(50,224,196,0.18)] text-[var(--accent-secondary-text)]'
                        : 'bg-[rgba(95,109,130,0.12)] text-[var(--text-soft)]'
                  }`}
                >
                  {isComplete ? <Check size={12} /> : currentStep}
                </div>
                <span
                  className={`mt-2 block text-[8.5px] font-semibold uppercase leading-tight tracking-[0.08em] transition-colors sm:text-[11px] sm:tracking-[0.12em] ${
                    isActive ? 'text-[var(--text-primary)]' : 'text-[var(--text-soft)]'
                  }`}
                >
                  {STEP_LABELS[currentStep - 1]}
                </span>
              </div>
            );
          })}
        </div>

        {step === 1 && (
          <div>
            <p className="section-title">Account details</p>
            <div className="mt-4 space-y-4">
              <div>
                <label className="label">Username</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => {
                    const nextUsername = e.target.value;
                    setFormData((current) => ({ ...current, username: nextUsername }));
                    setUsernameFeedback(null);
                    setLastCheckedUsername('');
                    setLastUsernameAvailability(null);
                  }}
                  onBlur={() =>
                    setFormData((current) => ({
                      ...current,
                      username: normalizeUsername(current.username),
                    }))
                  }
                  placeholder="GameKing254"
                  className="input"
                  minLength={USERNAME_MIN_LENGTH}
                  maxLength={USERNAME_MAX_LENGTH}
                />
                <button
                  type="button"
                  onClick={() => void handleCheckUsername()}
                  disabled={checkingUsername || Boolean(usernameValidation.error)}
                  className="btn-ghost mt-3 w-full justify-center sm:w-auto"
                >
                  {checkingUsername ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Checking...
                    </>
                  ) : (
                    'Check availability'
                  )}
                </button>
                {usernameFeedback ? (
                  <ActionFeedback
                    tone={usernameFeedback.tone}
                    title={usernameFeedback.title}
                    detail={usernameFeedback.detail}
                    className="mt-3"
                  />
                ) : (
                  <p className="input-hint mt-2">
                    Use 3 to 30 characters, then check early to make sure this exact handle is still
                    free.
                  </p>
                )}
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
                      phone: normalizePhoneNumber(current.phone, current.country || null),
                    }))
                  }
                />
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
            <p className="section-title">Security and location</p>
            <div className="mt-4 space-y-4">
              <div>
                <label className="label">Country</label>
                <select
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
                <label className="label">Region</label>
                <select
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
                  Pick where you mainly play from so Mechi can place you in the right local lane.
                </p>
              </div>
              <div>
                <label className="label">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="More than 8 characters"
                    className="input pr-12"
                    minLength={MIN_PASSWORD_LENGTH}
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
                  Password must be more than 8 characters.
                </p>
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
                      className={`flex h-6 w-6 items-center justify-center rounded-md border-2 transition-colors ${
                        formData.whatsapp_notifications
                          ? 'border-[var(--brand-teal)] bg-[var(--brand-teal)]'
                          : 'border-[var(--border-strong)] bg-transparent'
                      }`}
                    >
                      {formData.whatsapp_notifications && (
                        <Check size={11} className="text-white" />
                      )}
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
                      onChange={(e) =>
                        setFormData({ ...formData, whatsapp_number: e.target.value })
                      }
                      placeholder="0712 345 678"
                      className="input"
                      inputMode="tel"
                    />
                  </div>
                )}
              </div>
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
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <p className="section-title">Game list</p>
            <p className="mb-5 mt-3 text-sm leading-6 text-[var(--text-secondary)]">
              Pick the games you want Mechi to organize for you during your Pro trial.
            </p>
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
            <p className="mb-4 text-center text-xs text-[var(--text-soft)]">
              {formData.selected_games.length}/{STARTER_TRIAL_GAME_LIMIT} selected on Pro trial
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
            <p className="section-title">Player IDs</p>
            <p className="mb-5 mt-3 text-sm leading-6 text-[var(--text-secondary)]">
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
                        className="input"
                      />
                    </div>
                  ))}
                </div>
              )}
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

        <p className="mt-6 text-center text-sm text-[var(--text-secondary)]">
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
