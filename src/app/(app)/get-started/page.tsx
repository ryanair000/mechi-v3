'use client';

import Link from 'next/link';
import {
  ArrowRight,
  BellRing,
  Check,
  CheckCircle2,
  CircleAlert,
  Gamepad2,
  MapPin,
  RefreshCw,
  Rocket,
  ShieldCheck,
  Trophy,
  UserRound,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuthFetch } from '@/components/AuthProvider';
import { GAMES, getConfiguredPlatformForGame, getGameIdValue, normalizeSelectedGameKeys } from '@/lib/config';
import { resolveProfileLocation } from '@/lib/location';
import type { GameKey, PlatformKey } from '@/types';

type RecordValue = Record<string, unknown>;

type OnboardingData = {
  profile: RecordValue;
  matches: RecordValue[];
  tournaments: RecordValue[];
};

type SetupStep = {
  body: string;
  complete: boolean;
  href: string;
  icon: typeof UserRound;
  label: string;
  title: string;
};

function hasPlayerId(profile: RecordValue) {
  const games = normalizeSelectedGameKeys((profile.selected_games as string[] | undefined) ?? []);
  const gameIds = (profile.game_ids as Record<string, string> | undefined) ?? {};
  const platforms = (profile.platforms as PlatformKey[] | undefined) ?? [];

  return games.some((game) => {
    const platform = getConfiguredPlatformForGame(game, gameIds, platforms);
    return Boolean(platform && getGameIdValue(gameIds, game, platform).trim());
  });
}

