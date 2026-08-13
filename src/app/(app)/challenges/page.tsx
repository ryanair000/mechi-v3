'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  Check,
  Clock3,
  RefreshCw,
  Search,
  Swords,
  WifiOff,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth, useAuthFetch } from '@/components/AuthProvider';
import {
  ChallengePlayerButton,
  type ChallengePlayerError,
} from '@/components/ChallengePlayerButton';
import { emitNotificationRefresh } from '@/components/NotificationNavButton';
import {
  getChallengeLifecyclePresentation,
  type ChallengeDirection,
} from '@/lib/challenge-lifecycle';
import { GAMES, normalizeSelectedGameKeys } from '@/lib/config';
import type { ChallengeDiscoveryPlayer, GameKey, MatchChallenge } from '@/types';
import styles from './Challenges.module.css';

type ChallengePayload = {
  inbound: MatchChallenge[];
  outbound: MatchChallenge[];
  history: MatchChallenge[];
  generated_at?: string;
};

const CHALLENGE_CACHE_KEY = 'mechi:play-1v1:last-known';

const oneVsOneGames = (games: readonly string[]) =>
  normalizeSelectedGameKeys(games).filter((game): game is GameKey => GAMES[game]?.mode === '1v1');

function subscribeToOnlineStatus(callback: () => void) {
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
}

function getOnlineStatus() {
  return navigator.onLine;
}

function getServerOnlineStatus() {
  return true;
}

function formatEatDeadline(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Deadline unavailable';
  return `Answer by ${new Intl.DateTimeFormat('en-KE', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Africa/Nairobi',
  }).format(date)} EAT`;
}

function readCachedChallenges(): ChallengePayload | null {
  try {
    const raw = window.sessionStorage.getItem(CHALLENGE_CACHE_KEY);
    return raw ? (JSON.parse(raw) as ChallengePayload) : null;
  } catch {
    return null;
  }
}

