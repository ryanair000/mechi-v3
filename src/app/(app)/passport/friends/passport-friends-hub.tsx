'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Check, Gamepad2, History, Sparkles, UserPlus, Users, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuthFetch } from '@/components/AuthProvider';
import type { PassportSocialHub, PassportSocialProfile } from '@/lib/passport-social-types';
import type { PassportPlayedTogether } from '@/lib/passport-community-types';

function ProfileRow({ profile, actions }: { profile: PassportSocialProfile; actions?: React.ReactNode }) {
  return <div className="flex items-center gap-3 rounded-xl border border-white/8 bg-black/10 p-3"><div className="relative h-11 w-11 overflow-hidden rounded-xl bg-white/5">{profile.avatar_url ? <Image src={profile.avatar_url} alt="" fill sizes="44px" className="object-cover" /> : <span className="flex h-full items-center justify-center font-black" style={{ color: profile.card_accent }}>{profile.username[0]?.toUpperCase()}</span>}</div><div className="min-w-0 flex-1"><Link href={`/@${encodeURIComponent(profile.username)}`} className="truncate font-bold text-white hover:text-[#32E0C4]">{profile.display_name}</Link><p className="truncate text-xs text-white/40">@{profile.username}</p></div>{actions}</div>;
}

export function PassportFriendsHub() {
  const authFetch = useAuthFetch();
  const [hub, setHub] = useState<PassportSocialHub | null>(null);
  const [playedTogether, setPlayedTogether] = useState<PassportPlayedTogether[]>([]);
  const load = useCallback(async () => { const [socialResponse, contextResponse] = await Promise.all([authFetch('/api/passport/social/me'), authFetch('/api/passport/played-together')]); const [socialPayload, contextPayload] = await Promise.all([socialResponse.json(), contextResponse.json()]); setHub(socialPayload.social ?? null); setPlayedTogether(contextPayload.players ?? []); }, [authFetch]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load().catch(() => toast.error('Could not load your social hub'));
    }, 0);

    return () => window.clearTimeout(timer);
  }, [load]);
  const friendship = async (targetId: string, action: string) => {
    const response = await authFetch('/api/passport/social/friendships', { method: 'POST', body: JSON.stringify({ target_id: targetId, action }) });
    const payload = await response.json();
    if (!response.ok) toast.error(payload.error ?? 'Could not update request'); else { toast.success('Friend request updated'); await load(); }
  };
  const recommendation = async (id: string, status: string) => {
    await authFetch(`/api/passport/social/recommendations/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
    await load();
  };
  if (!hub) return <div className="p-12 text-center text-white/45">Loading your circle…</div>;
  return <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-8">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[.2em] text-[#32E0C4]">Mechi V5 social layer</p><h1 className="mt-2 text-4xl font-black text-white">Your gaming circle</h1><p className="mt-2 text-sm text-white/45">Friends unlock friend-visible history, comparisons, and game recommendations.</p></div><div className="flex gap-2"><Link href="/passport/circles" className="btn-outline inline-flex items-center gap-2"><Sparkles size={16} />Gaming Circles</Link><Link href="/passport/compare" className="btn-primary inline-flex items-center gap-2"><UserPlus size={16} />Find players</Link></div></div>
    {hub.incoming_requests.length ? <section className="mt-7 rounded-2xl border border-[#32E0C4]/20 bg-[#32E0C4]/5 p-5"><h2 className="font-black text-white">Incoming requests ({hub.counts.incoming})</h2><div className="mt-4 grid gap-3 sm:grid-cols-2">{hub.incoming_requests.map((profile) => <ProfileRow key={profile.id} profile={profile} actions={<div className="flex gap-1"><button aria-label="Accept" className="rounded-lg bg-[#32E0C4] p-2 text-black" onClick={() => friendship(profile.id, 'accept')}><Check size={15} /></button><button aria-label="Decline" className="rounded-lg bg-white/8 p-2 text-white/60" onClick={() => friendship(profile.id, 'decline')}><X size={15} /></button></div>} />)}</div></section> : null}
    <div className="mt-5 grid gap-5 lg:grid-cols-2"><section className="rounded-2xl border border-white/10 p-5"><h2 className="flex items-center gap-2 font-black text-white"><Users size={18} />Friends ({hub.counts.friends})</h2><div className="mt-4 space-y-3">{hub.friends.map((profile) => <ProfileRow key={profile.id} profile={profile} actions={<Link className="btn-outline text-xs" href={`/passport/compare/${encodeURIComponent(profile.username)}`}>Compare</Link>} />)}{!hub.friends.length ? <p className="py-8 text-center text-sm text-white/35">No friends yet. Find a player and send the first request.</p> : null}</div></section><section className="rounded-2xl border border-white/10 p-5"><h2 className="flex items-center gap-2 font-black text-white"><Gamepad2 size={18} />Recommendations ({hub.counts.recommendations})</h2><div className="mt-4 space-y-3">{hub.recommendations.map((item) => <article key={item.id} className="rounded-xl bg-white/[.035] p-4"><p className="font-bold text-white">{item.game.title}</p><p className="mt-1 text-xs text-white/45">From @{item.sender.username}{item.message ? ` · ${item.message}` : ''}</p><div className="mt-3 flex gap-2"><button className="btn-primary text-xs" onClick={() => recommendation(item.id, 'saved')}>Save</button><button className="btn-ghost text-xs" onClick={() => recommendation(item.id, 'dismissed')}>Dismiss</button></div></article>)}{!hub.recommendations.length ? <p className="py-8 text-center text-sm text-white/35">Recommendations from friends will land here.</p> : null}</div></section></div>
    <section className="mt-5 rounded-2xl border border-white/10 p-5"><h2 className="font-black text-white">Following {hub.counts.following} · Followers {hub.counts.followers}</h2><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{hub.following.map((profile) => <ProfileRow key={profile.id} profile={profile} />)}</div></section>
    <section className="mt-5 rounded-2xl border border-white/10 p-5"><h2 className="flex items-center gap-2 font-black text-white"><History size={18} />Played together</h2><div className="mt-4 grid gap-3 sm:grid-cols-2">{playedTogether.map((context) => <ProfileRow key={context.player.id} profile={context.player} actions={<span className="text-right text-xs text-white/40">{context.matches} matches<br />{context.games.join(', ')}</span>} />)}{!playedTogether.length ? <p className="text-sm text-white/35">Verified teammates and opponents will appear after completed matches.</p> : null}</div></section>
  </main>;
}
