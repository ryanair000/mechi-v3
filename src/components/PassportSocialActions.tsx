'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth, useAuthFetch } from '@/components/AuthProvider';
import type { PassportRelationshipState } from '@/lib/passport-social-types';

export function PassportSocialActions({ username, targetId }: { username: string; targetId: string }) {
  const { user, loading: authLoading } = useAuth();
  const authFetch = useAuthFetch();
  const [state, setState] = useState<PassportRelationshipState | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user || user.id === targetId) return;
    authFetch(`/api/passport/social/state/${encodeURIComponent(username)}`)
      .then(async (response) => response.ok ? (await response.json()).state as PassportRelationshipState : null)
      .then(setState)
      .catch(() => setState(null));
  }, [authFetch, targetId, user, username]);

  if (authLoading || !user || user.id === targetId || state?.blocked_viewer) return null;

  const mutate = async (path: string, body: Record<string, string>) => {
    setBusy(true);
    try {
      const response = await authFetch(path, { method: 'POST', body: JSON.stringify({ target_id: targetId, ...body }) });
      const payload = await response.json() as { error?: string; state?: PassportRelationshipState };
      if (!response.ok) return toast.error(payload.error ?? 'Could not update connection');
      if (payload.state) setState(payload.state);
      toast.success('Connection updated');
    } catch {
      toast.error('Connection failed. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const friendAction = state?.friendship_status === 'friends' ? 'remove'
    : state?.friendship_status === 'incoming' ? 'accept'
      : state?.friendship_status === 'outgoing' ? 'remove' : 'request';
  const friendLabel = state?.friendship_status === 'friends' ? 'Friends'
    : state?.friendship_status === 'incoming' ? 'Accept friend'
      : state?.friendship_status === 'outgoing' ? 'Requested' : 'Add friend';

  return (
    <div className="flex flex-wrap gap-2">
      {!state?.blocked_by_viewer ? (
        <>
          <button disabled={busy} className="btn-primary" onClick={() => mutate('/api/passport/social/friendships', { action: friendAction })}>{friendLabel}</button>
          <button disabled={busy} className="btn-outline" onClick={() => mutate('/api/passport/social/follows', { action: state?.is_following ? 'unfollow' : 'follow' })}>{state?.is_following ? 'Following' : 'Follow'}</button>
          <Link href={`/passport/compare/${encodeURIComponent(username)}`} className="btn-outline">Compare</Link>
        </>
      ) : null}
      <button disabled={busy} className="btn-ghost text-xs text-white/45" onClick={() => mutate('/api/passport/social/blocks', { action: state?.blocked_by_viewer ? 'unblock' : 'block' })}>{state?.blocked_by_viewer ? 'Unblock' : 'Block'}</button>
    </div>
  );
}
