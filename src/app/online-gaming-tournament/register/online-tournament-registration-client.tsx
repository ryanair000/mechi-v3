'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { CheckCircle2, ExternalLink, Loader2, MessageCircle, Trophy, Users } from 'lucide-react';
import { useAuth, useAuthFetch } from '@/components/AuthProvider';
import { HomeFloatingHeader } from '@/components/HomeFloatingHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  getConfiguredPlatformForGame,
  getGameIdValue,
} from '@/lib/config';
import { getLoginPath, getRegisterPath } from '@/lib/navigation';
import {
  ONLINE_TOURNAMENT_GAMES,
  ONLINE_TOURNAMENT_ARENA_PATH,
  ONLINE_TOURNAMENT_GAME_BY_KEY,
  ONLINE_TOURNAMENT_PUBLIC_PATH,
  ONLINE_TOURNAMENT_REGISTRATION_PATH,
  ONLINE_TOURNAMENT_TOTAL_SLOTS,
  ONLINE_TOURNAMENT_YOUTUBE_URL,
  formatEatDateTime,
  getOnlineTournamentWindowState,
  isOnlineTournamentRegistrationClosed,
  type OnlineTournamentGameKey,
} from '@/lib/online-tournament';
import type { PlatformKey } from '@/types';

type GameRegistrationCount = {
  registered: number;
  slots: number;
  spotsLeft: number;
  full: boolean;
};

type UserTournamentRegistration = {
  id: string;
  game: OnlineTournamentGameKey;
  in_game_username: string;
  instagram_username: string | null;
  youtube_name: string | null;
  followed_instagram: boolean;
  subscribed_youtube: boolean;
  reward_eligible: boolean;
  eligibility_status: string;
  check_in_status: string;
  created_at: string;
  updated_at: string;
};

type RegistrationSummary = {
  games: Record<OnlineTournamentGameKey, GameRegistrationCount>;
  registrations: UserTournamentRegistration[];
};

const API_PATH = '/api/events/mechi-online-gaming-tournament/register';
const RETURN_PATH = ONLINE_TOURNAMENT_REGISTRATION_PATH;

function getFallbackSummary(): RegistrationSummary {
  return {
    games: ONLINE_TOURNAMENT_GAMES.reduce(
      (counts, game) => {
        const registrationClosed = isOnlineTournamentRegistrationClosed(game);
        counts[game.game] = {
          registered: 0,
          slots: game.slots,
          spotsLeft: registrationClosed ? 0 : game.slots,
          full: registrationClosed,
        };
        return counts;
      },
      {} as Record<OnlineTournamentGameKey, GameRegistrationCount>
    ),
    registrations: [],
  };
}

function getProfileGameId(params: {
  game: OnlineTournamentGameKey;
  gameIds?: Record<string, string> | null;
  platforms?: PlatformKey[] | null;
}) {
  const platform = getConfiguredPlatformForGame(
    params.game,
    params.gameIds ?? {},
    params.platforms ?? []
  );

  if (!platform) {
    return '';
  }

  return getGameIdValue(params.gameIds ?? {}, params.game, platform).trim();
}

function isGameKey(value: string): value is OnlineTournamentGameKey {
  return Object.prototype.hasOwnProperty.call(ONLINE_TOURNAMENT_GAME_BY_KEY, value);
}

export function OnlineTournamentRegistrationClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const authFetch = useAuthFetch();
  const { user, loading: authLoading } = useAuth();
  const [summary, setSummary] = useState<RegistrationSummary>(() => getFallbackSummary());
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const requestedGame = searchParams.get('game') ?? '';
  const [selectedGame, setSelectedGame] = useState<OnlineTournamentGameKey>(() =>
    isGameKey(requestedGame) ? requestedGame : 'pubgm'
  );
  const [inGameUsername, setInGameUsername] = useState('');
  const [followedInstagram, setFollowedInstagram] = useState(true);
  const [instagramUsername, setInstagramUsername] = useState('');
  const [subscribedYoutube, setSubscribedYoutube] = useState(true);
  const [youtubeName, setYoutubeName] = useState('');
  const [availableAt8pm, setAvailableAt8pm] = useState(true);
  const [acceptedRules, setAcceptedRules] = useState(false);

  const selectedGameConfig = ONLINE_TOURNAMENT_GAME_BY_KEY[selectedGame];
  const selectedGameSummary = summary.games[selectedGame];
  const currentRegistration = summary.registrations.find(
    (registration) => registration.game === selectedGame
  );
  const selectedGameRegistrationOpen =
    getOnlineTournamentWindowState(selectedGameConfig).isRegistrationOpen;
  const selectedGameIsFull = Boolean(selectedGameSummary?.full);
  const selectedGameIsLocked =
    !selectedGameRegistrationOpen || Boolean(selectedGameIsFull && !currentRegistration);
  const returnPath = isGameKey(requestedGame) ? `${RETURN_PATH}?game=${requestedGame}` : RETURN_PATH;
  const createAccountHref = getRegisterPath({ next: returnPath });
  const signInHref = getLoginPath(returnPath);
  const tournamentArenaHref = `${ONLINE_TOURNAMENT_ARENA_PATH}?game=${encodeURIComponent(selectedGame)}`;

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace(createAccountHref);
    }
  }, [authLoading, createAccountHref, router, user]);

  useEffect(() => {
    if (isGameKey(requestedGame)) {
      setSelectedGame(requestedGame);
    }
  }, [requestedGame]);

  const loadSummary = useCallback(async () => {
    try {
      const res = await authFetch(API_PATH, { method: 'GET' });
      const data = (await res.json()) as RegistrationSummary & { error?: string };

      if (!res.ok) {
        const nextError = data.error ?? 'Could not load tournament slots';
        setSummaryError(nextError);
        toast.error(nextError);
        return;
      }

      setSummary(data);
      setSummaryError(null);
    } catch {
      setSummaryError('Could not load tournament slots');
      toast.error('Could not load tournament slots');
    }
  }, [authFetch]);

  useEffect(() => {
    if (authLoading || !user) {
      return;
    }

    void loadSummary();
  }, [authLoading, loadSummary, user]);

  useEffect(() => {
    if (currentRegistration) {
      setInGameUsername(currentRegistration.in_game_username);
      setFollowedInstagram(currentRegistration.followed_instagram);
      setInstagramUsername(currentRegistration.instagram_username ?? '');
      setSubscribedYoutube(currentRegistration.subscribed_youtube);
      setYoutubeName(currentRegistration.youtube_name ?? '');
      setAcceptedRules(true);
      return;
    }

    setInGameUsername(
      user
        ? getProfileGameId({
            game: selectedGame,
            gameIds: user.game_ids,
            platforms: user.platforms,
          })
        : ''
    );
    setFollowedInstagram(true);
    setInstagramUsername('');
    setSubscribedYoutube(true);
    setYoutubeName('');
    setAvailableAt8pm(true);
    setAcceptedRules(false);
  }, [currentRegistration, selectedGame, user]);

  const handleGameChange = (value: string) => {
    if (isGameKey(value)) {
      setSelectedGame(value);
    }
  };

  const handleSubmit = async () => {
    if (!user) {
      toast.error('Create or sign in to your Mechi account first');
      return;
    }

    setSubmitting(true);
    try {
      const res = await authFetch(API_PATH, {
        method: 'POST',
        body: JSON.stringify({
          game: selectedGame,
          in_game_username: inGameUsername,
          followed_instagram: followedInstagram,
          instagram_username: instagramUsername,
          subscribed_youtube: subscribedYoutube,
          youtube_name: youtubeName,
          available_at_8pm: availableAt8pm,
          accepted_rules: acceptedRules,
        }),
      });
      const data = (await res.json()) as (RegistrationSummary & { error?: string }) | { error?: string };

      if (!res.ok) {
        toast.error(data.error ?? 'Could not save tournament registration');
        return;
      }

      if ('games' in data && 'registrations' in data) {
        setSummary(data);
      } else {
        await loadSummary();
      }

      toast.success(`${selectedGameConfig.label} slot saved. Join the WhatsApp group below.`);
    } catch {
      toast.error('Network error while saving registration');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrimaryAction = () => {
    if (currentRegistration) {
      router.push(tournamentArenaHref);
      return;
    }

    void handleSubmit();
  };

  const canSubmit = Boolean(user) && !selectedGameIsLocked && !summaryError && !submitting;
  const canUsePrimaryAction = currentRegistration ? Boolean(user) && !submitting : canSubmit;

  return (
    <div className="page-base marketing-prototype-shell min-h-screen">
      <HomeFloatingHeader
        navItems={[
          { href: ONLINE_TOURNAMENT_PUBLIC_PATH, label: 'HOME' },
          { href: '/#prizes', label: 'PRIZES' },
          { href: '/#rules', label: 'RULES' },
          { href: '/#stream', label: 'STREAM' },
        ]}
        signInHref={signInHref}
        joinHref={createAccountHref}
      />

      <main className="landing-shell pb-12 pt-8 sm:pb-16 sm:pt-10">
        <section className="grid gap-6 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] lg:items-start">
          <div className="space-y-5">
            <div>
              <p className="section-title">Tournament registration</p>
              <h1 className="mt-3 text-4xl font-black leading-tight text-[var(--text-primary)] sm:text-5xl">
                Pull up and claim your slot.
              </h1>
              <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)] sm:text-base">
                {ONLINE_TOURNAMENT_TOTAL_SLOTS} spots, real players, and prizes on the line. Pick
                your game, drop your gamer tag, and show PlayMechi some love to stay reward-ready.
              </p>
              {summaryError ? (
                <div className="mt-4 rounded-[var(--radius-card)] border border-amber-400/20 bg-amber-400/10 p-4 text-sm leading-6 text-amber-100">
                  Live slot sync is offline right now. The tournament storage needs to be ready before
                  players can lock slots.
                </div>
              ) : null}
            </div>
          </div>

          <Card className="border-white/10 bg-[rgba(10,18,31,0.78)] p-5 text-[var(--text-primary)] shadow-2xl shadow-black/20 ring-1 ring-white/10 backdrop-blur-md sm:p-6">
            {authLoading || !user ? (
              <div className="flex min-h-80 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-[var(--accent-secondary-text)]" />
              </div>
            ) : (
              <div className="space-y-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="section-title">Register as @{user.username}</p>
                    <h2 className="mt-3 text-2xl font-black text-[var(--text-primary)]">
                      {selectedGameConfig.label}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                      Closes {formatEatDateTime(selectedGameConfig.registrationClosesAt)}.
                    </p>
                  </div>
                  <span className="brand-chip px-3 py-1">
                    {selectedGameSummary?.registered ?? 0}/{selectedGameConfig.slots}
                  </span>
                </div>

                {currentRegistration ? (
                  <div className="rounded-[var(--radius-card)] border border-[rgba(50,224,196,0.22)] bg-[rgba(50,224,196,0.08)] p-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 text-[var(--accent-secondary-text)]" />
                      <div>
                        <p className="text-sm font-black text-[var(--text-primary)]">
                          You are already registered for this game.
                        </p>
                        <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
                          Status: {currentRegistration.eligibility_status}.{' '}
                          {selectedGameRegistrationOpen
                            ? 'You can update your tag or social proof before registration closes.'
                            : 'Registration is now closed for this game. Your saved slot stays on the list.'}
                        </p>
                        <Button asChild size="sm" className="mt-3">
                          <a
                            href={selectedGameConfig.whatsappGroupUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <MessageCircle className="h-4 w-4" />
                            Join {selectedGameConfig.shortLabel} WhatsApp group
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : null}

                <div className="grid gap-4">
                  <label className="block">
                    <span className="label">Game</span>
                    <select
                      value={selectedGame}
                      onChange={(event) => handleGameChange(event.target.value)}
                      className="input"
                    >
                      {ONLINE_TOURNAMENT_GAMES.map((game) => (
                        <option key={game.game} value={game.game}>
                          {game.label}
                          {summary.games[game.game]?.full ? ' - Full' : ''}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="label">In-game username / Gamer Tag</span>
                    <input
                      value={inGameUsername}
                      onChange={(event) => setInGameUsername(event.target.value)}
                      className="input"
                      placeholder="Your exact game username"
                    />
                  </label>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="flex items-start gap-3 rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--surface-strong)] p-4">
                      <input
                        type="checkbox"
                        checked={followedInstagram}
                        onChange={(event) => setFollowedInstagram(event.target.checked)}
                        className="mt-1"
                      />
                      <span>
                        <span className="block text-sm font-black text-[var(--text-primary)]">
                          Followed PlayMechi on Instagram
                        </span>
                        <span className="mt-1 block text-xs leading-5 text-[var(--text-secondary)]">
                          Required for rewards.
                        </span>
                      </span>
                    </label>

                    <label className="flex items-start gap-3 rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--surface-strong)] p-4">
                      <input
                        type="checkbox"
                        checked={subscribedYoutube}
                        onChange={(event) => setSubscribedYoutube(event.target.checked)}
                        className="mt-1"
                      />
                      <span>
                        <span className="block text-sm font-black text-[var(--text-primary)]">
                          Subscribed to PlayMechi on YouTube
                        </span>
                        <span className="mt-1 block text-xs leading-5 text-[var(--text-secondary)]">
                          Required for rewards.
                        </span>
                      </span>
                    </label>
                  </div>

                  <a
                    href={ONLINE_TOURNAMENT_YOUTUBE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.045)] p-4 text-sm transition hover:border-[rgba(50,224,196,0.28)] hover:bg-[rgba(50,224,196,0.08)] sm:flex-row sm:items-center sm:justify-between"
                  >
                    <span>
                      <span className="block font-black text-[var(--text-primary)]">
                        PlayMechi YouTube channel
                      </span>
                      <span className="mt-1 block break-all text-[var(--accent-secondary-text)]">
                        youtube.com/@playmechi
                      </span>
                    </span>
                    <span className="inline-flex items-center gap-2 font-bold text-[var(--text-primary)]">
                      Open channel
                      <ExternalLink className="h-4 w-4" />
                    </span>
                  </a>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="label">Instagram username</span>
                      <div className="relative">
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-[var(--text-soft)]">
                          @
                        </span>
                        <input
                          value={instagramUsername}
                          onChange={(event) =>
                            setInstagramUsername(event.target.value.replace(/^@+/, ''))
                          }
                          className="input pl-8"
                          placeholder="yourhandle"
                        />
                      </div>
                    </label>
                    <label className="block">
                      <span className="label">Youtube Mail/Channel Name</span>
                      <input
                        value={youtubeName}
                        onChange={(event) => setYoutubeName(event.target.value)}
                        className="input"
                        placeholder="Email or channel name"
                      />
                    </label>
                  </div>

                  <label className="flex items-start gap-3 rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--surface-strong)] p-4">
                    <input
                      type="checkbox"
                      checked={availableAt8pm}
                      onChange={(event) => setAvailableAt8pm(event.target.checked)}
                      className="mt-1"
                    />
                    <span className="text-sm leading-6 text-[var(--text-secondary)]">
                      I am available at 8:00 PM EAT on {selectedGameConfig.dateLabel}.
                    </span>
                  </label>

                  <label className="flex items-start gap-3 rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--surface-strong)] p-4">
                    <input
                      type="checkbox"
                      checked={acceptedRules}
                      onChange={(event) => setAcceptedRules(event.target.checked)}
                      className="mt-1"
                    />
                    <span className="text-sm leading-6 text-[var(--text-secondary)]">
                      I agree to follow the tournament rules and accept admin verification decisions.
                    </span>
                  </label>
                </div>

                <div className="grid gap-3 border-t border-[var(--border-color)] pt-5 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div className="flex items-center gap-3 text-sm text-[var(--text-secondary)]">
                    <Users className="h-4 w-4 text-[var(--accent-secondary-text)]" />
                    {!selectedGameRegistrationOpen
                      ? `${selectedGameConfig.label} registration is closed.`
                      : selectedGameIsFull
                      ? `${selectedGameConfig.label} is full.`
                      : `${selectedGameSummary?.spotsLeft ?? selectedGameConfig.slots} slots left for ${selectedGameConfig.shortLabel}.`}
                  </div>
                  <Button type="button" size="lg" disabled={!canUsePrimaryAction} onClick={handlePrimaryAction}>
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trophy className="h-4 w-4" />}
                    {currentRegistration
                      ? 'Confirm Registration'
                      : !selectedGameRegistrationOpen
                      ? 'Registration closed'
                      : 'Lock my slot'}
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </section>
      </main>
    </div>
  );
}
