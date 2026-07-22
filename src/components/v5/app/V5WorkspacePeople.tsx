'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Check, Clock3, MailPlus, ShieldCheck, UserRound, UsersRound, X } from 'lucide-react';
import { useAuthFetch } from '@/components/AuthProvider';
import type { V5WorkspaceKind } from './v5-workspaces';
import styles from './V5WorkspacePeople.module.css';

type WorkspaceSummary = {
  id: string;
  type: V5WorkspaceKind;
  name: string;
  status: string;
  persisted?: boolean;
};

type Member = {
  id: string;
  user_id: string;
  role: string;
  status: string;
  joined_at?: string | null;
  user?: { id?: string; username?: string; avatar_url?: string | null } | null;
};

type Invitation = {
  id: string;
  invited_user_id?: string | null;
  invited_email?: string | null;
  role: string;
  status: string;
  expires_at: string;
  created_at: string;
};

const ROLE_OPTIONS: Partial<Record<V5WorkspaceKind, Array<[string, string]>>> = {
  team: [
    ['starter', 'Starter'],
    ['substitute', 'Substitute'],
    ['manager', 'Manager'],
    ['analyst', 'Analyst'],
    ['member', 'Member'],
  ],
  organizer: [
    ['operations', 'Operations'],
    ['communications', 'Communications'],
    ['finance_read', 'Finance read-only'],
    ['member', 'Member'],
  ],
  creator: [
    ['manager', 'Manager'],
    ['communications', 'Communications'],
    ['analyst', 'Analyst'],
    ['member', 'Member'],
  ],
  sponsor: [
    ['manager', 'Manager'],
    ['communications', 'Communications'],
    ['finance_read', 'Finance read-only'],
    ['analyst', 'Analyst'],
    ['member', 'Member'],
  ],
  shop: [
    ['manager', 'Venue manager'],
    ['operations', 'Tournament operations'],
    ['finance_read', 'Finance read-only'],
    ['member', 'Member'],
  ],
  coach: [['member', 'Member']],
};

