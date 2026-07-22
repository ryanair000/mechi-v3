'use client';

import Link from 'next/link';
import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  ArrowRight,
  Check,
  CircleAlert,
  Clock3,
  Gamepad2,
  History,
  MapPin,
  MessageSquareText,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Swords,
  Trophy,
  UserRoundSearch,
  X,
} from 'lucide-react';
import { useAuth, useAuthFetch } from '@/components/AuthProvider';
import {
  GAMES,
  PLATFORMS,
  getCanonicalGameKey,
  normalizeSelectedGameKeys,
} from '@/lib/config';
import type { ChallengeDiscoveryPlayer, GameKey, MatchChallenge, PlatformKey } from '@/types';
import styles from './V51v1Challenges.module.css';

type ChallengeAction = 'accept' | 'decline' | 'cancel';

interface CurrentMatchSummary {
  id: string;
  game?: string | null;
}

interface RecentMatchSummary {
  id: string;
  game: string;
  opponent_username: string;
  result: string;
  rating_change: number;
  completed_at: string;
}

interface V51v1ChallengesProps {
  currentMatch: CurrentMatchSummary | null;
  recentMatches: RecentMatchSummary[];
}

function getEligibleGames(selectedGames: readonly string[] = []): GameKey[] {
  return Array.from(
    new Set(
      normalizeSelectedGameKeys(selectedGames)
        .map((game) => getCanonicalGameKey(game))
        .filter((game): game is GameKey => Boolean(GAMES[game]) && GAMES[game].mode === '1v1')
    )
  );
}

function gameLabel(game: GameKey | string | null | undefined) {
  return game && GAMES[game as GameKey]?.label
    ? GAMES[game as GameKey].label
    : String(game ?? 'Competitive game').replace(/_/g, ' ');
}

function platformLabel(platform: PlatformKey | null | undefined) {
  return platform ? PLATFORMS[platform]?.label ?? platform.toUpperCase() : 'Compatible platform';
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-KE', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Africa/Nairobi',
  }).format(new Date(value));
}

