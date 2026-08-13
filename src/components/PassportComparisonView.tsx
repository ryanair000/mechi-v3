'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Gamepad2, Share2, ShieldCheck, Swords, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth, useAuthFetch } from '@/components/AuthProvider';
import { ChallengePlayerButton } from '@/components/ChallengePlayerButton';
import type { PassportComparisonData, PassportComparisonPlayer } from '@/lib/passport-social-types';

function Player({ player, side }: { player: PassportComparisonPlayer; side: string }) {
  return <div className={`flex items-center gap-3 ${side === 'right' ? 'sm:flex-row-reverse sm:text-right' : ''}`}>
    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-white/5">{player.identity.avatar_url ? <Image src={player.identity.avatar_url} alt="" fill sizes="64px" className="object-cover" /> : <span className="flex h-full items-center justify-center text-2xl font-black" style={{ color: player.identity.card_accent }}>{player.identity.username[0]?.toUpperCase()}</span>}</div>
    <div className="min-w-0"><Link href={`/@${encodeURIComponent(player.identity.username)}`} className="text-xl font-black text-white hover:text-[#32E0C4]">{player.identity.display_name}</Link><p className="truncate text-sm text-white/45">@{player.identity.username}</p><p className="mt-1 text-xs text-white/35">{player.library_stats.total} visible games · {player.library_stats.completed} completed</p></div>
  </div>;
}