export default function GetStartedPage() {
  const authFetch = useAuthFetch();
  const [data, setData] = useState<OnboardingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [profileResponse, dashboardResponse] = await Promise.all([
        authFetch('/api/users/profile'),
        authFetch('/api/dashboard/player'),
      ]);
      const [profilePayload, dashboardPayload] = await Promise.all([
        profileResponse.json(),
        dashboardResponse.json(),
      ]);

      if (!profileResponse.ok) {
        throw new Error(profilePayload.error ?? 'Could not load your player setup.');
      }

      setData({
        profile: profilePayload.profile as RecordValue,
        matches: dashboardResponse.ok ? ((dashboardPayload.matches as RecordValue[]) ?? []) : [],
        tournaments: dashboardResponse.ok ? ((dashboardPayload.tournaments as RecordValue[]) ?? []) : [],
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load your player setup.');
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    void load();
  }, [load]);

  const steps = useMemo<SetupStep[]>(() => {
    if (!data) return [];

    const profile = data.profile;
    const location = resolveProfileLocation(profile);
    const games = normalizeSelectedGameKeys((profile.selected_games as string[] | undefined) ?? []);
    const hasContact = Boolean(profile.phone || profile.email);
    const hasLocation = Boolean(location.country && location.region);
    const hasCompetition = data.matches.length > 0 || data.tournaments.length > 0;

    return [
      {
        title: 'Build your player identity',
        body: hasLocation
          ? 'Your location is set. Add a photo or cover any time to make your public card stand out.'
          : 'Add your country and region so Mechi can place you in the right competitions.',
        label: hasLocation ? 'Review profile' : 'Complete profile',
        href: '/profile',
        icon: UserRound,
        complete: hasContact && hasLocation,
      },
      {
        title: 'Connect your first game',
        body: games.length
          ? `${GAMES[games[0] as GameKey]?.label ?? 'Your first game'} is selected. Confirm the platform and player ID opponents need.`
          : 'Choose a game, platform, and the exact player ID opponents will use to find you.',
        label: games.length ? 'Review games' : 'Add a game',
        href: '/games',
        icon: Gamepad2,
        complete: games.length > 0 && hasPlayerId(profile),
      },
      {
        title: 'Make your profile recognizable',
        body: 'A player photo makes challenges, tournament lists, and your public profile easier to trust.',
        label: profile.avatar_url ? 'View player card' : 'Add player photo',
        href: profile.avatar_url && profile.username
          ? `/s/${encodeURIComponent(String(profile.username))}`
          : '/profile',
        icon: ShieldCheck,
        complete: Boolean(profile.avatar_url),
      },
      {
        title: 'Enter the arena',
        body: hasCompetition
          ? 'Your first competition activity is on the board. Keep an eye on your dashboard for the next action.'
          : 'Join a tournament or play a match to start building your rating and reputation.',
        label: hasCompetition ? 'Open dashboard' : 'Find competition',
        href: hasCompetition ? '/dashboard' : '/tournaments',
        icon: Trophy,
        complete: hasCompetition,
      },
    ];
  }, [data]);

  if (loading) {
    return (
      <div className="page-container space-y-4" aria-label="Loading your setup" aria-busy="true">
        <div className="h-52 shimmer" />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="h-48 shimmer" />
          <div className="h-48 shimmer" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="page-container">
        <div className="card mx-auto max-w-xl p-8 text-center">
          <CircleAlert className="mx-auto text-[var(--brand-coral)]" size={30} />
          <h1 className="mt-4 text-2xl font-black text-[var(--text-primary)]">Your setup could not load</h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">{error || 'Try again in a moment.'}</p>
          <button type="button" onClick={() => void load()} className="btn-primary mx-auto mt-5">
            <RefreshCw size={14} /> Try again
          </button>
        </div>
      </div>
    );
  }

  const completedCount = steps.filter((step) => step.complete).length;
  const progress = Math.round((completedCount / steps.length) * 100);
  const nextStep = steps.find((step) => !step.complete);
  const location = resolveProfileLocation(data.profile);

  return (
    <div className="page-container space-y-5">
      <section className="card relative overflow-hidden p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full border-[36px] border-[rgba(50,224,196,0.08)]" />
        <div className="relative grid gap-7 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-center">
          <div>
            <p className="section-title">Welcome to Mechi</p>
            <h1 className="mt-3 max-w-2xl text-3xl font-black text-[var(--text-primary)] sm:text-4xl">
              Get match-ready, one clear step at a time.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
              This checklist follows your live account. Finish the essentials once, then use Mechi to compete, grow your record, and share your player identity.
            </p>
            {nextStep ? (
              <Link href={nextStep.href} className="btn-primary mt-6">
                <Rocket size={15} /> Continue: {nextStep.title} <ArrowRight size={15} />
              </Link>
            ) : (
              <Link href="/dashboard" className="btn-primary mt-6">
                <CheckCircle2 size={15} /> Go to dashboard <ArrowRight size={15} />
              </Link>
            )}
          </div>

          <div className="rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--surface-elevated)] p-5">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-[var(--text-soft)]">Setup progress</p>
                <p className="mt-1 text-4xl font-black text-[var(--text-primary)]">{progress}%</p>
              </div>
              <span className="brand-chip px-3 py-1">{completedCount}/{steps.length} done</span>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--surface-strong)]">
              <span className="block h-full rounded-full bg-[var(--brand-teal)] transition-[width]" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-4 text-xs leading-5 text-[var(--text-secondary)]">
              {progress === 100 ? 'You are match-ready. Your setup stays here whenever you want to review it.' : 'Progress updates automatically when you save your profile or join competition.'}
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <article key={step.title} className="card flex flex-col p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div className={`flex h-11 w-11 items-center justify-center rounded-[var(--radius-control)] ${step.complete ? 'bg-[rgba(50,224,196,0.14)] text-[var(--accent-secondary-text)]' : 'bg-[var(--surface-elevated)] text-[var(--text-soft)]'}`}>
                  {step.complete ? <Check size={19} /> : <Icon size={19} />}
                </div>
                <span className={step.complete ? 'brand-chip px-3 py-1' : 'rounded-full border border-[var(--border-color)] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-soft)]'}>
                  {step.complete ? 'Complete' : `Step ${index + 1}`}
                </span>
              </div>
              <h2 className="mt-5 text-lg font-black text-[var(--text-primary)]">{step.title}</h2>
              <p className="mt-2 flex-1 text-sm leading-6 text-[var(--text-secondary)]">{step.body}</p>
              <Link href={step.href} className="btn-outline mt-5 w-full justify-between">
                {step.label} <ArrowRight size={14} />
              </Link>
            </article>
          );
        })}
      </section>

      <section className="card grid gap-5 p-5 sm:p-6 lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <p className="section-title">Your current setup</p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full border border-[var(--border-color)] bg-[var(--surface-elevated)] px-3 py-1.5 text-[var(--text-secondary)]">
              <MapPin className="mr-1 inline" size={12} /> {location.label || 'Location not set'}
            </span>
            <span className="rounded-full border border-[var(--border-color)] bg-[var(--surface-elevated)] px-3 py-1.5 text-[var(--text-secondary)]">
              <Gamepad2 className="mr-1 inline" size={12} /> {normalizeSelectedGameKeys((data.profile.selected_games as string[] | undefined) ?? []).length} games
            </span>
            <span className="rounded-full border border-[var(--border-color)] bg-[var(--surface-elevated)] px-3 py-1.5 text-[var(--text-secondary)]">
              <BellRing className="mr-1 inline" size={12} /> {data.profile.whatsapp_notifications ? 'Alerts on' : 'Alerts optional'}
            </span>
          </div>
        </div>
        <Link href="/profile" className="btn-ghost justify-center">Review player profile <ArrowRight size={14} /></Link>
      </section>
    </div>
  );
}
