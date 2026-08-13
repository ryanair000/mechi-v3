import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BookOpen, Clock3, Gamepad2, Heart, ShieldCheck, Sparkles, Star } from 'lucide-react';
import { BrandLogo } from '@/components/BrandLogo';
import { getPassportData, getPassportPath, normalizePassportUsername } from '@/lib/passport';
import { PASSPORT_GAME_PLATFORM_LABELS, PASSPORT_GAME_STATUS_LABELS, type PassportGameEntry } from '@/lib/passport-game-types';
import { APP_URL } from '@/lib/urls';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ handle: string }>;
  searchParams: Promise<{ status?: string; platform?: string; genre?: string; year?: string }>;
};

function resolveHandle(value: string): string {
  let decoded = value;
  try { decoded = decodeURIComponent(value); } catch { return ''; }
  return decoded.startsWith('@') ? normalizePassportUsername(decoded) : '';
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params;
  const username = resolveHandle(handle);
  if (!username) return { title: 'Game Library Not Found | Mechi V5' };
  const passport = await getPassportData(username);
  if (!passport) return { title: 'Game Library Not Found | Mechi V5' };
  const title = `${passport.identity.display_name}'s Game Library | PlayMechi`;
  const description = passport.library.access === 'restricted'
    ? `@${passport.identity.username}'s game library is private.`
    : `${passport.library.stats.total} games, ${passport.library.stats.completed} completed, and ${passport.library.stats.total_hours} hours on @${passport.identity.username}'s Gamer Passport.`;
  return {
    title,
    description,
    alternates: { canonical: `${APP_URL}${getPassportPath(passport.identity.username)}/games` },
    openGraph: {
      title,
      description,
      images: [`${APP_URL}/api/passport/cards/${encodeURIComponent(passport.identity.username)}?format=horizontal`],
    },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export default async function PublicGameLibraryPage({ params, searchParams }: Props) {
  const [{ handle }, filters] = await Promise.all([params, searchParams]);
  const username = resolveHandle(handle);
  if (!username) notFound();
  const passport = await getPassportData(username);
  if (!passport) notFound();

  const { identity, library } = passport;
  const filtered = library.entries.filter((entry) => {
    if (filters.status && entry.play_status !== filters.status) return false;
    if (filters.platform && entry.platform !== filters.platform) return false;
    if (filters.genre && !entry.game.genres.includes(filters.genre)) return false;
    if (filters.year && String(entry.game.release_year) !== filters.year) return false;
    return true;
  });
  const featured = library.entries.filter((entry) => entry.is_featured).slice(0, 5);

  return (
    <div className="page-base min-h-screen bg-[linear-gradient(180deg,#071018,#0a1420_42%,#0d1724)] text-white">
      <nav className="border-b border-white/[0.06] bg-black/10 px-4 backdrop-blur sm:px-8"><div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between"><Link href="/playmechi"><BrandLogo size="sm" /></Link><div className="flex items-center gap-2"><Link href={getPassportPath(identity.username)} className="btn-ghost text-sm">Passport overview</Link><Link href="/register" className="btn-primary text-sm">Create yours</Link></div></div></nav>
      <main className="mx-auto w-full max-w-6xl px-4 py-7 sm:px-8 sm:py-10">
        <section className="overflow-hidden rounded-[2rem] border border-white/[0.08] bg-[#0e1927] p-6 sm:p-8" style={{ backgroundImage: `radial-gradient(circle at 90% 10%, ${identity.card_accent}2b, transparent 35%)` }}>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><div className="flex items-center gap-2"><Gamepad2 size={17} style={{ color: identity.card_accent }} /><p className="text-xs font-black uppercase tracking-[0.18em] text-white/48">@{identity.username} · Gamer Passport</p></div><h1 className="mt-3 text-3xl font-black sm:text-5xl">Game Library</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-white/55">Competitive runs, story journeys, favorites, backlogs, and the games that shaped {identity.display_name}.</p></div><Link href={`/api/passport/cards/${encodeURIComponent(identity.username)}?format=horizontal`} className="btn-outline"><Sparkles size={15} /> Open Gamer Card</Link></div>
          {library.access !== 'restricted' ? <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4"><Metric value={library.stats.total} label="Games" /><Metric value={library.stats.playing} label="Playing" /><Metric value={library.stats.completed} label="Completed" /><Metric value={`${library.stats.total_hours}h`} label="Recorded time" /></div> : null}
        </section>

        {library.access === 'restricted' ? <section className="mt-5 rounded-[2rem] border border-white/[0.08] bg-white/[0.035] p-10 text-center"><ShieldCheck className="mx-auto text-white/35" /><h2 className="mt-4 text-xl font-black">This game library is private</h2><p className="mt-2 text-sm text-white/48">The owner controls who can see their gaming history.</p></section> : <>
          {featured.length > 0 ? <section className="mt-6"><div className="mb-4 flex items-center gap-2"><Star size={17} className="fill-amber-300 text-amber-300" /><h2 className="text-lg font-black">Featured showcase</h2></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{featured.map((entry) => <CompactGame key={entry.id} entry={entry} />)}</div></section> : null}

          <section className="card mt-6 p-5"><form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5"><Filter name="status" label="All statuses" current={filters.status} values={library.entries.map((entry) => [entry.play_status, PASSPORT_GAME_STATUS_LABELS[entry.play_status]])} /><Filter name="platform" label="All platforms" current={filters.platform} values={library.stats.platforms.map((value) => [value, PASSPORT_GAME_PLATFORM_LABELS[value]])} /><Filter name="genre" label="All genres" current={filters.genre} values={library.stats.genres.map((value) => [value, value])} /><Filter name="year" label="All years" current={filters.year} values={library.stats.years.map((value) => [String(value), String(value)])} /><button type="submit" className="btn-primary justify-center">Filter library</button></form></section>

          <section className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.length > 0 ? filtered.map((entry) => <PublicGameCard key={entry.id} entry={entry} accent={identity.card_accent} />) : <div className="card col-span-full p-10 text-center"><BookOpen className="mx-auto text-[var(--text-soft)]" /><h2 className="mt-4 text-xl font-black text-[var(--text-primary)]">No games match these filters</h2><Link href={`${getPassportPath(identity.username)}/games`} className="btn-outline mt-4">Clear filters</Link></div>}
          </section>
        </>}
      </main>
    </div>
  );
}

function Metric({ value, label }: { value: number | string; label: string }) {
  return <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4"><p className="text-2xl font-black">{value}</p><p className="mt-1 text-[10px] font-black uppercase tracking-[0.13em] text-white/42">{label}</p></div>;
}

function Filter({ name, label, current, values }: { name: string; label: string; current?: string; values: Array<[string, string]> }) {
  const unique = [...new Map(values.map((value) => [value[0], value])).values()];
  return <select name={name} defaultValue={current ?? ''} className="input-field text-xs"><option value="">{label}</option>{unique.map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select>;
}

function CompactGame({ entry }: { entry: PassportGameEntry }) {
  return <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#101c2a]"><Cover entry={entry} height="h-40" /><div className="p-3"><p className="truncate text-sm font-black">{entry.game.title}</p><p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-white/40">{PASSPORT_GAME_STATUS_LABELS[entry.play_status]}</p>{entry.source_type === 'platform_synced' ? <p className="mt-1 truncate text-[9px] font-black uppercase tracking-wide text-[#32e0c4]">{entry.game.provider_attribution ?? `${entry.game.provider} synced`}</p> : null}</div></div>;
}

function PublicGameCard({ entry, accent }: { entry: PassportGameEntry; accent: string }) {
  return <article className="card overflow-hidden"><Cover entry={entry} height="h-52" /><div className="p-5"><div className="flex items-start justify-between gap-3"><div><h2 className="text-lg font-black text-[var(--text-primary)]">{entry.game.title}</h2><p className="mt-1 text-xs text-[var(--text-soft)]">{PASSPORT_GAME_PLATFORM_LABELS[entry.platform]} · {entry.game.release_year ?? 'Year unknown'}</p>{entry.source_type === 'platform_synced' ? <p className="mt-2 text-[10px] font-black uppercase tracking-wide text-[var(--brand-teal)]">Synced · {entry.game.provider_attribution ?? entry.game.provider}</p> : null}</div>{entry.is_favorite ? <Heart size={17} className="fill-rose-400 text-rose-400" /> : null}</div><div className="mt-4 flex flex-wrap gap-2"><span className="brand-chip">{PASSPORT_GAME_STATUS_LABELS[entry.play_status]}</span>{entry.rating ? <span className="brand-chip" style={{ color: accent }}>{entry.rating}/10</span> : null}{entry.hours_played !== null ? <span className="brand-chip"><Clock3 size={12} /> {entry.hours_played}h</span> : null}</div>{entry.short_review ? entry.contains_spoilers ? <details className="mt-4 rounded-xl border border-[var(--border-color)] p-3 text-sm text-[var(--text-secondary)]"><summary className="cursor-pointer font-black text-[var(--text-primary)]">Show spoiler-marked review</summary><p className="mt-3 leading-6">{entry.short_review}</p></details> : <p className="mt-4 text-sm leading-6 text-[var(--text-secondary)]">{entry.short_review}</p> : null}</div></article>;
}

function Cover({ entry, height }: { entry: PassportGameEntry; height: string }) {
  const source = entry.screenshot_url ?? entry.game.cover_url;
  return <div className={`relative ${height} bg-[linear-gradient(145deg,#1b3043,#0c1724)]`}>{source ? <Image src={source} alt={`${entry.game.title} artwork`} fill sizes="(max-width: 640px) 100vw, 33vw" className="object-cover" /> : <div className="flex h-full items-center justify-center text-6xl font-black text-white/15">{entry.game.title[0]}</div>}{entry.screenshot_url ? <span className="absolute bottom-2 left-2 rounded-full bg-black/65 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-white">Player screenshot</span> : null}</div>;
}