export function V5WorkspacePeople({
  workspace,
  mode,
}: {
  workspace: V5WorkspaceKind;
  mode: 'members' | 'invitations';
}) {
  const authFetch = useAuthFetch();
  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceSummary | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [target, setTarget] = useState('');
  const roles = useMemo(() => ROLE_OPTIONS[workspace] ?? [['member', 'Member']], [workspace]);
  const [role, setRole] = useState(roles[0]?.[0] ?? 'member');
  const [feedback, setFeedback] = useState<{ tone: 'error' | 'success'; message: string } | null>(null);

  const load = useCallback(async () => {
    await Promise.resolve();
    setLoading(true);
    setFeedback(null);
    try {
      const workspaceResponse = await authFetch('/api/v5/workspaces');
      if (!workspaceResponse.ok) throw new Error('Workspace could not be loaded.');
      const payload = (await workspaceResponse.json()) as { workspaces?: WorkspaceSummary[] };
      const selected =
        payload.workspaces?.find(
          (item) => item.type === workspace && item.persisted !== false && item.status === 'active'
        ) ?? null;
      setActiveWorkspace(selected);
      if (!selected) {
        setMembers([]);
        setInvitations([]);
        return;
      }

      const [memberResponse, invitationResponse] = await Promise.all([
        authFetch(`/api/v5/workspaces/${selected.id}/members`),
        authFetch(`/api/v5/workspaces/${selected.id}/invitations`),
      ]);
      if (memberResponse.ok) {
        const memberPayload = (await memberResponse.json()) as { members?: Member[] };
        setMembers(Array.isArray(memberPayload.members) ? memberPayload.members : []);
      } else {
        setMembers([]);
      }
      if (invitationResponse.ok) {
        const invitationPayload = (await invitationResponse.json()) as {
          invitations?: Invitation[];
        };
        setInvitations(
          Array.isArray(invitationPayload.invitations) ? invitationPayload.invitations : []
        );
      } else {
        setInvitations([]);
      }
    } catch (error) {
      setFeedback({
        tone: 'error',
        message: error instanceof Error ? error.message : 'Workspace people could not be loaded.',
      });
    } finally {
      setLoading(false);
    }
  }, [authFetch, workspace]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [load]);

  async function inviteMember(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeWorkspace || !target.trim()) return;
    setSaving(true);
    setFeedback(null);
    try {
      const response = await authFetch(`/api/v5/workspaces/${activeWorkspace.id}/invitations`, {
        method: 'POST',
        body: JSON.stringify({ username_or_email: target, role }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? 'Invitation could not be sent.');
      setTarget('');
      setFeedback({ tone: 'success', message: 'Invitation created and added to the audit record.' });
      await load();
    } catch (error) {
      setFeedback({
        tone: 'error',
        message: error instanceof Error ? error.message : 'Invitation could not be sent.',
      });
    } finally {
      setSaving(false);
    }
  }

  async function revokeInvitation(invitationId: string) {
    if (!activeWorkspace) return;
    setSaving(true);
    setFeedback(null);
    try {
      const response = await authFetch(
        `/api/v5/workspaces/${activeWorkspace.id}/invitations/${invitationId}`,
        {
          method: 'DELETE',
          body: JSON.stringify({ reason: 'Invitation revoked from workspace people screen' }),
        }
      );
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? 'Invitation could not be revoked.');
      }
      setFeedback({ tone: 'success', message: 'Invitation revoked.' });
      await load();
    } catch (error) {
      setFeedback({
        tone: 'error',
        message: error instanceof Error ? error.message : 'Invitation could not be revoked.',
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className={styles.state}>Loading workspace access…</div>;
  }
  if (!activeWorkspace) {
    return (
      <div className={styles.state}>
        <ShieldCheck size={24} />
        <strong>Activate this workspace first</strong>
        <span>Membership and invitations become available after the workspace is created.</span>
        <Link href={`/app/${workspace}`}>Return to workspace setup</Link>
      </div>
    );
  }

  return (
    <div className={styles.layout}>
      <section className={styles.panel}>
        <header>
          <span><UsersRound size={19} /></span>
          <div>
            <p>{activeWorkspace.name}</p>
            <h2>{mode === 'members' ? 'Active workspace members' : 'Workspace invitations'}</h2>
          </div>
        </header>
        {feedback ? (
          <div className={feedback.tone === 'error' ? styles.error : styles.success} role="status">
            {feedback.tone === 'error' ? <X size={16} /> : <Check size={16} />}
            {feedback.message}
          </div>
        ) : null}
        {mode === 'members' ? (
          members.length ? (
            <div className={styles.rows}>
              {members.map((member) => {
                const userValue = Array.isArray(member.user) ? member.user[0] : member.user;
                return (
                  <article key={member.id}>
                    <span className={styles.avatar}><UserRound size={18} /></span>
                    <div>
                      <strong>{userValue?.username ?? 'Mechi member'}</strong>
                      <small>{formatRole(member.role)} · {formatRole(member.status)}</small>
                    </div>
                    <em>{member.joined_at ? `Joined ${formatDate(member.joined_at)}` : 'Access pending'}</em>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className={styles.empty}>No active members were returned for this workspace.</div>
          )
        ) : invitations.length ? (
          <div className={styles.rows}>
            {invitations.map((invitation) => (
              <article key={invitation.id}>
                <span className={styles.avatar}><Clock3 size={18} /></span>
                <div>
                  <strong>{invitation.invited_email || 'Mechi account invitation'}</strong>
                  <small>{formatRole(invitation.role)} · {formatRole(invitation.status)}</small>
                </div>
                <em>Expires {formatDate(invitation.expires_at)}</em>
                {invitation.status === 'pending' ? (
                  <button type="button" disabled={saving} onClick={() => void revokeInvitation(invitation.id)}>
                    Revoke
                  </button>
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <div className={styles.empty}>No invitations have been created.</div>
        )}
      </section>

      <aside className={styles.panel}>
        <header>
          <span><MailPlus size={19} /></span>
          <div><p>Permission-scoped access</p><h2>Invite a member</h2></div>
        </header>
        <form className={styles.form} onSubmit={inviteMember}>
          <label>
            Username or email
            <input
              value={target}
              onChange={(event) => setTarget(event.target.value)}
              placeholder="playername or email@example.com"
              maxLength={254}
              required
            />
          </label>
          <label>
            Workspace role
            <select value={role} onChange={(event) => setRole(event.target.value)}>
              {roles.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <p>The server derives permissions from this role. Custom or owner-level grants cannot be submitted here.</p>
          <button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Create invitation'}</button>
        </form>
      </aside>
    </div>
  );
}

export function V5IncomingInvitations() {
  const authFetch = useAuthFetch();
  const [items, setItems] = useState<Array<Invitation & { workspace?: { name?: string; type?: string } | null }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    await Promise.resolve();
    setLoading(true);
    const response = await authFetch('/api/v5/invitations');
    if (!response.ok) {
      setError('Workspace invitations could not be loaded.');
      setLoading(false);
      return;
    }
    const payload = (await response.json()) as { invitations?: typeof items };
    setItems(Array.isArray(payload.invitations) ? payload.invitations : []);
    setError('');
    setLoading(false);
  }, [authFetch]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [load]);

  async function respond(id: string, responseValue: 'accepted' | 'declined') {
    const response = await authFetch(`/api/v5/invitations/${id}/respond`, {
      method: 'POST',
      body: JSON.stringify({ response: responseValue }),
    });
    if (!response.ok) {
      setError('Invitation response could not be saved.');
      return;
    }
    await load();
  }

  return (
    <section className={styles.incoming}>
      <header><div><p>Workspace access</p><h2>Invitations</h2></div></header>
      {loading ? <div className={styles.empty}>Loading invitations…</div> : error ? <div className={styles.error}>{error}</div> : items.length ? (
        <div className={styles.rows}>
          {items.map((invitation) => {
            const workspaceValue = Array.isArray(invitation.workspace) ? invitation.workspace[0] : invitation.workspace;
            return (
              <article key={invitation.id}>
                <span className={styles.avatar}><MailPlus size={18} /></span>
                <div><strong>{workspaceValue?.name ?? 'Mechi workspace'}</strong><small>{formatRole(invitation.role)} · expires {formatDate(invitation.expires_at)}</small></div>
                <div className={styles.actions}>
                  <button type="button" onClick={() => void respond(invitation.id, 'declined')}>Decline</button>
                  <button type="button" onClick={() => void respond(invitation.id, 'accepted')}>Accept</button>
                </div>
              </article>
            );
          })}
        </div>
      ) : <div className={styles.empty}>No workspace invitation needs your response.</div>}
    </section>
  );
}

function formatRole(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-KE', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value));
}