export function V51v1Challenges({ currentMatch, recentMatches }: V51v1ChallengesProps) {
  const router = useRouter();
  const { user } = useAuth();
  const authFetch = useAuthFetch();
  const eligibleGames = useMemo(
    () => getEligibleGames(user?.selected_games ?? []),
    [user?.selected_games]
  );
  const [preferredGame, setPreferredGame] = useState<GameKey | null>(null);
  const [inbound, setInbound] = useState<MatchChallenge[]>([]);
  const [outbound, setOutbound] = useState<MatchChallenge[]>([]);
  const [openChallenges, setOpenChallenges] = useState<MatchChallenge[]>([]);
  const [players, setPlayers] = useState<ChallengeDiscoveryPlayer[]>([]);
  const [platform, setPlatform] = useState<PlatformKey | null>(null);
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query.trim());
  const [selectedOpponent, setSelectedOpponent] = useState<ChallengeDiscoveryPlayer | null>(null);
  const [message, setMessage] = useState('');
  const [loadingChallenges, setLoadingChallenges] = useState(true);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [challengeError, setChallengeError] = useState<string | null>(null);
  const [discoveryError, setDiscoveryError] = useState<string | null>(null);
  const [actionKey, setActionKey] = useState<string | null>(null);
  const [discoveryVersion, setDiscoveryVersion] = useState(0);
  const selectedGame = preferredGame && eligibleGames.includes(preferredGame)
    ? preferredGame
    : eligibleGames[0] ?? null;

  const loadChallenges = useCallback(async (silent = false) => {
    await Promise.resolve();
    if (silent) setRefreshing(true);
    else setLoadingChallenges(true);
    setChallengeError(null);
    try {
      const response = await authFetch('/api/challenges');
      const payload = await response.json() as {
        inbound?: MatchChallenge[];
        outbound?: MatchChallenge[];
        open?: MatchChallenge[];
        error?: string;
      };
      if (!response.ok) throw new Error(payload.error || 'Challenges could not be loaded.');
      setInbound(Array.isArray(payload.inbound) ? payload.inbound : []);
      setOutbound(Array.isArray(payload.outbound) ? payload.outbound : []);
      setOpenChallenges(Array.isArray(payload.open) ? payload.open : []);
    } catch (error) {
      setChallengeError(error instanceof Error ? error.message : 'Challenges could not be loaded.');
    } finally {
      setLoadingChallenges(false);
      setRefreshing(false);
    }
  }, [authFetch]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadChallenges();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadChallenges]);

  useEffect(() => {
    if (!selectedGame) {
      return;
    }

    let active = true;
    const timer = window.setTimeout(async () => {
      setLoadingPlayers(true);
      setDiscoveryError(null);
      const params = new URLSearchParams({ game: selectedGame, limit: '12' });
      if (deferredQuery) params.set('q', deferredQuery);
      try {
        const response = await authFetch(`/api/challenges/players?${params.toString()}`);
        const payload = await response.json() as {
          players?: ChallengeDiscoveryPlayer[];
          platform?: PlatformKey;
          error?: string;
        };
        if (!response.ok) throw new Error(payload.error || 'Opponents could not be loaded.');
        if (active) {
          setPlayers(Array.isArray(payload.players) ? payload.players : []);
          setPlatform(payload.platform ?? null);
        }
      } catch (error) {
        if (active) {
          setPlayers([]);
          setPlatform(null);
          setDiscoveryError(error instanceof Error ? error.message : 'Opponents could not be loaded.');
        }
      } finally {
        if (active) setLoadingPlayers(false);
      }
    }, deferredQuery ? 250 : 0);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [authFetch, deferredQuery, discoveryVersion, selectedGame]);

  async function sendChallenge() {
    if (!selectedOpponent || !selectedGame || !platform) return;
    setActionKey(`send:${selectedOpponent.id}`);
    try {
      const response = await authFetch('/api/challenges', {
        method: 'POST',
        body: JSON.stringify({
          opponent_id: selectedOpponent.id,
          game: selectedGame,
          platform,
          message: message.trim() || undefined,
        }),
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error || 'Challenge could not be sent.');
      toast.success(`Challenge sent to ${selectedOpponent.username}`);
      setSelectedOpponent(null);
      setMessage('');
      setDiscoveryVersion((version) => version + 1);
      await loadChallenges(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Challenge could not be sent.');
    } finally {
      setActionKey(null);
    }
  }

  async function findMatch() {
    if (!selectedGame || !platform) {
      toast.error('Connect a supported game and platform first.');
      return;
    }

    setActionKey('publish-open');
    try {
      const response = await authFetch('/api/challenges', {
        method: 'POST',
        body: JSON.stringify({ visibility: 'open', game: selectedGame, platform }),
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error || 'Open challenge could not be published.');
      toast.success('Open challenge published. We will email you when a player accepts.');
      await loadChallenges(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Open challenge could not be published.');
    } finally {
      setActionKey(null);
    }
  }

  async function updateChallenge(challenge: MatchChallenge, action: ChallengeAction) {
    setActionKey(`${action}:${challenge.id}`);
    try {
      const response = await authFetch(`/api/challenges/${challenge.id}/${action}`, { method: 'POST' });
      const payload = await response.json() as { error?: string; match_id?: string };
      if (!response.ok) throw new Error(payload.error || 'Challenge could not be updated.');
      if (action === 'accept' && payload.match_id) {
        toast.success('Challenge accepted. Your match room is ready.');
        router.push(`/app/player/matches/${payload.match_id}`);
        return;
      }
      toast.success(action === 'decline' ? 'Challenge declined' : 'Challenge cancelled');
      setDiscoveryVersion((version) => version + 1);
      await loadChallenges(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Challenge could not be updated.');
    } finally {
      setActionKey(null);
    }
  }

  const pendingCount = inbound.length + outbound.length;

  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <div>
          <p>Player dashboard</p>
          <h1>1v1 Challenges</h1>
          <span>Find a compatible opponent, send the callout and move into one verified match room.</span>
        </div>
        <div className={styles.headingActions}>
          <button type="button" className={styles.findMatchButton} onClick={() => void findMatch()} disabled={Boolean(currentMatch) || !selectedGame || !platform || Boolean(actionKey)}>
            <UserRoundSearch size={16} />
            {actionKey === 'publish-open' ? 'Publishing…' : 'Find a match'}
          </button>
          <button type="button" onClick={() => void loadChallenges(true)} disabled={refreshing}>
            <RefreshCw size={16} className={refreshing ? styles.spinning : undefined} />
            {refreshing ? 'Refreshing' : 'Refresh'}
          </button>
        </div>
      </header>

      {currentMatch ? (
        <div className={styles.activeMatch}>
          <CircleAlert size={20} />
          <div><strong>Finish your active match before starting another challenge.</strong><span>Your opponent search remains visible, but new callouts are paused until this match closes.</span></div>
          <Link href={`/app/player/matches/${currentMatch.id}`}>Open match room <ArrowRight size={15} /></Link>
        </div>
      ) : null}

      {challengeError ? (
        <div className={styles.errorNotice}><CircleAlert size={18} /><span>{challengeError}</span><button type="button" onClick={() => void loadChallenges()}>Try again</button></div>
      ) : null}

      <div className={styles.inboxGrid}>
        <section className={styles.panel}>
          <PanelHeading icon={<Swords />} title="Challenge inbox" badge={`${pendingCount} pending`} />
          {loadingChallenges ? <RowsSkeleton /> : (
            <div className={styles.challengeColumns}>
              <ChallengeList
                title="Received"
                empty="No player is waiting for your answer."
                challenges={inbound}
                role="inbound"
                actionKey={actionKey}
                acceptDisabled={Boolean(currentMatch)}
                onAction={updateChallenge}
              />
              <ChallengeList
                title="Sent"
                empty="Challenges you send will stay here until answered or cancelled."
                challenges={outbound}
                role="outbound"
                actionKey={actionKey}
                acceptDisabled={false}
                onAction={updateChallenge}
              />
            </div>
          )}
        </section>

        <aside className={styles.panel}>
          <PanelHeading icon={<ShieldCheck />} title="Fair-play checks" />
          <div className={styles.rules}>
            <Rule complete={eligibleGames.length > 0} title="Game connected" copy="Both players need the same supported 1v1 title." />
            <Rule complete={Boolean(platform)} title="Platform aligned" copy="The finder only shows opponents using your platform." />
            <Rule complete={!currentMatch} title="No active match" copy="Finish a live match or leave ranked queue before accepting." />
            <Rule complete title="Result verification" copy="Both players report inside the shared match room." />
          </div>
          {!eligibleGames.length ? <Link className={styles.setupLink} href="/app/player/profile?setup=games">Connect a 1v1 game <ArrowRight size={14} /></Link> : null}
        </aside>
      </div>

      <section className={styles.panel} aria-labelledby="open-challenges-heading">
        <PanelHeading icon={<UserRoundSearch />} title="Open challenges" badge={`${openChallenges.length} available`} />
        <p className={styles.openChallengeIntro} id="open-challenges-heading">Any compatible player can accept one of these callouts. The first valid acceptance creates the match room.</p>
        <ChallengeList
          title="Ready to accept"
          empty="No open challenge is waiting right now. Use Find a match to publish yours."
          challenges={openChallenges}
          role="open"
          actionKey={actionKey}
          acceptDisabled={Boolean(currentMatch)}
          onAction={updateChallenge}
        />
      </section>

      <section className={styles.panel} aria-labelledby="opponent-finder-heading">
        <div className={styles.finderHeading}>
          <div><p>Compatible players</p><h2 id="opponent-finder-heading">Find your next opponent</h2><span>Only players on the same configured game and platform appear.</span></div>
          {platform ? <span className={styles.platformChip}>{platformLabel(platform)}</span> : null}
        </div>

        {eligibleGames.length ? (
          <>
            <div className={styles.gameTabs} aria-label="Choose a 1v1 game">
              {eligibleGames.map((game) => (
                <button key={game} type="button" aria-pressed={selectedGame === game} className={selectedGame === game ? styles.gameTabActive : styles.gameTab} onClick={() => { setPreferredGame(game); setQuery(''); setSelectedOpponent(null); setMessage(''); }}>
                  <Gamepad2 size={15} /> {gameLabel(game)}
                </button>
              ))}
            </div>
            <label className={styles.searchField}>
              <span className={styles.srOnly}>Search opponents by username</span>
              <Search size={17} />
              <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search opponents by username" aria-label="Search opponents by username" />
              {query ? <button type="button" onClick={() => setQuery('')} aria-label="Clear opponent search"><X size={15} /></button> : null}
            </label>

            {discoveryError ? (
              <div className={styles.discoveryState}><CircleAlert size={24} /><h3>Opponent finder needs attention</h3><p>{discoveryError}</p><Link href="/app/player/profile?setup=games">Review game setup</Link></div>
            ) : loadingPlayers ? <PlayersSkeleton /> : players.length ? (
              <div className={styles.playerGrid}>
                {players.map((player) => (
                  <article className={styles.playerCard} key={player.id}>
                    <div className={styles.playerIdentity}><span>{player.username.slice(0, 2).toUpperCase()}</span><div><strong>{player.username}</strong><small><MapPin size={12} /> {player.region || 'Region not set'}</small></div></div>
                    <div className={styles.playerStats}><span><strong>{player.rating}</strong><small>{player.division}</small></span><span><strong>{player.matchesPlayed}</strong><small>matches</small></span><span><strong>Lv {player.level}</strong><small>{platformLabel(player.platform)}</small></span></div>
                    <button type="button" disabled={Boolean(currentMatch)} onClick={() => { setSelectedOpponent(player); setMessage(''); }} aria-label={`Challenge ${player.username}`}>
                      <Swords size={15} /> {currentMatch ? 'Match active' : 'Challenge'}
                    </button>
                  </article>
                ))}
              </div>
            ) : (
              <div className={styles.discoveryState}><UserRoundSearch size={26} /><h3>{deferredQuery ? 'No matching opponent found' : 'No compatible opponent is available'}</h3><p>{deferredQuery ? 'Try another username or clear the search.' : 'Players appear here after connecting the same game and platform.'}</p></div>
            )}
          </>
        ) : (
          <div className={styles.discoveryState}><Gamepad2 size={26} /><h3>Connect a supported 1v1 game first</h3><p>Add a game and in-game identity so Mechi can show only compatible opponents.</p><Link href="/app/player/profile?setup=games">Open game setup</Link></div>
        )}
      </section>

      {selectedOpponent && selectedGame && platform ? (
        <dialog open className={styles.composerBackdrop} aria-labelledby="challenge-composer-title">
          <section className={styles.composer}>
            <button type="button" className={styles.composerClose} onClick={() => { setSelectedOpponent(null); setMessage(''); }} aria-label="Close challenge composer"><X size={17} /></button>
            <div className={styles.composerOpponent}><span>{selectedOpponent.username.slice(0, 2).toUpperCase()}</span><div><p>Challenge selected</p><h2 id="challenge-composer-title">{selectedOpponent.username}</h2><small>{gameLabel(selectedGame)} · {platformLabel(platform)}</small></div></div>
            <label><span>Message <em>Optional</em></span><textarea autoFocus value={message} onChange={(event) => setMessage(event.target.value.slice(0, 160))} placeholder="Add a short callout or timing note" rows={3} /><small>{message.length}/160</small></label>
            <div className={styles.composerActions}><button type="button" className={styles.cancelButton} onClick={() => { setSelectedOpponent(null); setMessage(''); }}>Cancel</button><button type="button" className={styles.sendButton} disabled={actionKey === `send:${selectedOpponent.id}`} onClick={() => void sendChallenge()}><Send size={15} /> {actionKey === `send:${selectedOpponent.id}` ? 'Sending…' : 'Send challenge'}</button></div>
          </section>
        </dialog>
      ) : null}

      <section className={styles.panel}>
        <PanelHeading icon={<History />} title="Recent head-to-head results" />
        {recentMatches.length ? (
          <div className={styles.historyRows}>{recentMatches.slice(0, 6).map((match) => <Link key={match.id} href={`/app/player/matches/${match.id}`}><span className={match.result === 'win' ? styles.win : match.result === 'loss' ? styles.loss : styles.neutral}>{match.result}</span><span><strong>vs {match.opponent_username}</strong><small>{gameLabel(match.game)} · {formatDate(match.completed_at)}</small></span><em>{match.rating_change > 0 ? '+' : ''}{match.rating_change} rating</em><ArrowRight size={15} /></Link>)}</div>
        ) : <div className={styles.emptyHistory}><Trophy size={22} /><div><strong>No verified 1v1 result yet</strong><span>Accepted challenges move into Matches, where both players report the result.</span></div></div>}
      </section>
    </div>
  );
}

function PanelHeading({ icon, title, badge }: { icon: React.ReactNode; title: string; badge?: string }) {
  return <div className={styles.panelHeading}><div>{icon}<h2>{title}</h2></div>{badge ? <span>{badge}</span> : null}</div>;
}

function ChallengeList({ title, empty, challenges, role, actionKey, acceptDisabled, onAction }: { title: string; empty: string; challenges: MatchChallenge[]; role: 'inbound' | 'outbound' | 'open'; actionKey: string | null; acceptDisabled: boolean; onAction: (challenge: MatchChallenge, action: ChallengeAction) => Promise<void> }) {
  return <div className={styles.challengeList}><h3>{title}<span>{challenges.length}</span></h3>{challenges.length ? challenges.map((challenge) => {
    const opponent = role === 'outbound' ? challenge.opponent : challenge.challenger;
    const displayName = role === 'outbound' && challenge.visibility === 'open'
      ? 'Waiting for any player'
      : opponent?.username || 'Mechi player';
    return <article key={challenge.id} className={styles.challengeCard}><div className={styles.challengeIdentity}><span>{displayName.slice(0, 2).toUpperCase() || '1V'}</span><div><strong>{displayName}</strong><small>{gameLabel(challenge.game)} · {platformLabel(challenge.platform)}</small></div></div>{challenge.message ? <p><MessageSquareText size={13} /> “{challenge.message}”</p> : null}<div className={styles.challengeMeta}><span><Clock3 size={12} /> Expires {formatDate(challenge.expires_at)}</span></div><div className={styles.challengeActions}>{role === 'inbound' ? <><button type="button" className={styles.declineButton} disabled={Boolean(actionKey)} onClick={() => void onAction(challenge, 'decline')}>Decline</button><button type="button" className={styles.acceptButton} disabled={Boolean(actionKey) || acceptDisabled} title={acceptDisabled ? 'Finish your active match first' : undefined} onClick={() => void onAction(challenge, 'accept')}><Check size={14} /> {actionKey === `accept:${challenge.id}` ? 'Accepting…' : acceptDisabled ? 'Match active' : 'Accept'}</button></> : role === 'open' ? <button type="button" className={styles.acceptButton} disabled={Boolean(actionKey) || acceptDisabled} title={acceptDisabled ? 'Finish your active match first' : undefined} onClick={() => void onAction(challenge, 'accept')}><Check size={14} /> {actionKey === `accept:${challenge.id}` ? 'Accepting…' : acceptDisabled ? 'Match active' : 'Accept challenge'}</button> : <button type="button" className={styles.declineButton} disabled={Boolean(actionKey)} onClick={() => void onAction(challenge, 'cancel')}>{actionKey === `cancel:${challenge.id}` ? 'Cancelling…' : 'Cancel challenge'}</button>}</div></article>;
  }) : <p className={styles.challengeEmpty}>{empty}</p>}</div>;
}

function Rule({ complete, title, copy }: { complete: boolean; title: string; copy: string }) {
  return <div className={styles.rule}><span className={complete ? styles.ruleComplete : styles.rulePending}>{complete ? <Check size={15} /> : <Clock3 size={15} />}</span><div><strong>{title}</strong><small>{copy}</small></div></div>;
}

function RowsSkeleton() { return <div className={styles.rowsSkeleton}><span /><span /><span /></div>; }
function PlayersSkeleton() { return <div className={styles.playerGrid}>{[1, 2, 3].map((item) => <div className={styles.playerSkeleton} key={item}><span /><span /><span /></div>)}</div>; }
