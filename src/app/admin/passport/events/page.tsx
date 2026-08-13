'use client';

import { Copy, Download, QrCode, Search, ShieldCheck, Sparkles } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useAuthFetch } from '@/components/AuthProvider';

type Participant = { id: string; user_id: string; check_in_status: string; user: { username?: string; passport_profiles?: { display_name?: string } | Array<{ display_name?: string }> } | Array<{ username?: string; passport_profiles?: { display_name?: string } | Array<{ display_name?: string }> }> | null };
type Tournament = { id: string; title: string; slug: string; game: string };
function first<T>(value: T | T[] | null) { return Array.isArray(value) ? value[0] ?? null : value; }

export default function AdminEventPassportPage() {
  const authFetch = useAuthFetch();
  const [tournamentId, setTournamentId] = useState('');
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [projecting, setProjecting] = useState(false);
  const load = async () => {
    const response = await authFetch(`/api/admin/passport/tournaments/${encodeURIComponent(tournamentId.trim())}/readiness`);
    const payload = await response.json();
    if (!response.ok) return toast.error(payload.error ?? 'Tournament not found');
    setTournament(payload.tournament); setParticipants(payload.participants ?? []);
  };
  const projectCredentials = async () => {
    if (!tournament) return;
    setProjecting(true);
    try {
      const response = await authFetch('/api/admin/passport/events', { method: 'POST', body: JSON.stringify({ action: 'project_tournament', tournament_id: tournament.id }) });
      const payload = await response.json();
      if (!response.ok) return toast.error(payload.error ?? 'Could not project credentials');
      toast.success(`${payload.projection.created} credentials created, ${payload.projection.existing} already current`);
    } finally { setProjecting(false); }
  };
  const exportReadiness = async () => {
    if (!tournament) return;
    const response = await authFetch(`/api/admin/passport/tournaments/${tournament.id}/readiness?format=csv`);
    if (!response.ok) return toast.error('Could not export Passport linkage');
    const href = URL.createObjectURL(await response.blob());
    const anchor = document.createElement('a');
    anchor.href = href; anchor.download = `${tournament.slug}-passport-readiness.csv`; anchor.click();
    URL.revokeObjectURL(href);
  };
  const issuePass = async (participant: Participant) => {
    if (!tournament) return;
    setBusyId(participant.id);
    try {
      const response = await authFetch('/api/admin/passport/events', { method: 'POST', body: JSON.stringify({
        action: 'issue_checkin_pass', tournament_id: tournament.id, tournament_player_id: participant.id,
        user_id: participant.user_id, event_key: tournament.slug, event_title: tournament.title,
        game: tournament.game, expires_at: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
      }) });
      const payload = await response.json();
      if (!response.ok) return toast.error(payload.error ?? 'Could not issue pass');
      await navigator.clipboard.writeText(payload.pass.check_in_url);
      window.open(`/api/passport/check-in/${encodeURIComponent(payload.pass.token)}/qr`, '_blank', 'noopener,noreferrer');
      toast.success('Single-use check-in link copied');
    } finally { setBusyId(null); }
  };
  return <main className="space-y-5"><header className="card p-6"><p className="brand-kicker">Mechi V5 event trust</p><h1 className="mt-3 text-3xl font-black text-[var(--text-primary)]">Event Passport operations</h1><p className="mt-3 max-w-2xl text-sm text-[var(--text-secondary)]">Review Passport readiness and issue account-bound, single-use QR check-in links. Organizer corrections are audited.</p><div className="mt-5 flex gap-2"><input value={tournamentId} onChange={(event) => setTournamentId(event.target.value)} className="input-field" placeholder="Tournament UUID" /><button type="button" onClick={load} className="btn-primary inline-flex items-center gap-2"><Search size={15} />Load participants</button></div></header>{tournament ? <section className="card p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="section-title">{tournament.game}</p><h2 className="mt-2 text-xl font-black text-[var(--text-primary)]">{tournament.title}</h2></div><div className="flex flex-wrap items-center gap-2"><span className="brand-chip">{participants.length} participants</span><button type="button" onClick={exportReadiness} className="btn-outline inline-flex items-center gap-2 text-xs"><Download size={14} />Export linkage</button><button type="button" disabled={projecting} onClick={projectCredentials} className="btn-outline inline-flex items-center gap-2 text-xs"><Sparkles size={14} />{projecting ? 'Projecting…' : 'Project credentials'}</button></div></div><div className="mt-5 space-y-2">{participants.map((participant) => { const user = first(participant.user); const passport = first(user?.passport_profiles ?? null); return <div key={participant.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-[var(--border-color)] p-4"><div className="flex-1"><p className="font-black text-[var(--text-primary)]">{passport?.display_name ?? user?.username ?? 'Player'}</p><p className="text-xs text-[var(--text-soft)]">@{user?.username ?? 'player'} · {participant.check_in_status.replace('_', ' ')}</p></div><span className="inline-flex items-center gap-1 text-xs text-[var(--brand-teal)]"><ShieldCheck size={14} />Passport linked</span><button disabled={busyId === participant.id || participant.check_in_status === 'checked_in'} type="button" onClick={() => issuePass(participant)} className="btn-outline inline-flex items-center gap-2 text-xs">{busyId === participant.id ? <Copy size={14} /> : <QrCode size={14} />}Issue QR pass</button></div>; })}</div></section> : null}</main>;
}
