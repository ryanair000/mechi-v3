'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { ArrowLeft, Copy, Download, ExternalLink, Loader2, MessageCircle, Sparkles } from 'lucide-react';
import { useAuthFetch } from '@/components/AuthProvider';
import type { PassportOwnerData } from '@/lib/passport-types';

type CardFormat = 'square' | 'story' | 'horizontal';

const FORMAT_INFO: Record<CardFormat, { label: string; dimensions: string; ratio: string; use: string }> = {
  square: { label: 'Square', dimensions: '1080 × 1080', ratio: 'aspect-square', use: 'Feeds and profile posts' },
  story: { label: 'Story', dimensions: '1080 × 1920', ratio: 'aspect-[9/16]', use: 'Instagram and WhatsApp stories' },
  horizontal: { label: 'Horizontal', dimensions: '1200 × 630', ratio: 'aspect-[1200/630]', use: 'WhatsApp links and social previews' },
};

export function GamerCardStudio() {
  const authFetch = useAuthFetch();
  const [format, setFormat] = useState<CardFormat>('horizontal');
  const [imageLoading, setImageLoading] = useState(true);
  const [username, setUsername] = useState('');
  useEffect(() => {
    void authFetch('/api/passport/me').then(async (response) => {
      const body = await response.json() as { passport?: PassportOwnerData };
      const identity = body.passport?.identity;
      setUsername(identity?.publication_status === 'published' ? identity.public_handle ?? '' : '');
    });
  }, [authFetch]);
  const imageUrl = username ? `/api/passport/cards/${encodeURIComponent(username)}?format=${format}` : '';
  const passportPath = username ? `/p/@${encodeURIComponent(username)}` : '/passport';

  const trackShare = (channel: 'clipboard' | 'whatsapp' | 'download') => {
    void authFetch('/api/passport/analytics', {
      method: 'POST',
      body: JSON.stringify({
        event: 'passport_card_shared',
        properties: { format, channel },
      }),
    });
  };

  const copyPassport = async () => {
    if (!username) return toast.error('Publish your Passport before sharing it');
    const url = `${window.location.origin}${passportPath}`;
    try { await navigator.clipboard.writeText(url); trackShare('clipboard'); toast.success('Passport link copied'); }
    catch { toast.error('Could not copy link'); }
  };

  const shareWhatsApp = () => {
    if (!username) return toast.error('Publish your Passport before sharing it');
    const url = `${window.location.origin}${passportPath}`;
    const text = `My PlayMechi Gamer Passport: ${url}`;
    trackShare('whatsapp');
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  };

  return <div className="mx-auto w-full max-w-6xl space-y-5 px-4 py-6 sm:px-6 lg:px-8">
    <section className="overflow-hidden rounded-[var(--radius-panel)] border border-[var(--border-color)] bg-[var(--surface)]"><div className="p-6 sm:p-8" style={{ background: 'radial-gradient(circle at 88% 10%, rgba(50,224,196,.17), transparent 34%)' }}><Link href="/passport" className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-[0.14em] text-[var(--text-soft)]"><ArrowLeft size={14} /> Passport settings</Link><div className="mt-5 flex items-center gap-2"><Sparkles size={18} className="text-[var(--accent-secondary-text)]" /><p className="section-title">Share studio</p></div><h1 className="mt-3 text-3xl font-black text-[var(--text-primary)] sm:text-4xl">Generate your Gamer Card</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">Every card is generated from public Passport data and links viewers back to your canonical Mechi identity.</p></div></section>
    <div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
      <aside className="card self-start p-5"><p className="section-title">Card format</p><div className="mt-4 space-y-2">{(Object.keys(FORMAT_INFO) as CardFormat[]).map((value) => { const info = FORMAT_INFO[value]; return <button key={value} type="button" onClick={() => { setFormat(value); setImageLoading(true); }} className={`w-full rounded-2xl border p-4 text-left ${format === value ? 'border-[rgba(50,224,196,.42)] bg-[rgba(50,224,196,.08)]' : 'border-[var(--border-color)] bg-[var(--surface-elevated)]'}`}><span className="block font-black text-[var(--text-primary)]">{info.label}</span><span className="mt-1 block text-xs text-[var(--text-soft)]">{info.dimensions} · {info.use}</span></button>; })}</div><div className="mt-5 space-y-2"><button type="button" onClick={() => void copyPassport()} className="btn-outline w-full justify-center"><Copy size={14} /> Copy Passport link</button><button type="button" onClick={shareWhatsApp} className="btn-primary w-full justify-center"><MessageCircle size={14} /> Share to WhatsApp</button></div></aside>
      <section className="card p-5 sm:p-7"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="section-title">Live preview</p><h2 className="mt-2 text-xl font-black text-[var(--text-primary)]">{FORMAT_INFO[format].label} Gamer Card</h2></div><div className="flex gap-2"><a href={imageUrl} target="_blank" rel="noreferrer" className="btn-outline"><ExternalLink size={14} /> Open</a><a href={`${imageUrl}&download=1`} className="btn-primary" onClick={() => trackShare('download')}><Download size={14} /> Download PNG</a></div></div><div className="mt-6 flex justify-center overflow-hidden rounded-2xl border border-[var(--border-color)] bg-black/30 p-4"><div className={`relative w-full ${FORMAT_INFO[format].ratio} ${format === 'story' ? 'max-w-[360px]' : format === 'square' ? 'max-w-[600px]' : 'max-w-[820px]'}`}>{imageLoading ? <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#09121d]"><Loader2 className="animate-spin text-white/40" /></div> : null}{imageUrl ? <Image key={imageUrl} src={imageUrl} alt={`${format} Gamer Card preview`} fill unoptimized sizes="(max-width: 1024px) 100vw, 820px" className="object-contain" onLoad={() => setImageLoading(false)} /> : null}</div></div></section>
    </div>
  </div>;
}