export function PassportComparisonView({ username, initialComparison, invitationToken }: { username?: string; initialComparison?: PassportComparisonData; invitationToken?: string }) {
  const { user } = useAuth();
  const authFetch = useAuthFetch();
  const [comparison, setComparison] = useState(initialComparison ?? null);
  const [error, setError] = useState('');
  useEffect(() => {
    if (initialComparison || !username) return;
    authFetch(`/api/passport/compare/${encodeURIComponent(username)}`)
      .then(async (response) => { const payload = await response.json(); if (!response.ok) throw new Error(payload.error); return payload.comparison as PassportComparisonData; })
      .then(setComparison).catch((reason) => setError(reason instanceof Error ? reason.message : 'Could not compare players'));
  }, [authFetch, initialComparison, username]);
  useEffect(() => {
    if (!comparison || !user || initialComparison) return;
    const target = user.id === comparison.left.identity.user_id ? comparison.right.identity.user_id : comparison.left.identity.user_id;
    authFetch('/api/passport/compare/events', { method: 'POST', body: JSON.stringify({ target_id: target, event_type: 'viewed' }) }).catch(() => {});
  }, [authFetch, comparison, initialComparison, user]);
  useEffect(() => {
    if (!invitationToken || !initialComparison) return;
    fetch(`/api/passport/compare/invitations/${encodeURIComponent(invitationToken)}/visit`, {
      method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ left: initialComparison.left.identity.username, right: initialComparison.right.identity.username }),
    }).catch(() => {});
  }, [initialComparison, invitationToken]);
  if (error) return <div className="mx-auto mt-12 max-w-xl rounded-2xl border border-white/10 p-8 text-center text-white/60">{error}</div>;
  if (!comparison) return <div className="p-12 text-center text-white/45">Building the comparison…</div>;
  const opponent = user?.id === comparison.left.identity.user_id ? comparison.right : comparison.left;
  const option = comparison.challenge_options[0];
  const recommendable = user?.id === comparison.left.identity.user_id ? comparison.left_only_games : comparison.right_only_games;
  const canRecommend = comparison.relationship?.friendship_status === 'friends';
  const recommend = async (catalogGameId: string, title: string) => {
    const response = await authFetch('/api/passport/social/recommendations', { method: 'POST', body: JSON.stringify({ recipient_id: opponent.identity.user_id, catalog_game_id: catalogGameId, comparison_key: comparison.comparison_key }) });
    const payload = await response.json() as { error?: string };
    if (!response.ok) toast.error(payload.error ?? 'Could not recommend game'); else {
      toast.success(`${title} recommended to @${opponent.identity.username}`);
      authFetch('/api/passport/compare/events', { method: 'POST', body: JSON.stringify({ target_id: opponent.identity.user_id, event_type: 'recommendation_sent' }) }).catch(() => {});
    }
  };
  const share = async () => {
    let url = `${window.location.origin}/compare/${encodeURIComponent(comparison.left.identity.username)}/vs/${encodeURIComponent(comparison.right.identity.username)}`;
    if (user) {
      const response = await authFetch('/api/passport/compare/invitations', { method: 'POST', body: JSON.stringify({ target_id: opponent.identity.user_id, campaign: 'comparison_share' }) });
      if (response.ok) {
        const invitation = await response.json() as { token: string };
        url += `?invite=${encodeURIComponent(invitation.token)}`;
      }
      authFetch('/api/passport/compare/events', { method: 'POST', body: JSON.stringify({ target_id: opponent.identity.user_id, event_type: 'shared' }) }).catch(() => {});
    }
    if (navigator.share) await navigator.share({ title: 'Our Mechi Gamer Passport comparison', url }); else { await navigator.clipboard.writeText(url); toast.success('Comparison link copied'); }
  };
  return <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-8">
    <section className="rounded-[2rem] border border-white/10 bg-[#0e1927] p-5 sm:p-8">
      <div className="grid items-center gap-6 sm:grid-cols-[1fr_auto_1fr]"><Player player={comparison.left} side="left" /><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-[#32E0C4]/30 bg-[#32E0C4]/10 font-black text-[#32E0C4]">VS</div><Player player={comparison.right} side="right" /></div>
      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5"><div><p className="text-xs font-black uppercase tracking-[.18em] text-white/35">Taste Match</p><p className="mt-1 text-3xl font-black text-white">{comparison.taste_match.score === null ? 'New territory' : `${comparison.taste_match.score}%`} <span className="text-sm text-[#32E0C4]">{comparison.taste_match.label}</span></p></div><div className="flex gap-2"><button onClick={share} className="btn-outline inline-flex items-center gap-2"><Share2 size={15} />Share</button>{option && user ? <ChallengePlayerButton opponentId={opponent.identity.user_id} opponentUsername={opponent.identity.username} game={option.game} platform={option.platform} label="Start challenge" className="btn-primary" onSuccess={() => authFetch('/api/passport/compare/events', { method: 'POST', body: JSON.stringify({ target_id: opponent.identity.user_id, event_type: 'challenge_started' }) }).then(() => undefined)} /> : null}</div></div>
      {comparison.taste_match.discovery_prompt ? <p className="mt-4 rounded-xl bg-[#32E0C4]/8 p-4 text-sm text-[#9af8e9]">{comparison.taste_match.discovery_prompt}</p> : <div className="mt-4 grid gap-2 sm:grid-cols-5">{comparison.taste_match.factors.map((factor) => <div key={factor.key} className="rounded-xl bg-white/[.035] p-3"><p className="text-xs font-bold text-white">{factor.label}</p><p className="mt-1 text-lg font-black text-[#32E0C4]">{factor.points}/{factor.maximum}</p><p className="mt-1 text-[11px] leading-4 text-white/38">{factor.explanation}</p></div>)}</div>}
    </section>
    <section className="mt-5 grid gap-5 lg:grid-cols-3">
      <div className="rounded-2xl border border-white/10 bg-white/[.03] p-5 lg:col-span-2"><h2 className="flex items-center gap-2 font-black text-white"><Gamepad2 size={18} />Games in common ({comparison.shared_games.length})</h2><div className="mt-4 grid gap-3 sm:grid-cols-2">{comparison.shared_games.map((game) => <article key={game.key} className="rounded-xl bg-black/15 p-4"><p className="font-bold text-white">{game.title}</p><div className="mt-2 grid grid-cols-2 gap-2 text-xs text-white/45"><span>{game.left.play_status} · {game.left.rating ?? '—'}/10</span><span>{game.right.play_status} · {game.right.rating ?? '—'}/10</span></div></article>)}</div></div>
      <div className="rounded-2xl border border-white/10 bg-white/[.03] p-5"><h2 className="flex items-center gap-2 font-black text-white"><ShieldCheck size={18} />Verified rivalry</h2><p className="mt-5 text-4xl font-black text-white">{comparison.rivalry.left_wins}–{comparison.rivalry.right_wins}</p><p className="mt-1 text-xs text-white/40">{comparison.rivalry.total_matches} authoritative completed matches</p>{comparison.rivalry.by_game.map((game) => <p key={game.game} className="mt-3 border-t border-white/8 pt-3 text-xs text-white/55">{game.game}: {game.left_wins}–{game.right_wins}</p>)}</div>
    </section>
    <section className="mt-5 grid gap-5 sm:grid-cols-2"><div className="rounded-2xl border border-white/10 p-5"><h2 className="flex gap-2 font-black text-white"><Users size={18} />Mutual circle</h2><p className="mt-3 text-sm text-white/45">{comparison.mutual_friends.length} mutual friends · {comparison.mutual_teams.length} mutual teams</p></div><div className="rounded-2xl border border-white/10 p-5"><h2 className="flex gap-2 font-black text-white"><Swords size={18} />Discovery lanes</h2><p className="mt-3 text-sm text-white/45">{comparison.left_only_games.length} unique to {comparison.left.identity.username} · {comparison.right_only_games.length} unique to {comparison.right.identity.username}</p>{canRecommend && recommendable.length ? <div className="mt-4 flex flex-wrap gap-2">{recommendable.slice(0, 3).map((entry) => <button key={entry.id} className="rounded-full border border-white/10 px-3 py-1.5 text-xs font-bold text-white/65 hover:border-[#32E0C4]/40 hover:text-[#32E0C4]" onClick={() => recommend(entry.catalog_game_id, entry.game.title)}>Recommend {entry.game.title}</button>)}</div> : null}</div></section>
  </main>;
}
