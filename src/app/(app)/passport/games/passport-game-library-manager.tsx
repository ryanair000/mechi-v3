'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  ArrowLeft, BookOpen, Check, Clock3, Eye, EyeOff, Gamepad2, Heart,
  ImagePlus, Loader2, Pencil, Plus, Search, Sparkles, Star, Trash2, X,
} from 'lucide-react';
import { useAuthFetch } from '@/components/AuthProvider';
import {
  PASSPORT_GAME_PLATFORMS, PASSPORT_GAME_PLATFORM_LABELS, PASSPORT_GAME_STATUSES,
  PASSPORT_GAME_STATUS_LABELS, type PassportCatalogGame, type PassportGameEntry,
  type PassportGameEntryInput, type PassportGameLibrary, type PassportGamePlatform,
  type PassportGameStatus,
} from '@/lib/passport-game-types';
import { PASSPORT_VISIBILITIES, type PassportVisibility } from '@/lib/passport-types';
import type { PassportOwnerData } from '@/lib/passport-types';

type EntryDraft = {
  platform: PassportGamePlatform;
  play_status: PassportGameStatus;
  rating: string;
  hours_played: string;
  started_on: string;
  completed_on: string;
  short_review: string;
  contains_spoilers: boolean;
  is_favorite: boolean;
  is_featured: boolean;
  visibility: PassportVisibility;
};

const EMPTY_DRAFT: EntryDraft = {
  platform: 'unspecified', play_status: 'backlog', rating: '', hours_played: '',
  started_on: '', completed_on: '', short_review: '', contains_spoilers: false,
  is_favorite: false, is_featured: false, visibility: 'public',
};

function draftFromEntry(entry: PassportGameEntry): EntryDraft {
  return {
    platform: entry.platform,
    play_status: entry.play_status,
    rating: entry.rating === null ? '' : String(entry.rating),
    hours_played: entry.hours_played === null ? '' : String(entry.hours_played),
    started_on: entry.started_on ?? '',
    completed_on: entry.completed_on ?? '',
    short_review: entry.short_review,
    contains_spoilers: entry.contains_spoilers,
    is_favorite: entry.is_favorite,
    is_featured: entry.is_featured,
    visibility: entry.visibility,
  };
}

function toPayload(draft: EntryDraft): Omit<PassportGameEntryInput, 'catalog_game_id'> {
  return {
    platform: draft.platform,
    play_status: draft.play_status,
    rating: draft.rating ? Number(draft.rating) : null,
    hours_played: draft.hours_played ? Number(draft.hours_played) : null,
    started_on: draft.started_on || null,
    completed_on: draft.completed_on || null,
    short_review: draft.short_review,
    contains_spoilers: draft.contains_spoilers,
    is_favorite: draft.is_favorite,
    is_featured: draft.is_featured,
    visibility: draft.visibility,
  };
}

