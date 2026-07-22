'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, CircleAlert, Globe2, ShieldCheck } from 'lucide-react';
import { useAuthFetch } from '@/components/AuthProvider';
import type { V5WorkspaceKind } from './v5-workspaces';
import styles from './V5WorkspaceSettings.module.css';

type Workspace = {
  id: string;
  type: V5WorkspaceKind;
  name: string;
  status: string;
  verification_status: string;
  is_public: boolean;
  description?: string | null;
  country?: string | null;
  region?: string | null;
  persisted?: boolean;
};

type FormState = {
  name: string;
  description: string;
  country: string;
  region: string;
  isPublic: boolean;
};

const EMPTY_FORM: FormState = {
  name: '',
  description: '',
  country: '',
  region: '',
  isPublic: false,
};

export function V5WorkspaceSettings({ workspace }: { workspace: V5WorkspaceKind }) {
  const authFetch = useAuthFetch();
  const router = useRouter();
  const [record, setRecord] = useState<Workspace | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [archiveReason, setArchiveReason] = useState('');
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);

  const load = useCallback(async () => {
    await Promise.resolve();
    setLoading(true);
    try {
      const listResponse = await authFetch('/api/v5/workspaces');
      if (!listResponse.ok) throw new Error('Workspace could not be loaded.');
      const list = (await listResponse.json()) as { workspaces?: Workspace[] };
      const summary = list.workspaces?.find(
        (item) => item.type === workspace && item.persisted !== false && item.status === 'active'
      );
      if (!summary) {
        setRecord(null);
        return;
      }
      const detailResponse = await authFetch(`/api/v5/workspaces/${summary.id}`);
      if (!detailResponse.ok) throw new Error('Workspace profile could not be loaded.');
      const detail = (await detailResponse.json()) as { workspace: Workspace };
      setRecord(detail.workspace);
      setForm({
        name: detail.workspace.name,
        description: detail.workspace.description ?? '',
        country: detail.workspace.country ?? '',
        region: detail.workspace.region ?? '',
        isPublic: detail.workspace.is_public,
      });
      setFeedback(null);
    } catch (error) {
      setFeedback({
        tone: 'error',
        message: error instanceof Error ? error.message : 'Workspace could not be loaded.',
      });
    } finally {
      setLoading(false);
    }
  }, [authFetch, workspace]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [load]);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!record) return;
    setSaving(true);
    setFeedback(null);
    try {
      const response = await authFetch(`/api/v5/workspaces/${record.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: form.name,
          description: form.description,
          country: form.country,
          region: form.region,
          is_public: form.isPublic,
          reason: 'Workspace identity updated from settings',
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        workspace?: Workspace;
        error?: string;
      };
      if (!response.ok || !payload.workspace) {
        throw new Error(payload.error ?? 'Workspace could not be updated.');
      }
      setRecord(payload.workspace);
      setFeedback({ tone: 'success', message: 'Workspace profile saved and audited.' });
    } catch (error) {
      setFeedback({
        tone: 'error',
        message: error instanceof Error ? error.message : 'Workspace could not be updated.',
      });
    } finally {
      setSaving(false);
    }
  }

  async function archiveWorkspace() {
    if (!record || archiveReason.trim().length < 5) return;
    setSaving(true);
    setFeedback(null);
    try {
      const response = await authFetch(`/api/v5/workspaces/${record.id}`, {
        method: 'DELETE',
        body: JSON.stringify({ reason: archiveReason }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? 'Workspace could not be archived.');
      }
      router.push('/app/player');
      router.refresh();
    } catch (error) {
      setFeedback({
        tone: 'error',
        message: error instanceof Error ? error.message : 'Workspace could not be archived.',
      });
      setSaving(false);
    }
  }

  if (loading) return <div className={styles.state}>Loading workspace profile…</div>;
  if (!record) {
    return (
      <div className={styles.state}>
        <ShieldCheck size={24} />
        <strong>Activate this workspace before editing its identity.</strong>
      </div>
    );
  }

  const verificationRequired = ['sponsor', 'shop'].includes(record.type);
  return (
    <div className={styles.layout}>
      <form className={styles.panel} onSubmit={save}>
        <header>
          <span><Globe2 size={20} /></span>
          <div><p>Durable workspace identity</p><h2>Profile and visibility</h2></div>
        </header>
        {feedback ? (
          <div className={feedback.tone === 'success' ? styles.success : styles.error} role="status">
            {feedback.tone === 'success' ? <CheckCircle2 size={17} /> : <CircleAlert size={17} />}
            {feedback.message}
          </div>
        ) : null}
        <label>Workspace name<input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} minLength={2} maxLength={120} required /></label>
        <label>Public description<textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} maxLength={600} rows={5} /></label>
        <div className={styles.fields}>
          <label>Country<input value={form.country} onChange={(event) => setForm((current) => ({ ...current, country: event.target.value }))} maxLength={80} /></label>
          <label>Region<input value={form.region} onChange={(event) => setForm((current) => ({ ...current, region: event.target.value }))} maxLength={100} /></label>
        </div>
        <label className={styles.toggle}>
          <input type="checkbox" checked={form.isPublic} onChange={(event) => setForm((current) => ({ ...current, isPublic: event.target.checked }))} />
          <span><strong>Public workspace profile</strong><small>{verificationRequired && record.verification_status !== 'verified' ? 'Verification is required before this can be enabled.' : 'Public details become discoverable on Mechi.'}</small></span>
        </label>
        <button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save workspace profile'}</button>
      </form>

      <aside className={styles.side}>
        <section className={styles.panel}>
          <header><span><ShieldCheck size={20} /></span><div><p>Trust state</p><h2>Workspace safeguards</h2></div></header>
          <dl>
            <div><dt>Status</dt><dd>{formatValue(record.status)}</dd></div>
            <div><dt>Verification</dt><dd>{formatValue(record.verification_status)}</dd></div>
            <div><dt>Visibility</dt><dd>{record.is_public ? 'Public' : 'Private'}</dd></div>
          </dl>
        </section>
        {record.type !== 'player' ? (
          <section className={`${styles.panel} ${styles.danger}`}>
            <header><span><CircleAlert size={20} /></span><div><p>Owner action</p><h2>Archive workspace</h2></div></header>
            <p>Archiving hides the workspace and blocks future mutations. Historical audit and competition records remain.</p>
            <label>Reason<input value={archiveReason} onChange={(event) => setArchiveReason(event.target.value)} minLength={5} maxLength={300} placeholder="Why is this workspace being archived?" /></label>
            <button type="button" disabled={saving || archiveReason.trim().length < 5} onClick={() => void archiveWorkspace()}>Archive workspace</button>
          </section>
        ) : null}
      </aside>
    </div>
  );
}

function formatValue(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}
