'use client';

import { Eye, EyeOff, ShieldCheck, Star, Trash2, Users } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuthFetch } from '@/components/AuthProvider';
import type { PassportHighlight, PassportHighlightSource } from '@/lib/passport-community-types';

export function PassportHighlightsManager() {
  const authFetch = useAuthFetch();
  const [highlights, setHighlights] = useState<PassportHighlight[]>([]);
  const [sources, setSources] = useState<PassportHighlightSource[]>([]);
  const [sourceKey, setSourceKey] = useState('');
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'friends' | 'private'>('public');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const response = await authFetch('/api/passport/highlights');
    const payload = await response.json();
    if (!response.ok) return toast.error(payload.error ?? 'Could not load highlights');
    setHighlights(payload.highlights ?? []); setSources(payload.sources ?? []);
  }, [authFetch]);

  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const source = sources.find((item) => `${item.source_type}:${item.source_id}` === sourceKey);
    if (!source) return toast.error('Choose a verified source');
    setSaving(true);
    const response = await authFetch('/api/passport/highlights', { method: 'POST', body: JSON.stringify({ source_type: source.source_type, source_id: source.source_id, title, caption, visibility }) });
    const payload = await response.json(); setSaving(false);
    if (!response.ok) return toast.error(payload.error ?? 'Could not save highlight');
    toast.success('Passport highlight saved'); setSourceKey(''); setTitle(''); setCaption(''); await load();
  }

  async function remove(id: string) {
    const response = await authFetch('/api/passport/highlights', { method: 'DELETE', body: JSON.stringify({ highlight_id: id }) });
    if (!response.ok) return toast.error('Could not remove highlight');
    setHighlights((current) => current.filter((item) => item.id !== id));
  }

  return <main className="mx-auto max-w-5xl space-y-5 px-4 py-7 sm:px-7"><header className="card p-6"><p className="brand-kicker">Curated gaming identity</p><h1 className="mt-3 text-3xl font-black text-[var(--text-primary)]">Passport Highlights</h1><p className="mt-2 max-w-2xl text-sm text-[var(--text-secondary)]">Feature moments backed by your game library, achievements, verified matches, event credentials, or active teams.</p></header><form onSubmit={save} className="card grid gap-4 p-5 lg:grid-cols-2"><div className="space-y-3"><label className="block"><span className="label">Verified source</span><select required className="input-field mt-2" value={sourceKey} onChange={(event) => { const value = event.target.value; setSourceKey(value); const source = sources.find((item) => `${item.source_type}:${item.source_id}` === value); if (source && !title) setTitle(source.label); }}><option value="">Choose a gaming moment</option>{sources.map((source) => <option key={`${source.source_type}:${source.source_id}`} value={`${source.source_type}:${source.source_id}`}>{source.label}</option>)}</select></label><label className="block"><span className="label">Highlight title</span><input className="input-field mt-2" required minLength={2} maxLength={120} value={title} onChange={(event) => setTitle(event.target.value)} /></label></div><div className="space-y-3"><label className="block"><span className="label">Caption</span><textarea className="input-field mt-2" maxLength={280} value={caption} onChange={(event) => setCaption(event.target.value)} placeholder="Why this gaming moment matters" /></label><label className="block"><span className="label">Who can see it</span><select className="input-field mt-2" value={visibility} onChange={(event) => setVisibility(event.target.value as typeof visibility)}><option value="public">Public</option><option value="friends">Friends</option><option value="private">Only me</option></select></label><button disabled={saving} className="btn-primary inline-flex items-center gap-2"><Star size={16} />{saving ? 'Saving…' : 'Add highlight'}</button></div></form><section className="grid gap-4 sm:grid-cols-2">{highlights.map((highlight) => <article className="card p-5" key={highlight.id}><div className="flex items-start justify-between gap-3"><div><p className="brand-kicker">{highlight.source_type.replaceAll('_', ' ')}</p><h2 className="mt-2 font-black text-[var(--text-primary)]">{highlight.title}</h2></div><button type="button" aria-label={`Remove ${highlight.title}`} onClick={() => void remove(highlight.id)} className="text-[var(--text-soft)]"><Trash2 size={16} /></button></div><p className="mt-3 text-sm text-[var(--text-secondary)]">{highlight.caption || 'Verified gaming moment'}</p><p className="mt-4 flex items-center gap-2 text-xs font-bold text-[var(--text-soft)]">{highlight.visibility === 'public' ? <Eye size={14} /> : highlight.visibility === 'friends' ? <Users size={14} /> : <EyeOff size={14} />}{highlight.visibility}<ShieldCheck size={14} className="ml-auto text-[var(--brand-teal)]" />Source verified</p></article>)}{!highlights.length ? <div className="card p-8 text-center text-sm text-[var(--text-soft)]">Choose a verified moment to build your showcase.</div> : null}</section></main>;
}
