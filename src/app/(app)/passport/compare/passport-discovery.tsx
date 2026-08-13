'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Search, Swords, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuthFetch } from '@/components/AuthProvider';
import type { PassportSocialProfile } from '@/lib/passport-social-types';

export function PassportDiscovery() {
  const authFetch = useAuthFetch();
  const [query, setQuery] = useState('');
  const [players, setPlayers] = useState<PassportSocialProfile[]>([]);
  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      authFetch(`/api/passport/discover?q=${encodeURIComponent(query)}`, { signal: controller.signal })
        .then((response) => response.ok ? response.json() : { players: [] })
        .then((payload) => setPlayers(payload.players ?? []))
        .catch(() => {});
    }, 200);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [authFetch, query]);
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-8">
      <div className="rounded-[2rem] border border-white/10 bg-[#0e1927] p-6 sm:p-9">
        <p className="text-xs font-black uppercase tracking-[.2em] text-[#32E0C4]">Mechi V5 · Gamer Passport</p>
        <h1 className="mt-3 text-3xl font-black text-white sm:text-5xl">Find your gaming match</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-white/55">Compare visible libraries, favorites, play styles, platforms, mutual circles, and verified head-to-head records.</p>
        <label className="mt-7 flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
          <Search size={18} className="text-white/40" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} className="w-full bg-transparent text-white outline-none placeholder:text-white/30" placeholder="Search a username" />
        </label>
      </div>
      <section className="mt-5 grid gap-3 sm:grid-cols-2">
        {players.map((player) => (
          <article key={player.id} className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[.035] p-4">
            <div className="relative h-12 w-12 overflow-hidden rounded-xl bg-white/5">
              {player.avatar_url ? <Image src={player.avatar_url} alt="" fill sizes="48px" className="object-cover" /> : <span className="flex h-full items-center justify-center font-black" style={{ color: player.card_accent }}>{player.username[0]?.toUpperCase()}</span>}
            </div>
            <div className="min-w-0 flex-1"><h2 className="truncate font-black text-white">{player.display_name}</h2><p className="truncate text-xs text-white/45">@{player.username}{player.location_label ? ` · ${player.location_label}` : ''}</p></div>
            <Link href={`/passport/compare/${encodeURIComponent(player.username)}`} className="btn-primary inline-flex items-center gap-2 text-sm"><Swords size={15} />Compare</Link>
          </article>
        ))}
        {!players.length ? <div className="col-span-full rounded-2xl border border-dashed border-white/10 p-10 text-center text-white/40"><Users className="mx-auto mb-3" />No discoverable players found.</div> : null}
      </section>
    </main>
  );
}
