'use client';

import { Save, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuthFetch } from '@/components/AuthProvider';
import type {
  PassportCvSettings,
  PassportOwnerCompetitiveResume,
} from '@/lib/passport-resume-types';

export function GamerCvSettings() {
  const authFetch = useAuthFetch();
  const [resume, setResume] = useState<PassportOwnerCompetitiveResume | null>(null);
  const [settings, setSettings] = useState<PassportCvSettings | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => { authFetch('/api/passport/resume/me').then((response) => response.json()).then((payload) => { setResume(payload.resume ?? null); setSettings(payload.resume?.cv_settings ?? null); }).catch(() => toast.error('Could not load CV settings')); }, [authFetch]);
  if (!resume || !settings) return <div className="p-12 text-center text-white/45">Loading Gamer CV controls…</div>;
  const save = async () => { setSaving(true); try { const response = await authFetch('/api/passport/resume/settings', { method: 'PATCH', body: JSON.stringify(settings) }); const payload = await response.json(); if (!response.ok) toast.error(payload.error ?? 'Could not save settings'); else toast.success('Gamer CV settings saved'); } finally { setSaving(false); } };
  const toggleGame = (game: string) => setSettings((current) => current ? { ...current, selected_games: current.selected_games.includes(game) ? current.selected_games.filter((item) => item !== game) : [...current.selected_games, game].slice(0, 8) } : current);
  return <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-8"><header><p className="text-xs font-black uppercase tracking-[.2em] text-[#32E0C4]">Gamer CV privacy</p><h1 className="mt-2 text-4xl font-black text-white">Choose your competitive story</h1><p className="mt-3 text-sm text-white/45">The CV never includes private contact details. Inquiry links are optional and owner-controlled.</p></header><section className="mt-6 rounded-2xl border border-white/10 p-5"><label className="block"><span className="text-sm font-bold text-white">Professional headline</span><input className="input-field mt-2" value={settings.headline} maxLength={120} onChange={(event) => setSettings({ ...settings, headline: event.target.value })} placeholder="Competitive eFootball player and community tournament regular" /></label><h2 className="mt-6 font-black text-white">Selected games</h2><div className="mt-3 flex flex-wrap gap-2">{resume.games.map((game) => <button key={game.game} type="button" onClick={() => toggleGame(game.game)} className={`rounded-full border px-3 py-2 text-xs font-bold ${settings.selected_games.includes(game.game) ? 'border-[#32E0C4]/50 bg-[#32E0C4]/10 text-[#32E0C4]' : 'border-white/10 text-white/45'}`}>{game.label}</button>)}</div><div className="mt-6 grid gap-3 sm:grid-cols-3"><Toggle label="Event Passport" checked={settings.include_events} onChange={(checked) => setSettings({ ...settings, include_events: checked })} /><Toggle label="Team history" checked={settings.include_teams} onChange={(checked) => setSettings({ ...settings, include_teams: checked })} /><Toggle label="Achievements" checked={settings.include_achievements} onChange={(checked) => setSettings({ ...settings, include_achievements: checked })} /></div><div className="mt-6 rounded-xl bg-white/[.03] p-4"><Toggle label="Enable inquiry link" checked={settings.inquiry_enabled} onChange={(checked) => setSettings({ ...settings, inquiry_enabled: checked, inquiry_url: checked ? settings.inquiry_url : null })} />{settings.inquiry_enabled ? <input className="input-field mt-3" value={settings.inquiry_url ?? ''} onChange={(event) => setSettings({ ...settings, inquiry_url: event.target.value })} placeholder="https://your-public-contact-page.example" /> : null}</div><div className="mt-6 flex items-center justify-between"><p className="flex items-center gap-2 text-xs text-white/35"><ShieldCheck size={14} />Private contact details stay excluded.</p><button type="button" disabled={saving} onClick={save} className="btn-primary inline-flex items-center gap-2"><Save size={15} />{saving ? 'Saving…' : 'Save settings'}</button></div></section></main>;
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) { return <label className="flex items-center gap-2 rounded-xl border border-white/8 p-3 text-sm font-bold text-white/65"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />{label}</label>; }
