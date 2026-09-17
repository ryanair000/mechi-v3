'use client';

import { Download, FileJson, Loader2, ShieldCheck } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuthFetch } from '@/components/AuthProvider';

type ExportRow = {
  id: string;
  status: 'ready' | 'failed' | 'expired';
  requested_at: string;
  expires_at: string;
  downloaded_at: string | null;
  download_count: number;
  manifest: { sections?: string[] };
};

export function PassportExportPanel() {
  const authFetch = useAuthFetch();
  const [exports, setExports] = useState<ExportRow[]>([]);
  const [creating, setCreating] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const load = useCallback(async () => {
    const response = await authFetch('/api/passport/me/export');
    const payload = await response.json() as { exports?: ExportRow[]; error?: string };
    if (response.ok) setExports(payload.exports ?? []);
  }, [authFetch]);

  useEffect(() => { void load(); }, [load]);

  async function createExport() {
    setCreating(true);
    try {
      const response = await authFetch('/api/passport/me/export', { method: 'POST' });
      const payload = await response.json() as { export?: { download_url: string }; error?: string };
      if (!response.ok || !payload.export) {
        toast.error(payload.error ?? 'Could not create Passport export');
        return;
      }
      setDownloadUrl(payload.export.download_url);
      toast.success('Private Passport export is ready for 24 hours');
      await load();
    } finally {
      setCreating(false);
    }
  }

  async function download() {
    if (!downloadUrl) return;
    setDownloading(true);
    try {
      const response = await authFetch(downloadUrl);
      if (!response.ok) {
        toast.error('This Passport export is unavailable or expired');
        return;
      }
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = 'playmechi-gamer-passport-export.json';
      anchor.click();
      URL.revokeObjectURL(objectUrl);
      await load();
    } finally {
      setDownloading(false);
    }
  }

  return <main className="mx-auto w-full max-w-4xl space-y-5 px-4 py-7 sm:px-7">
    <section className="card p-6 sm:p-8">
      <div className="flex items-center gap-2"><ShieldCheck size={18} className="text-[var(--accent-secondary-text)]" /><p className="section-title">Your data rights</p></div>
      <h1 className="mt-3 text-3xl font-black text-[var(--text-primary)]">Export your Gamer Passport</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">Create a JSON bundle of your identity and privacy settings, game journal, verification and event records, social activity, progression, Replays, and connection/import history. Provider secrets, authentication data, raw third-party payloads, and other players’ direct identifiers are excluded.</p>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button type="button" className="btn-primary" disabled={creating} onClick={() => void createExport()}>{creating ? <Loader2 size={15} className="animate-spin" /> : <FileJson size={15} />} Create private export</button>
        {downloadUrl ? <button type="button" className="btn-outline" disabled={downloading} onClick={() => void download()}>{downloading ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />} Download JSON</button> : null}
      </div>
      <p className="mt-4 text-xs leading-5 text-[var(--text-soft)]">The download requires your active account session, expires after 24 hours, is never publicly accessible, and can be generated at most three times per 24 hours.</p>
    </section>

    <section className="card p-6">
      <h2 className="text-lg font-black text-[var(--text-primary)]">Recent export requests</h2>
      <div className="mt-4 space-y-3">
        {exports.map((item) => <article key={item.id} className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-bold text-[var(--text-primary)]">JSON · {item.manifest.sections?.length ?? 0} data sections</p><p className="mt-1 text-xs text-[var(--text-soft)]">Requested {new Date(item.requested_at).toLocaleString()} · expires {new Date(item.expires_at).toLocaleString()}</p></div><span className="rounded-full border border-[var(--border-color)] px-3 py-1 text-xs font-black uppercase text-[var(--text-secondary)]">{item.status}</span></div>
        </article>)}
        {!exports.length ? <p className="text-sm text-[var(--text-soft)]">No Passport exports have been created.</p> : null}
      </div>
    </section>
  </main>;
}
