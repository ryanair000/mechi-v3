'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, CircleAlert, Clock3, MessageSquare, Send, ShieldAlert, Swords, Upload } from 'lucide-react';
import { useAuth, useAuthFetch } from '@/components/AuthProvider';
import { GAMES, requiresMatchScoreReport } from '@/lib/config';
import type { GameKey } from '@/types';
import styles from './V5MatchRoom.module.css';

type MatchPlayer = { id: string; username?: string | null; game_ids?: Record<string, string> | null };
type MatchRoomData = {
  id: string; game: GameKey; platform?: string | null; status: string; player1_id: string; player2_id: string;
  winner_id?: string | null; player1_score?: number | null; player2_score?: number | null;
  player1_reported_winner?: string | null; player2_reported_winner?: string | null;
  dispute_screenshot_url?: string | null; created_at?: string | null; completed_at?: string | null;
  player1: MatchPlayer; player2: MatchPlayer;
};
type ChatMessage = { id: string; body?: string | null; sender_type: string; sender_user_id?: string | null; created_at: string; sender?: { username?: string | null } | null };

export function V5MatchRoom({ matchId }: { matchId: string }) {
  const { user } = useAuth();
  const authFetch = useAuthFetch();
  const [match, setMatch] = useState<MatchRoomData | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [canReply, setCanReply] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [winnerId, setWinnerId] = useState('');
  const [player1Score, setPlayer1Score] = useState('');
  const [player2Score, setPlayer2Score] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [matchResponse, chatResponse] = await Promise.all([authFetch(`/api/matches/${matchId}`), authFetch(`/api/matches/${matchId}/chat`)]);
      const matchPayload = await matchResponse.json().catch(() => null) as { match?: MatchRoomData; error?: string } | null;
      const chatPayload = await chatResponse.json().catch(() => null) as { messages?: ChatMessage[]; can_reply?: boolean } | null;
      if (!matchResponse.ok || !matchPayload?.match) { setError(matchPayload?.error || 'This match could not be opened.'); return; }
      setMatch(matchPayload.match); setMessages(chatPayload?.messages || []); setCanReply(Boolean(chatPayload?.can_reply));
    } catch { setError('Connection interrupted. Refresh to load the match room.'); }
    finally { setLoading(false); }
  }, [authFetch, matchId]);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);
  const scoreRequired = match ? requiresMatchScoreReport(match.game) : false;
  const opponent = useMemo(() => !match ? null : match.player1_id === user?.id ? match.player2 : match.player1, [match, user?.id]);
  const myReport = match?.player1_id === user?.id ? match?.player1_reported_winner : match?.player2_reported_winner;

  async function sendMessage(event: FormEvent) {
    event.preventDefault(); const body = message.trim(); if (!body || busy) return;
    setBusy('message');
    try {
      const response = await authFetch(`/api/matches/${matchId}/chat`, { method: 'POST', body: JSON.stringify({ message: body }) });
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) setError(payload?.error || 'Message could not be sent.'); else { setMessage(''); await load(); }
    } catch { setError('Message could not be sent because the connection was interrupted.'); }
    finally { setBusy(null); }
  }

  async function submitResult() {
    if (!winnerId) return setError('Choose the winner before submitting.');
    if (scoreRequired && (player1Score === '' || player2Score === '')) return setError('Enter both scores before submitting.');
    setBusy('result'); setError(null);
    try {
      const response = await authFetch(`/api/matches/${matchId}/report`, { method: 'POST', body: JSON.stringify({
        winner_id: winnerId,
        ...(scoreRequired ? { player1_score: Number(player1Score), player2_score: Number(player2Score) } : {}),
      }) });
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) setError(payload?.error || 'The result could not be submitted.'); else await load();
    } catch { setError('The result was not submitted. Check your connection and try again.'); }
    finally { setBusy(null); }
  }

  async function uploadEvidence(file: File | null) {
    if (!file) return; setBusy('evidence'); setError(null);
    const formData = new FormData(); formData.append('screenshot', file);
    try {
      const response = await authFetch(`/api/matches/${matchId}/dispute`, { method: 'POST', body: formData });
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) setError(payload?.error || 'Evidence could not be uploaded.'); else await load();
    } catch { setError('Evidence upload was interrupted. Choose the file and try again.'); }
    finally { setBusy(null); }
  }

  if (loading) return <div className={styles.loading}><span/><span/><span/></div>;
  if (!match) return <div className={styles.errorPage}><CircleAlert/><h1>Match unavailable</h1><p>{error || 'This match may be closed or belong to another account.'}</p><Link href="/app/player/matches"><ArrowLeft size={16}/> Back to matches</Link></div>;
  const gameLabel = GAMES[match.game]?.label || match.game;
  const completed = match.status === 'completed';
  const disputed = match.status === 'disputed';

  return <div className={styles.page}>
    <header className={styles.heading}><div><Link href="/app/player/matches"><ArrowLeft size={15}/> Matches</Link><p>Player match workspace</p><h1>{gameLabel} vs {opponent?.username || 'opponent'}</h1><span>Result, evidence, communication and support stay attached to this verified match.</span></div><span className={disputed ? styles.statusDisputed : completed ? styles.statusComplete : styles.statusLive}>{disputed ? 'Dispute review' : completed ? 'Completed' : 'Action open'}</span></header>
    {error ? <div className={styles.alert} role="alert"><CircleAlert size={18}/><span>{error}</span></div> : null}
    <div className={styles.summaryGrid}>
      <section><Swords/><span>Opponent</span><strong>{opponent?.username || 'Assigned player'}</strong><small>{match.platform || 'Platform set by match'}</small></section>
      <section><Clock3/><span>Status</span><strong>{match.status.replace(/_/g,' ')}</strong><small>{completed ? 'Verified result recorded' : disputed ? 'Progression is held' : 'Submit before the deadline'}</small></section>
      <section><CheckCircle2/><span>Your report</span><strong>{myReport ? 'Submitted' : completed ? 'Finalized' : 'Not submitted'}</strong><small>{myReport ? 'Waiting for agreement or review' : 'No result recorded by you'}</small></section>
    </div>
    {disputed ? <div className={styles.disputeNotice}><ShieldAlert size={20}/><div><strong>This match is paused for review.</strong><span>Bracket progression, rank and rewards stay unchanged until a decision is recorded.</span></div></div> : null}
    <div className={styles.columns}>
      <section className={styles.panel}><div className={styles.panelHeading}><div><p>Official action</p><h2>{completed ? 'Final result' : disputed ? 'Evidence for review' : myReport ? 'Result submitted' : 'Submit result'}</h2></div></div>
        {completed ? <div className={styles.finalScore}><span>{match.player1.username}</span><strong>{match.player1_score ?? (match.winner_id === match.player1_id ? 'Winner' : '—')} <em>:</em> {match.player2_score ?? (match.winner_id === match.player2_id ? 'Winner' : '—')}</strong><span>{match.player2.username}</span></div> : disputed ? <div className={styles.evidence}><p>Upload a clear scoreboard, result screen or other relevant image. PNG, JPG and WebP are supported.</p>{match.dispute_screenshot_url ? <a href={match.dispute_screenshot_url} target="_blank" rel="noreferrer">View uploaded evidence</a> : null}<label><Upload size={18}/><span>{busy === 'evidence' ? 'Uploading…' : 'Choose evidence image'}</span><input type="file" accept="image/*" disabled={busy === 'evidence'} onChange={(event) => void uploadEvidence(event.target.files?.[0] || null)}/></label></div> : myReport ? <div className={styles.waiting}><CheckCircle2/><strong>Your result is recorded</strong><span>The match finalizes when both reports agree. A mismatch automatically opens a dispute and protects the competition record.</span></div> : <div className={styles.resultForm}><fieldset><legend>Who won?</legend><div>{[match.player1,match.player2].map((player) => <button type="button" key={player.id} aria-pressed={winnerId === player.id} onClick={() => setWinnerId(player.id)}>{player.username}</button>)}</div></fieldset>{scoreRequired ? <div className={styles.scoreFields}><label><span>{match.player1.username}</span><input type="number" min={0} inputMode="numeric" value={player1Score} onChange={(event) => setPlayer1Score(event.target.value)}/></label><strong>—</strong><label><span>{match.player2.username}</span><input type="number" min={0} inputMode="numeric" value={player2Score} onChange={(event) => setPlayer2Score(event.target.value)}/></label></div> : null}<p>Submitting is an official statement. If the other player reports something different, Mechi opens a protected dispute.</p><button type="button" disabled={busy === 'result'} onClick={submitResult}>{busy === 'result' ? 'Submitting…' : 'Submit official result'}</button></div>}
      </section>
      <section className={styles.panel}><div className={styles.panelHeading}><div><p>Match communication</p><h2>Player thread</h2></div><MessageSquare size={19}/></div><div className={styles.messages}>{messages.length ? messages.map((item) => <article key={item.id} className={item.sender_type === 'system' ? styles.systemMessage : item.sender_user_id === user?.id ? styles.myMessage : styles.theirMessage}><strong>{item.sender_type === 'system' ? 'Mechi' : item.sender?.username || (item.sender_user_id === user?.id ? 'You' : 'Player')}</strong><p>{item.body}</p><time>{new Intl.DateTimeFormat('en-KE',{hour:'2-digit',minute:'2-digit',day:'numeric',month:'short'}).format(new Date(item.created_at))}</time></article>) : <div className={styles.noMessages}>Use this thread for scheduling and match setup. Keep result evidence in the official action panel.</div>}</div><form className={styles.chatForm} onSubmit={sendMessage}><label htmlFor="match-message">Message</label><div><input id="match-message" value={message} maxLength={1000} disabled={!canReply || busy === 'message'} placeholder={canReply ? 'Write a match message…' : 'This thread is read-only'} onChange={(event) => setMessage(event.target.value)}/><button type="submit" disabled={!canReply || !message.trim() || busy === 'message'} aria-label="Send message"><Send size={17}/></button></div></form></section>
    </div>
  </div>;
}
