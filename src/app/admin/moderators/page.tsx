'use client';

import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Copy, KeyRound, Loader2, RefreshCw, ShieldCheck } from 'lucide-react';
import { useAuthFetch } from '@/components/AuthProvider';
import type { AdminUser } from '@/types';

type Credential = {
  id: string;
  username: string;
  phone: string | null;
  email: string | null;
  password: string;
};

function copyText(value: string) {
  navigator.clipboard.writeText(value).then(
    () => toast.success('Copied'),
    () => toast.error('Could not copy')
  );
}

function formatCredential(credential: Credential) {
  return [
    `Username: ${credential.username}`,
    credential.phone ? `Phone: ${credential.phone}` : null,
    credential.email ? `Email: ${credential.email}` : null,
    `Password: ${credential.password}`,
  ]
    .filter(Boolean)
    .join('\n');
}

export default function AdminModeratorsPage() {
  const authFetch = useAuthFetch();
  const [moderators, setModerators] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<Credential[]>([]);

  const loadModerators = useCallback(async () => {
    setLoading(true);
    try {
      const response = await authFetch('/api/admin/users?role=moderator&limit=100');
      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error ?? 'Could not load moderators');
        setModerators([]);
        return;
      }
      setModerators((data.users ?? []) as AdminUser[]);
    } catch {
      toast.error('Network error while loading moderators');
      setModerators([]);
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    void loadModerators();
  }, [loadModerators]);

  const resetPassword = async (moderator?: AdminUser) => {
    const resetAll = !moderator;
    if (resetAll && !window.confirm('Reset passwords for ALL active moderators? This will immediately replace their current passwords.')) {
      return;
    }

    setResetting(moderator?.id ?? 'all');
    try {
      const response = await authFetch('/api/admin/moderators/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          moderator
            ? { user_id: moderator.id }
            : { reset_all_moderators: true }
        ),
      });
      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error ?? 'Could not reset password');
        return;
      }

      setCredentials((data.credentials ?? []) as Credential[]);
      toast.success(resetAll ? 'Moderator passwords reset' : `${moderator.username} password reset`);
    } catch {
      toast.error('Network error while resetting password');
    } finally {
      setResetting(null);
    }
  };

  return (
    <main className="page-base app-prototype-shell min-h-screen p-4 sm:p-6" data-theme="dark">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="card p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="section-title">Admin</p>
              <h1 className="mt-2 text-2xl font-black text-[var(--text-primary)]">
                Moderator accounts
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
                Reset moderator passwords and copy one-time credentials for distribution. Passwords are only shown immediately after reset.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => void loadModerators()} className="btn-ghost" disabled={loading}>
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                Refresh
              </button>
              <button type="button" onClick={() => void resetPassword()} className="btn-primary" disabled={resetting !== null || moderators.length === 0}>
                {resetting === 'all' ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}
                Reset all moderators
              </button>
            </div>
          </div>
        </section>

        {credentials.length ? (
          <section className="card border-[rgba(50,224,196,0.25)] p-5 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="section-title">One-time credentials</p>
                <h2 className="mt-2 text-xl font-black text-[var(--text-primary)]">Copy and store now</h2>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">These passwords will not be retrievable again.</p>
              </div>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => copyText(credentials.map(formatCredential).join('\n\n'))}
              >
                <Copy size={14} />
                Copy all
              </button>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {credentials.map((credential) => (
                <div key={credential.id} className="rounded-xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-black text-[var(--text-primary)]">{credential.username}</div>
                      <div className="mt-1 text-xs text-[var(--text-secondary)]">{credential.phone ?? credential.email ?? credential.id}</div>
                    </div>
                    <button type="button" className="btn-ghost min-h-9 px-3" onClick={() => copyText(formatCredential(credential))}>
                      <Copy size={13} />
                    </button>
                  </div>
                  <div className="mt-3 rounded-lg border border-[rgba(50,224,196,0.18)] bg-[rgba(50,224,196,0.08)] p-3 font-mono text-sm text-[var(--accent-secondary-text)]">
                    {credential.password}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <section className="card p-0">
          <div className="border-b border-[var(--border-color)] p-4">
            <h2 className="flex items-center gap-2 text-lg font-black text-[var(--text-primary)]">
              <ShieldCheck size={18} />
              Active moderators
            </h2>
          </div>
          {loading ? (
            <div className="flex items-center gap-2 p-6 text-sm text-[var(--text-secondary)]">
              <Loader2 size={16} className="animate-spin" />
              Loading moderators...
            </div>
          ) : moderators.length ? (
            <div className="divide-y divide-[var(--border-color)]">
              {moderators.map((moderator) => (
                <div key={moderator.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="font-bold text-[var(--text-primary)]">{moderator.username}</div>
                    <div className="mt-1 text-sm text-[var(--text-secondary)]">
                      {moderator.phone ?? 'No phone'} · {moderator.email ?? 'No email'}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void resetPassword(moderator)}
                    disabled={resetting !== null}
                    className="btn-ghost"
                  >
                    {resetting === moderator.id ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}
                    Reset password
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="p-6 text-sm text-[var(--text-secondary)]">No moderators found.</p>
          )}
        </section>
      </div>
    </main>
  );
}
