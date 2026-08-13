'use client';

import { Save, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuthFetch } from '@/components/AuthProvider';

type Settings = { supported_games: string[]; recruitment_status: 'open' | 'selective' | 'closed'; recruitment_headline: string; contact_url: string | null; card_accent: string };
const defaults: Settings = { supported_games: [], recruitment_status: 'closed', recruitment_headline: '', contact_url: null, card_accent: '#32E0C4' };

export function TeamPassportSettings({ teamId }: { teamId: string }) {
  const authFetch = useAuthFetch(); const [settings, setSettings] = useState<Settings>(defaults); const [saving, setSaving] = useState(false);
  useEffect(() => { let active = true; const timer = window.setTimeout(() => { void authFetch(`/api/teams/${teamId}/passport`).then((response) => response.json()).then((payload) => { if (active && payload.settings) setSettings(payload.settings); }); }, 0); return () => { active = false; window.clearTimeout(timer); }; }, [authFetch, teamId]);
  async function save(event: React.FormEvent) { event.preventDefault(); setSaving(true); const response = await authFetch(`/api/teams/${teamId}/passport`, { method: 'PATCH', body: JSON.stringify(settings) }); const payload = await response.json(); setSaving(false); toast[response.ok ? 'success' : 'error'](response.ok ? 'Team Passport saved' : payload.error ?? 'Could not save Team Passport'); }
  return <form onSubmit={save}><div><h2><ShieldCheck size={17} /> Team Passport</h2><p>Control how the public team identity recruits and presents itself.</p></div><label>Supported games<input value={settings.supported_games.join(', ')} onChange={(event) => setSettings((current) => ({ ...current, supported_games: event.target.value.split(',').map((value) => value.trim()).filter(Boolean).slice(0, 12) }))} placeholder="eFootball, CODM, PUBG Mobile" /></label><label>Recruitment<select value={settings.recruitment_status} onChange={(event) => setSettings((current) => ({ ...current, recruitment_status: event.target.value as Settings['recruitment_status'] }))}><option value="open">Open</option><option value="selective">Selective</option><option value="closed">Closed</option></select></label><label>Recruitment headline<input maxLength={140} value={settings.recruitment_headline} onChange={(event) => setSettings((current) => ({ ...current, recruitment_headline: event.target.value }))} placeholder="What kind of players fit this team?" /></label><label>HTTPS contact URL<input type="url" value={settings.contact_url ?? ''} onChange={(event) => setSettings((current) => ({ ...current, contact_url: event.target.value || null }))} placeholder="https://…" /></label><label>Card accent<input type="color" value={settings.card_accent} onChange={(event) => setSettings((current) => ({ ...current, card_accent: event.target.value.toUpperCase() }))} /></label><button disabled={saving}><Save size={16} />{saving ? 'Saving…' : 'Save Team Passport'}</button></form>;
}