export default function ChallengesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const authFetch = useAuthFetch();
  const online = useSyncExternalStore(
    subscribeToOnlineStatus,
    getOnlineStatus,
    getServerOnlineStatus
  );
  const [games, setGames] = useState<GameKey[]>(() => oneVsOneGames(user?.selected_games ?? []));
  const [game, setGame] = useState<GameKey | null>(() => games[0] ?? null);
  const [incoming, setIncoming] = useState<MatchChallenge[]>([]);
  const [sent, setSent] = useState<MatchChallenge[]>([]);
  const [history, setHistory] = useState<MatchChallenge[]>([]);
  const [players, setPlayers] = useState<ChallengeDiscoveryPlayer[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [finding, setFinding] = useState(false);
  const [stale, setStale] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [discoveryError, setDiscoveryError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const applyChallengePayload = useCallback((data: ChallengePayload, isStale = false) => {
    setIncoming(data.inbound ?? []);
    setSent(data.outbound ?? []);
    setHistory(data.history ?? []);
    setStale(isStale);
  }, []);

  const loadChallenges = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const response = await authFetch('/api/challenges');
      const data = (await response.json()) as ChallengePayload & { error?: string };
      if (!response.ok) throw new Error(data.error ?? 'Could not load your 1v1 activity.');
      applyChallengePayload(data);
      window.sessionStorage.setItem(CHALLENGE_CACHE_KEY, JSON.stringify(data));
      setPageError(null);
    } catch (cause) {
      const cached = readCachedChallenges();
      if (!navigator.onLine && cached) {
        applyChallengePayload(cached, true);
        setPageError(null);
        return;
      }
      throw cause;
    } finally {
      if (showRefresh) setRefreshing(false);
    }
  }, [applyChallengePayload, authFetch]);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      Promise.all([
        loadChallenges(),
        authFetch('/api/users/profile').then(async (response) => {
          const data = await response.json();
          if (!response.ok) throw new Error(data.error ?? 'Could not load your game setup.');
          return data;
        }),
      ])
        .then(([, profileData]) => {
          if (!active) return;
          const nextGames = oneVsOneGames(
            profileData.profile?.selected_games ?? user?.selected_games ?? []
          );
          setGames(nextGames);
          setGame((current) =>
            current && nextGames.includes(current) ? current : nextGames[0] ?? null
          );
        })
        .catch((cause) => {
          if (!active) return;
          const cached = readCachedChallenges();
          if (!navigator.onLine && cached) {
            applyChallengePayload(cached, true);
          } else {
            setPageError(cause instanceof Error ? cause.message : 'Could not load this page.');
          }
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [applyChallengePayload, authFetch, loadChallenges, user?.selected_games]);

  useEffect(() => {
    if (!game || !online) return;
    const timer = window.setTimeout(async () => {
      setFinding(true);
      try {
        const params = new URLSearchParams({ game, limit: '12' });
        if (query.trim()) params.set('q', query.trim());
        const response = await authFetch(`/api/challenges/players?${params}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? 'Could not find players.');
        setPlayers(data.players ?? []);
        setDiscoveryError(null);
      } catch (cause) {
        setPlayers([]);
        setDiscoveryError(
          cause instanceof Error ? cause.message : 'Could not find compatible players.'
        );
      } finally {
        setFinding(false);
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [authFetch, game, online, query]);

  const retryPage = async () => {
    setPageError(null);
    setLoading(true);
    try {
      await loadChallenges();
    } catch (cause) {
      setPageError(cause instanceof Error ? cause.message : 'Could not load this page.');
    } finally {
      setLoading(false);
    }
  };

  const recoverFromActionError = async (message: string) => {
    setActionError(message);
    try {
      await loadChallenges(true);
    } catch {
      // Keep the mutation error visible; the player can retry the refresh explicitly.
    }
  };

  const act = async (challenge: MatchChallenge, action: 'accept' | 'decline' | 'cancel') => {
    if (!online) {
      setActionError('You are offline. Reconnect before changing this invite.');
      return;
    }

    setActionId(challenge.id);
    setActionError(null);
    try {
      const response = await authFetch(`/api/challenges/${challenge.id}/${action}`, {
        method: 'POST',
      });
      const data = await response.json();
      if (!response.ok) {
        await recoverFromActionError(data.error ?? 'Could not update this 1v1 invite.');
        return;
      }
      await loadChallenges();
      emitNotificationRefresh();
      if (action === 'accept' && data.match_id) {
        toast.success(data.replayed ? 'Match already created. Opening it now.' : 'Invite accepted. Your match is ready.');
        router.push(data.match_href ?? `/match/${data.match_id}`);
      } else {
        toast.success(action === 'cancel' ? 'Invite cancelled.' : 'Invite declined.');
      }
    } catch {
      await recoverFromActionError(
        'The network dropped before Mechi confirmed the change. Refresh to check the current invite state before trying again.'
      );
    } finally {
      setActionId(null);
    }
  };

  const handleSendError = (failure: ChallengePlayerError) => {
    setActionError(
      failure.status === 409
        ? `${failure.message} Refresh the page to see the current invite.`
        : failure.message
    );
  };

  const ChallengeRow = ({
    challenge,
    direction,
  }: {
    challenge: MatchChallenge;
    direction: ChallengeDirection;
  }) => {
    const player = direction === 'incoming' ? challenge.challenger : challenge.opponent;
    return (
      <article className={styles.challengeRow} id={`challenge-${challenge.id}`}>
        <span className={styles.avatar}>{player?.username?.[0]?.toUpperCase() ?? '?'}</span>
        <div className={styles.challengeCopy}>
          <strong>{player?.username ?? 'Player'}</strong>
          <small>
            {GAMES[challenge.game]?.label ?? challenge.game} · {challenge.platform.toUpperCase()}
          </small>
          <span className={styles.deadline}><Clock3 size={13} /> {formatEatDeadline(challenge.expires_at)}</span>
          {challenge.message ? <p>“{challenge.message}”</p> : null}
        </div>
        <div className={styles.rowActions}>
          {direction === 'incoming' ? (
            <>
              <button
                className={styles.accept}
                disabled={!online || actionId === challenge.id}
                onClick={() => void act(challenge, 'accept')}
              >
                <Check size={15} /> {actionId === challenge.id ? 'Opening…' : 'Accept and play'}
              </button>
              <button
                className={styles.quiet}
                disabled={!online || actionId === challenge.id}
                onClick={() => void act(challenge, 'decline')}
              >
                <X size={15} /> Decline
              </button>
            </>
          ) : (
            <button
              className={styles.quiet}
              disabled={!online || actionId === challenge.id}
              onClick={() => void act(challenge, 'cancel')}
            >
              <X size={15} /> {actionId === challenge.id ? 'Cancelling…' : 'Cancel invite'}
            </button>
          )}
        </div>
      </article>
    );
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p>Player versus player</p>
          <h1>Play 1v1</h1>
          <span>Answer invites first, then choose a compatible opponent for your next match.</span>
        </div>
        <span className={styles.count}>
          <Swords size={17} /> {incoming.length} {incoming.length === 1 ? 'invite' : 'invites'} waiting
        </span>
      </header>

      {!online || stale ? (
        <div className={styles.offline} role="status">
          <WifiOff size={18} />
          <div>
            <strong>{stale ? 'Showing your last known 1v1 activity' : 'You are offline'}</strong>
            <p>Reconnect to accept, decline, cancel, search, or send an invite.</p>
          </div>
        </div>
      ) : null}

      {pageError ? (
        <section className={styles.pageError} role="alert">
          <AlertCircle size={23} />
          <h2>Your 1v1 activity did not load</h2>
          <p>{pageError} Your existing invites are unchanged.</p>
          <button onClick={() => void retryPage()}><RefreshCw size={15} /> Try again</button>
        </section>
      ) : null}

      {actionError ? (
        <div className={styles.actionError} role="alert">
          <AlertCircle size={17} />
          <p>{actionError}</p>
          <button disabled={refreshing || !online} onClick={() => void loadChallenges(true)}>
            <RefreshCw className={refreshing ? styles.spin : ''} size={14} />
            Refresh state
          </button>
        </div>
      ) : null}

      <section className={`${styles.panel} ${styles.incomingPanel}`} aria-labelledby="incoming-title">
        <div className={styles.panelTitle}>
          <div>
            <p className={styles.sectionEyebrow}>Do this first</p>
            <h2 id="incoming-title">Invites waiting for you</h2>
            <p>Accepting creates exactly one match and opens its match room.</p>
          </div>
          <span>{incoming.length} pending</span>
        </div>
        <div className={styles.list}>
          {loading ? (
            <p className={styles.empty}>Loading incoming invites…</p>
          ) : incoming.length ? (
            incoming.map((challenge) => (
              <ChallengeRow key={challenge.id} challenge={challenge} direction="incoming" />
            ))
          ) : (
            <div className={styles.emptyState}>
              <Check size={20} />
              <div><strong>You are caught up</strong><p>No 1v1 invite needs your answer right now.</p></div>
            </div>
          )}
        </div>
      </section>

      <section className={styles.panel} aria-labelledby="opponents-title">
        <div className={styles.panelTitle}>
          <div>
            <p className={styles.sectionEyebrow}>Start a match</p>
            <h2 id="opponents-title">Find a compatible opponent</h2>
            <p>Players shown here use the same game and platform as you.</p>
          </div>
        </div>
        {games.length ? (
          <>
            <div className={styles.filters}>
              <div className={styles.tabs} aria-label="Choose a game">
                {games.map((item) => (
                  <button
                    key={item}
                    className={game === item ? styles.activeTab : ''}
                    onClick={() => setGame(item)}
                    aria-pressed={game === item}
                  >
                    {GAMES[item].label}
                  </button>
                ))}
              </div>
              <label>
                <Search size={17} />
                <span className="sr-only">Search players</span>
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search username"
                  disabled={!online}
                />
              </label>
            </div>
            {discoveryError ? <p className={styles.error}>{discoveryError}</p> : null}
            <div className={styles.players}>
              {finding || loading ? (
                <p className={styles.empty}>Finding compatible players…</p>
              ) : players.length ? (
                players.map((player) => (
                  <article className={styles.player} key={player.id}>
                    <span className={styles.avatar}>{player.username[0]?.toUpperCase()}</span>
                    <div>
                      <strong>{player.username}</strong>
                      <small>
                        {player.division} · {player.rating} rating · {player.region ?? 'Region not set'}
                      </small>
                    </div>
                    {game ? (
                      <ChallengePlayerButton
                        opponentId={player.id}
                        opponentUsername={player.username}
                        game={game}
                        platform={player.platform}
                        label="Send invite"
                        className={styles.accept}
                        disabled={!online}
                        onError={handleSendError}
                        onSuccess={async () => {
                          setActionError(null);
                          await loadChallenges();
                          setPlayers((current) => current.filter((entry) => entry.id !== player.id));
                        }}
                      />
                    ) : null}
                  </article>
                ))
              ) : (
                <p className={styles.empty}>
                  {query ? 'No matching players found.' : 'No compatible players are available right now.'}
                </p>
              )}
            </div>
          </>
        ) : (
          <div className={styles.setup}>
            <Swords size={24} />
            <h3>Add a 1v1 game to your profile</h3>
            <p>You can browse now, but you need a game, platform, and player ID before sending an invite.</p>
            <Link href="/profile">Set up my games</Link>
          </div>
        )}
      </section>

      <section className={styles.panel} aria-labelledby="sent-title">
        <div className={styles.panelTitle}>
          <div>
            <p className={styles.sectionEyebrow}>Waiting on someone else</p>
            <h2 id="sent-title">Invites you sent</h2>
            <p>You can cancel a pending invite before the other player answers.</p>
          </div>
          <span>{sent.length} pending</span>
        </div>
        <div className={styles.list}>
          {sent.length ? (
            sent.map((challenge) => (
              <ChallengeRow key={challenge.id} challenge={challenge} direction="sent" />
            ))
          ) : (
            <p className={styles.empty}>You have no unanswered invites.</p>
          )}
        </div>
      </section>

      <section className={styles.panel} aria-labelledby="history-title">
        <div className={styles.panelTitle}>
          <div>
            <p className={styles.sectionEyebrow}>Recent activity</p>
            <h2 id="history-title">Closed and accepted invites</h2>
            <p>Accepted, declined, cancelled, and expired invites stay visible here.</p>
          </div>
        </div>
        <div className={styles.history}>
          {history.length ? (
            history.map((challenge) => {
              const direction: ChallengeDirection =
                challenge.opponent_id === user?.id ? 'incoming' : 'sent';
              const player = direction === 'incoming' ? challenge.challenger : challenge.opponent;
              const presentation = getChallengeLifecyclePresentation(challenge, direction);
              return (
                <article key={challenge.id} id={`challenge-${challenge.id}`}>
                  <span className={styles.avatar}>{player?.username?.[0]?.toUpperCase() ?? '?'}</span>
                  <div>
                    <strong>{player?.username ?? 'Player'}</strong>
                    <small>
                      {GAMES[challenge.game]?.label ?? challenge.game} · {challenge.platform.toUpperCase()}
                    </small>
                    <p>{presentation.description}</p>
                  </div>
                  <span className={`${styles.status} ${styles[presentation.tone]}`}>
                    {presentation.label}
                  </span>
                  {presentation.actionHref ? (
                    <Link href={presentation.actionHref}>{presentation.actionLabel}</Link>
                  ) : null}
                </article>
              );
            })
          ) : (
            <p className={styles.empty}>No recent 1v1 history yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}
