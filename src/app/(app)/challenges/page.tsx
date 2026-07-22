'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Search, Swords, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth, useAuthFetch } from '@/components/AuthProvider';
import { ChallengePlayerButton } from '@/components/ChallengePlayerButton';
import { emitNotificationRefresh } from '@/components/NotificationNavButton';
import { GAMES, normalizeSelectedGameKeys } from '@/lib/config';
import type { ChallengeDiscoveryPlayer, GameKey, MatchChallenge } from '@/types';
import styles from './Challenges.module.css';

const oneVsOneGames = (games: readonly string[]) =>
  normalizeSelectedGameKeys(games).filter((game): game is GameKey => GAMES[game]?.mode === '1v1');

export default function ChallengesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const authFetch = useAuthFetch();
  const [games, setGames] = useState<GameKey[]>(() => oneVsOneGames(user?.selected_games ?? []));
  const [game, setGame] = useState<GameKey | null>(() => games[0] ?? null);
  const [incoming, setIncoming] = useState<MatchChallenge[]>([]);
  const [sent, setSent] = useState<MatchChallenge[]>([]);
  const [players, setPlayers] = useState<ChallengeDiscoveryPlayer[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [finding, setFinding] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadChallenges = useCallback(async () => {
    const response = await authFetch('/api/challenges');
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? 'Could not load your challenges.');
    setIncoming(data.inbound ?? []);
    setSent(data.outbound ?? []);
  }, [authFetch]);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => Promise.all([loadChallenges(), authFetch('/api/users/profile').then((response) => response.json())])
      .then(([, profileData]) => {
        if (!active) return;
        const nextGames = oneVsOneGames(profileData.profile?.selected_games ?? user?.selected_games ?? []);
        setGames(nextGames);
        setGame((current) => current && nextGames.includes(current) ? current : nextGames[0] ?? null);
      })
      .catch((cause) => active && setError(cause instanceof Error ? cause.message : 'Could not load this page.'))
      .finally(() => active && setLoading(false)), 0);
    return () => { active = false; window.clearTimeout(timer); };
  }, [authFetch, loadChallenges, user?.selected_games]);

  useEffect(() => {
    if (!game) return;
    const timer = window.setTimeout(async () => {
      setFinding(true);
      try {
        const params = new URLSearchParams({ game, limit: '12' });
        if (query.trim()) params.set('q', query.trim());
        const response = await authFetch(`/api/challenges/players?${params}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? 'Could not find players.');
        setPlayers(data.players ?? []);
        setError(null);
      } catch (cause) {
        setPlayers([]);
        setError(cause instanceof Error ? cause.message : 'Could not find players.');
      } finally { setFinding(false); }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [authFetch, game, query]);

  const act = async (challenge: MatchChallenge, action: 'accept' | 'decline' | 'cancel') => {
    setActionId(challenge.id);
    try {
      const response = await authFetch(`/api/challenges/${challenge.id}/${action}`, { method: 'POST' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Could not update this challenge.');
      await loadChallenges();
      emitNotificationRefresh();
      if (action === 'accept' && data.match_id) {
        toast.success('Challenge accepted. Your match is ready.');
        router.push(`/match/${data.match_id}`);
      } else toast.success(action === 'cancel' ? 'Challenge cancelled.' : 'Challenge declined.');
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Something went wrong.');
    } finally { setActionId(null); }
  };

  const ChallengeRow = ({ challenge, direction }: { challenge: MatchChallenge; direction: 'incoming' | 'sent' }) => {
    const player = direction === 'incoming' ? challenge.challenger : challenge.opponent;
    return <article className={styles.challengeRow}>
      <span className={styles.avatar}>{player?.username?.[0]?.toUpperCase() ?? '?'}</span>
      <div><strong>{player?.username ?? 'Player'}</strong><small>{GAMES[challenge.game]?.label ?? challenge.game} · {challenge.platform.toUpperCase()}</small></div>
      <div className={styles.rowActions}>
        {direction === 'incoming' ? <>
          <button className={styles.accept} disabled={actionId === challenge.id} onClick={() => void act(challenge, 'accept')}><Check size={15} /> Accept</button>
          <button className={styles.quiet} disabled={actionId === challenge.id} onClick={() => void act(challenge, 'decline')}><X size={15} /> Decline</button>
        </> : <button className={styles.quiet} disabled={actionId === challenge.id} onClick={() => void act(challenge, 'cancel')}><X size={15} /> Cancel</button>}
      </div>
    </article>;
  };

  return <div className={styles.page}>
    <header className={styles.header}>
      <div><p>Play 1v1</p><h1>Choose a player. Send a challenge.</h1><span>No setup maze—pick your game, find an opponent, and play.</span></div>
      <span className={styles.count}><Swords size={17} /> {incoming.length} waiting for you</span>
    </header>

    {incoming.length > 0 && <section className={styles.panel}>
      <div className={styles.panelTitle}><div><h2>Answer these first</h2><p>Accepting creates your match immediately.</p></div></div>
      <div className={styles.list}>{incoming.map((challenge) => <ChallengeRow key={challenge.id} challenge={challenge} direction="incoming" />)}</div>
    </section>}

    <section className={styles.panel}>
      <div className={styles.panelTitle}><div><h2>Find your next opponent</h2><p>Players shown here use the same game and platform as you.</p></div></div>
      {games.length ? <>
        <div className={styles.filters}>
          <div className={styles.tabs}>{games.map((item) => <button key={item} className={game === item ? styles.activeTab : ''} onClick={() => setGame(item)}>{GAMES[item].label}</button>)}</div>
          <label><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search username" /></label>
        </div>
        {error && <p className={styles.error}>{error}</p>}
        <div className={styles.players}>
          {finding || loading ? <p className={styles.empty}>Finding compatible players…</p> : players.length ? players.map((player) => <article className={styles.player} key={player.id}>
            <span className={styles.avatar}>{player.username[0]?.toUpperCase()}</span>
            <div><strong>{player.username}</strong><small>{player.division} · {player.rating} rating · {player.region ?? 'Region not set'}</small></div>
            {game && <ChallengePlayerButton opponentId={player.id} opponentUsername={player.username} game={game} platform={player.platform} label="Challenge" className={styles.accept} onSuccess={async () => { await loadChallenges(); setPlayers((current) => current.filter((entry) => entry.id !== player.id)); }} />}
          </article>) : <p className={styles.empty}>{query ? 'No matching players found.' : 'No compatible players are available right now.'}</p>}
        </div>
      </> : <div className={styles.setup}><Swords size={24} /><h3>Add a 1v1 game to your profile</h3><p>We need your game and platform before we can find fair opponents.</p><a href="/profile">Set up my games</a></div>}
    </section>

    <section className={styles.panel}>
      <div className={styles.panelTitle}><div><h2>Challenges you sent</h2><p>Waiting for the other player to answer.</p></div></div>
      <div className={styles.list}>{sent.length ? sent.map((challenge) => <ChallengeRow key={challenge.id} challenge={challenge} direction="sent" />) : <p className={styles.empty}>You have no unanswered challenges.</p>}</div>
    </section>
  </div>;
}