export function PassportGameLibraryManager() {
  const authFetch = useAuthFetch();
  const [publicHandle, setPublicHandle] = useState('');
  const [library, setLibrary] = useState<PassportGameLibrary | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [catalogue, setCatalogue] = useState<PassportCatalogGame[]>([]);
  const [catalogueLoading, setCatalogueLoading] = useState(false);
  const [selectedGame, setSelectedGame] = useState<PassportCatalogGame | null>(null);
  const [draft, setDraft] = useState<EntryDraft>(EMPTY_DRAFT);
  const [editing, setEditing] = useState<PassportGameEntry | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyEntryId, setBusyEntryId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | PassportGameStatus>('all');
  const [platformFilter, setPlatformFilter] = useState<'all' | PassportGamePlatform>('all');
  const [genreFilter, setGenreFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState('all');

  const loadLibrary = useCallback(async () => {
    try {
      const response = await authFetch('/api/passport/games');
      const body = await response.json() as { error?: string; library?: PassportGameLibrary };
      if (!response.ok || !body.library) throw new Error(body.error ?? 'Could not load game library');
      setLibrary(body.library);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not load game library');
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    let active = true;
    void authFetch('/api/passport/games')
      .then(async (response) => {
        const body = await response.json() as { error?: string; library?: PassportGameLibrary };
        if (!active) return;
        if (!response.ok || !body.library) throw new Error(body.error ?? 'Could not load game library');
        setLibrary(body.library);
      })
      .catch((error) => {
        if (active) toast.error(error instanceof Error ? error.message : 'Could not load game library');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [authFetch]);

  useEffect(() => {
    void authFetch('/api/passport/me').then(async (response) => {
      const body = await response.json() as { passport?: PassportOwnerData };
      const identity = body.passport?.identity;
      setPublicHandle(identity?.publication_status === 'published' ? identity.public_handle ?? '' : '');
    });
  }, [authFetch]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setCatalogueLoading(true);
      void fetch(`/api/passport/games/catalog?q=${encodeURIComponent(searchQuery)}`, { signal: controller.signal })
        .then(async (response) => response.json() as Promise<{ games?: PassportCatalogGame[] }>)
        .then((body) => setCatalogue(body.games ?? []))
        .catch((error) => {
          if ((error as Error).name !== 'AbortError') toast.error('Could not search the game catalogue');
        })
        .finally(() => setCatalogueLoading(false));
    }, searchQuery ? 220 : 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [searchQuery]);

  const updateEntryInState = (nextEntry: PassportGameEntry) => {
    setLibrary((current) => current ? {
      ...current,
      entries: current.entries.map((entry) => entry.id === nextEntry.id ? nextEntry : entry),
    } : current);
  };

  const addGame = async () => {
    if (!selectedGame) return;
    setSaving(true);
    try {
      const response = await authFetch('/api/passport/games', {
        method: 'POST',
        body: JSON.stringify({ catalog_game_id: selectedGame.id, ...toPayload(draft) }),
      });
      const body = await response.json() as { error?: string; entry?: PassportGameEntry };
      if (!response.ok || !body.entry) throw new Error(body.error ?? 'Could not add game');
      setSelectedGame(null);
      setDraft(EMPTY_DRAFT);
      setSearchQuery('');
      toast.success(`${body.entry.game.title} added to your Passport`);
      await loadLibrary();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not add game');
    } finally { setSaving(false); }
  };

  const saveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const response = await authFetch(`/api/passport/games/${editing.id}`, {
        method: 'PATCH', body: JSON.stringify(toPayload(draft)),
      });
      const body = await response.json() as { error?: string; entry?: PassportGameEntry };
      if (!response.ok || !body.entry) throw new Error(body.error ?? 'Could not update game');
      updateEntryInState(body.entry);
      setEditing(null);
      setDraft(EMPTY_DRAFT);
      toast.success('Game entry updated');
      await loadLibrary();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update game');
    } finally { setSaving(false); }
  };

  const patchEntry = async (entry: PassportGameEntry, patch: Partial<PassportGameEntryInput>) => {
    setBusyEntryId(entry.id);
    try {
      const response = await authFetch(`/api/passport/games/${entry.id}`, {
        method: 'PATCH', body: JSON.stringify(patch),
      });
      const body = await response.json() as { error?: string; entry?: PassportGameEntry };
      if (!response.ok || !body.entry) throw new Error(body.error ?? 'Could not update game');
      updateEntryInState(body.entry);
      await loadLibrary();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update game');
    } finally { setBusyEntryId(null); }
  };

  const removeEntry = async (entry: PassportGameEntry) => {
    if (!window.confirm(`Remove ${entry.game.title} from your Passport?`)) return;
    setBusyEntryId(entry.id);
    try {
      const response = await authFetch(`/api/passport/games/${entry.id}`, { method: 'DELETE' });
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(body.error ?? 'Could not remove game');
      toast.success('Game removed');
      await loadLibrary();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not remove game');
    } finally { setBusyEntryId(null); }
  };

  const uploadScreenshot = async (entry: PassportGameEntry, file: File) => {
    setBusyEntryId(entry.id);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await authFetch(`/api/passport/games/${entry.id}/screenshot`, { method: 'POST', body: formData });
      const body = await response.json() as { error?: string; entry?: PassportGameEntry };
      if (!response.ok || !body.entry) throw new Error(body.error ?? 'Could not upload screenshot');
      updateEntryInState(body.entry);
      toast.success('Screenshot added');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not upload screenshot');
    } finally { setBusyEntryId(null); }
  };

  const visibleEntries = useMemo(() => (library?.entries ?? []).filter((entry) => {
    if (statusFilter !== 'all' && entry.play_status !== statusFilter) return false;
    if (platformFilter !== 'all' && entry.platform !== platformFilter) return false;
    if (genreFilter !== 'all' && !entry.game.genres.includes(genreFilter)) return false;
    if (yearFilter !== 'all' && String(entry.game.release_year) !== yearFilter) return false;
    return true;
  }), [genreFilter, library?.entries, platformFilter, statusFilter, yearFilter]);

  const onboardingCount = Math.min(library?.entries.length ?? 0, 5);
  const genres = library?.stats.genres ?? [];
  const years = library?.stats.years ?? [];

  if (loading) return <div className="mx-auto w-full max-w-7xl space-y-4 px-4 py-6"><div className="h-52 shimmer" /><div className="h-96 shimmer" /></div>;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5 px-4 py-6 sm:px-6 lg:px-8">
      <section className="overflow-hidden rounded-[var(--radius-panel)] border border-[var(--border-color)] bg-[var(--surface)]">
        <div className="relative overflow-hidden px-5 py-7 sm:px-7" style={{ background: 'radial-gradient(circle at 86% 16%, rgba(50,224,196,.18), transparent 34%), linear-gradient(135deg, var(--surface-strong), var(--surface))' }}>
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <Link href="/passport" className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-[0.14em] text-[var(--text-soft)] hover:text-[var(--text-primary)]"><ArrowLeft size={14} /> Passport settings</Link>
              <div className="mt-4 flex items-center gap-2"><Gamepad2 size={17} className="text-[var(--accent-secondary-text)]" /><p className="section-title">Mechi V5 game identity</p></div>
              <h1 className="mt-3 text-3xl font-black text-[var(--text-primary)] sm:text-4xl">Your gaming life, in one library</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">Add competitive, story, casual, retro, and mobile games—including titles you played before joining Mechi.</p>
            </div>
            {publicHandle ? <Link href={`/@${encodeURIComponent(publicHandle)}/games`} className="btn-outline"><Eye size={15} /> Public library</Link> : null}
          </div>
        </div>
      </section>

      {!library?.storage_ready ? <section className="rounded-2xl border border-amber-300/20 bg-amber-300/[0.07] p-4 text-sm leading-6 text-amber-100/80">The Phase 2 game-library migration has not been applied here. You can browse the launch catalogue, but saving is disabled until storage is ready.</section> : null}

      <section className="card p-5 sm:p-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div><p className="section-title">Five-game start</p><h2 className="mt-2 text-xl font-black text-[var(--text-primary)]">Build a credible Passport in minutes</h2><p className="mt-2 text-sm text-[var(--text-secondary)]">Start with five games that explain who you are as a gamer.</p></div>
          <div className="min-w-64"><div className="flex items-center justify-between text-xs font-black uppercase tracking-[0.12em] text-[var(--text-soft)]"><span>{onboardingCount} of 5 games</span><span>{onboardingCount === 5 ? 'Ready to share' : `${5 - onboardingCount} remaining`}</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-white/[0.06]"><div className="h-full rounded-full bg-[var(--brand-teal)] transition-all" style={{ width: `${onboardingCount * 20}%` }} /></div></div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(320px,.78fr)_minmax(0,1.45fr)]">
        <section className="card self-start p-5 sm:p-6 xl:sticky xl:top-5">
          <div className="flex items-center justify-between"><div><p className="section-title">Add a game</p><h2 className="mt-2 text-xl font-black text-[var(--text-primary)]">Search the catalogue</h2></div><Plus className="text-[var(--text-soft)]" /></div>
          <label className="relative mt-5 block"><Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-soft)]" size={17} /><input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} className="input-field pl-10" placeholder="Try Witcher, CODM, FIFA..." /></label>
          <div className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
            {catalogueLoading ? <div className="flex items-center justify-center py-8"><Loader2 className="animate-spin text-[var(--text-soft)]" /></div> : catalogue.map((game) => (
              <button key={game.id} type="button" onClick={() => { setSelectedGame(game); setDraft(EMPTY_DRAFT); }} className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition ${selectedGame?.id === game.id ? 'border-[rgba(50,224,196,.45)] bg-[rgba(50,224,196,.08)]' : 'border-[var(--border-color)] bg-[var(--surface-elevated)] hover:border-white/20'}`}>
                <GameCover game={game} /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-black text-[var(--text-primary)]">{game.title}</span><span className="mt-1 block truncate text-xs text-[var(--text-soft)]">{game.release_year ?? 'Year unknown'} · {game.genres.slice(0, 2).join(' · ') || 'Game'}</span></span>{selectedGame?.id === game.id ? <Check size={16} className="text-[var(--brand-teal)]" /> : null}
              </button>
            ))}
          </div>
          {selectedGame ? <div className="mt-5 border-t border-[var(--border-color)] pt-5"><div className="mb-4 flex items-center justify-between"><p className="font-black text-[var(--text-primary)]">Add {selectedGame.title}</p><button type="button" onClick={() => setSelectedGame(null)} className="icon-btn"><X size={15} /></button></div><EntryForm draft={draft} setDraft={setDraft} availablePlatforms={selectedGame.platforms} /><button type="button" onClick={() => void addGame()} disabled={saving || !library?.storage_ready} className="btn-primary mt-5 w-full justify-center">{saving ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} Add to Passport</button></div> : null}
        </section>

        <section className="space-y-4">
          <div className="card p-5 sm:p-6"><div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><p className="section-title">Your library</p><h2 className="mt-2 text-xl font-black text-[var(--text-primary)]">{library?.entries.length ?? 0} games · {library?.stats.total_hours ?? 0} hours</h2></div><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4"><FilterSelect value={statusFilter} onChange={(value) => setStatusFilter(value as typeof statusFilter)} options={[['all','All statuses'], ...PASSPORT_GAME_STATUSES.map((value) => [value, PASSPORT_GAME_STATUS_LABELS[value]] as [string,string])]} /><FilterSelect value={platformFilter} onChange={(value) => setPlatformFilter(value as typeof platformFilter)} options={[['all','All platforms'], ...PASSPORT_GAME_PLATFORMS.map((value) => [value, PASSPORT_GAME_PLATFORM_LABELS[value]] as [string,string])]} /><FilterSelect value={genreFilter} onChange={setGenreFilter} options={[['all','All genres'], ...genres.map((value) => [value, value] as [string,string])]} /><FilterSelect value={yearFilter} onChange={setYearFilter} options={[['all','All years'], ...years.map((value) => [String(value), String(value)] as [string,string])]} /></div></div></div>

          {visibleEntries.length > 0 ? visibleEntries.map((entry) => (
            <article key={entry.id} className="card overflow-hidden"><div className="grid sm:grid-cols-[150px_minmax(0,1fr)]"><div className="relative min-h-44 bg-[var(--surface-elevated)]"><GameCover game={entry.game} fill />{entry.screenshot_url ? <div className="absolute bottom-2 left-2 rounded-full bg-black/65 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-white">Screenshot attached</div> : null}</div><div className="p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><h3 className="text-lg font-black text-[var(--text-primary)]">{entry.game.title}</h3>{entry.is_favorite ? <Heart size={15} className="fill-rose-400 text-rose-400" /> : null}{entry.is_featured ? <Star size={15} className="fill-amber-300 text-amber-300" /> : null}</div><p className="mt-1 text-xs text-[var(--text-soft)]">{PASSPORT_GAME_PLATFORM_LABELS[entry.platform]} · {entry.game.release_year ?? 'Year unknown'} · {entry.visibility === 'public' ? 'Public' : entry.visibility === 'friends' ? 'Friends' : 'Only me'}</p></div><select value={entry.play_status} disabled={busyEntryId === entry.id} onChange={(event) => void patchEntry(entry, { play_status: event.target.value as PassportGameStatus })} className="input-field max-w-48 text-xs">{PASSPORT_GAME_STATUSES.map((status) => <option key={status} value={status}>{PASSPORT_GAME_STATUS_LABELS[status]}</option>)}</select></div>
              <div className="mt-4 flex flex-wrap gap-2 text-xs text-[var(--text-secondary)]">{entry.rating ? <span className="brand-chip">{entry.rating}/10</span> : null}{entry.hours_played !== null ? <span className="brand-chip"><Clock3 size={12} /> {entry.hours_played}h</span> : null}{entry.game.genres.slice(0,3).map((genre) => <span key={genre} className="brand-chip capitalize">{genre}</span>)}</div>
              {entry.short_review ? <p className="mt-4 text-sm leading-6 text-[var(--text-secondary)]">{entry.contains_spoilers ? 'Spoiler-marked review — open Edit to view or change it.' : entry.short_review}</p> : null}
              <div className="mt-5 flex flex-wrap gap-2"><button type="button" onClick={() => void patchEntry(entry, { is_favorite: !entry.is_favorite })} disabled={busyEntryId === entry.id} className="btn-ghost text-xs"><Heart size={14} /> {entry.is_favorite ? 'Unfavorite' : 'Favorite'}</button><button type="button" onClick={() => void patchEntry(entry, { is_featured: !entry.is_featured })} disabled={busyEntryId === entry.id} className="btn-ghost text-xs"><Star size={14} /> {entry.is_featured ? 'Unfeature' : 'Feature'}</button><button type="button" onClick={() => { setEditing(entry); setDraft(draftFromEntry(entry)); }} className="btn-ghost text-xs"><Pencil size={14} /> Edit</button><label className="btn-ghost cursor-pointer text-xs"><ImagePlus size={14} /> Screenshot<input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadScreenshot(entry, file); event.target.value = ''; }} /></label><button type="button" onClick={() => void removeEntry(entry)} disabled={busyEntryId === entry.id} className="btn-ghost text-xs text-rose-300"><Trash2 size={14} /> Remove</button></div>
            </div></div></article>
          )) : <div className="card p-10 text-center"><BookOpen className="mx-auto h-8 w-8 text-[var(--text-soft)]" /><h3 className="mt-4 text-xl font-black text-[var(--text-primary)]">No games in this view</h3><p className="mt-2 text-sm text-[var(--text-secondary)]">Add a memorable game or change the filters.</p></div>}
        </section>
      </div>

      {editing ? <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-5" role="dialog" aria-modal="true" aria-label={`Edit ${editing.game.title}`}><div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-[2rem] border border-[var(--border-color)] bg-[var(--surface)] p-5 shadow-2xl sm:rounded-[2rem] sm:p-7"><div className="flex items-start justify-between gap-4"><div><p className="section-title">Edit game record</p><h2 className="mt-2 text-2xl font-black text-[var(--text-primary)]">{editing.game.title}</h2></div><button type="button" onClick={() => setEditing(null)} className="icon-btn"><X size={18} /></button></div><div className="mt-6"><EntryForm draft={draft} setDraft={setDraft} availablePlatforms={editing.game.platforms} /></div><div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setEditing(null)} className="btn-outline">Cancel</button><button type="button" onClick={() => void saveEdit()} disabled={saving} className="btn-primary">{saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Save record</button></div></div></div> : null}
    </div>
  );
}

function EntryForm({ draft, setDraft, availablePlatforms }: { draft: EntryDraft; setDraft: React.Dispatch<React.SetStateAction<EntryDraft>>; availablePlatforms: string[] }) {
  const platforms = PASSPORT_GAME_PLATFORMS.filter((platform) => platform === 'unspecified' || availablePlatforms.includes(platform));
  return <div className="space-y-4"><div className="grid gap-4 sm:grid-cols-2">
    <label><span className="label">Platform</span><select value={draft.platform} onChange={(event) => setDraft((current) => ({ ...current, platform: event.target.value as PassportGamePlatform }))} className="input-field mt-1.5">{platforms.map((platform) => <option key={platform} value={platform}>{PASSPORT_GAME_PLATFORM_LABELS[platform]}</option>)}</select></label>
    <label><span className="label">Status</span><select value={draft.play_status} onChange={(event) => setDraft((current) => ({ ...current, play_status: event.target.value as PassportGameStatus }))} className="input-field mt-1.5">{PASSPORT_GAME_STATUSES.map((status) => <option key={status} value={status}>{PASSPORT_GAME_STATUS_LABELS[status]}</option>)}</select></label>
    <label><span className="label">Rating (1–10)</span><input type="number" min="1" max="10" step="1" value={draft.rating} onChange={(event) => setDraft((current) => ({ ...current, rating: event.target.value }))} className="input-field mt-1.5" placeholder="Optional" /></label>
    <label><span className="label">Hours played</span><input type="number" min="0" max="100000" step="0.1" value={draft.hours_played} onChange={(event) => setDraft((current) => ({ ...current, hours_played: event.target.value }))} className="input-field mt-1.5" placeholder="Optional" /></label>
    <label><span className="label">Started</span><input type="date" value={draft.started_on} onChange={(event) => setDraft((current) => ({ ...current, started_on: event.target.value }))} className="input-field mt-1.5" /></label>
    <label><span className="label">Completed</span><input type="date" value={draft.completed_on} onChange={(event) => setDraft((current) => ({ ...current, completed_on: event.target.value }))} className="input-field mt-1.5" /></label>
  </div><label><span className="label">Short review</span><textarea value={draft.short_review} onChange={(event) => setDraft((current) => ({ ...current, short_review: event.target.value.slice(0, 500) }))} rows={3} className="input-field mt-1.5 resize-none" placeholder="What did this game mean to you?" /><span className="mt-1 block text-right text-[10px] text-[var(--text-soft)]">{draft.short_review.length}/500</span></label><label><span className="label">Visibility</span><select value={draft.visibility} onChange={(event) => setDraft((current) => ({ ...current, visibility: event.target.value as PassportVisibility }))} className="input-field mt-1.5">{PASSPORT_VISIBILITIES.map((visibility) => <option key={visibility} value={visibility}>{visibility === 'public' ? 'Public' : visibility === 'friends' ? 'Friends only' : 'Only me'}</option>)}</select></label><div className="grid gap-2 sm:grid-cols-3"><ToggleButton active={draft.is_favorite} onClick={() => setDraft((current) => ({ ...current, is_favorite: !current.is_favorite }))} icon={<Heart size={14} />} label="Favorite" /><ToggleButton active={draft.is_featured} onClick={() => setDraft((current) => ({ ...current, is_featured: !current.is_featured }))} icon={<Sparkles size={14} />} label="Feature" /><ToggleButton active={draft.contains_spoilers} onClick={() => setDraft((current) => ({ ...current, contains_spoilers: !current.contains_spoilers }))} icon={draft.contains_spoilers ? <EyeOff size={14} /> : <Eye size={14} />} label="Contains spoilers" /></div></div>;
}

function ToggleButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return <button type="button" onClick={onClick} className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-black transition ${active ? 'border-[rgba(50,224,196,.4)] bg-[rgba(50,224,196,.1)] text-[var(--accent-secondary-text)]' : 'border-[var(--border-color)] text-[var(--text-secondary)]'}`}>{icon}{label}</button>;
}

function FilterSelect({ value, onChange, options }: { value: string; onChange: (value: string) => void; options: Array<[string, string]> }) {
  return <select value={value} onChange={(event) => onChange(event.target.value)} className="input-field text-xs">{options.map(([optionValue, label]) => <option key={optionValue} value={optionValue}>{label}</option>)}</select>;
}

function GameCover({ game, fill = false }: { game: PassportCatalogGame; fill?: boolean }) {
  if (game.cover_url) return fill ? <Image src={game.cover_url} alt={`${game.title} cover`} fill sizes="150px" className="object-cover" /> : <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded-lg"><Image src={game.cover_url} alt="" fill sizes="48px" className="object-cover" /></div>;
  return <div className={fill ? 'flex h-full min-h-44 w-full items-center justify-center bg-[linear-gradient(145deg,#1b3043,#0c1724)] text-5xl font-black text-white/18' : 'flex h-16 w-12 shrink-0 items-center justify-center rounded-lg bg-[linear-gradient(145deg,#1b3043,#0c1724)] text-xl font-black text-white/25'}>{game.title[0]?.toUpperCase()}</div>;
}
