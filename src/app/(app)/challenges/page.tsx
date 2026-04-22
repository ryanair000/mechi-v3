'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { ArrowRight, Clock3, RefreshCw, X } from 'lucide-react';
import { useAuthFetch } from '@/components/AuthProvider';
import { emitNotificationRefresh } from '@/components/NotificationNavButton';
import { GAMES, PLATFORMS } from '@/lib/config';
import type { MatchChallenge, PlatformKey } from '@/types';

function formatTime(iso: string) {
  return new Date(iso).toLocaleString('en-KE', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function Initial({ name }: { name: string }) {
  const letter = name.trim().charAt(0).toUpperCase() || '?';
  return (
    <span className="avatar-shell flex h-8 w-8 shrink-0 items-center justify-center text-xs font-black">
      {letter}
    </span>
  );
}

function SectionLabel({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-center gap-2.5 py-2">
      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">
        {label}
      </span>
      <span className="rounded-full bg-[var(--surface-strong)] border border-[var(--border-color)] px-2 py-0.5 text-[10px] font-semibold text-[var(--text-soft)]">
        {count}
      </span>
    </div>
  );
}

function InboundRow({
  challenge,
  actionId,
  onAction,
}: {
  challenge: MatchChallenge;
  actionId: string | null;
  onAction: (id: string, action: 'accept' | 'decline') => void;
}) {
  const name = challenge.challenger?.username ?? 'A player';
  const game = GAMES[challenge.game]?.label ?? challenge.game;
  const platform = PLATFORMS[challenge.platform as PlatformKey]?.label ?? challenge.platform;
  const pendingAccept = actionId === `${challenge.id}:accept`;
  const pendingDecline = actionId === `${challenge.id}:decline`;
  const busy = pendingAccept || pendingDecline;

  return (
    <div className="flex flex-col gap-3 border-b border-[var(--border-color)] py-4 last:border-0 sm:flex-row sm:items-center sm:gap-4">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <Initial name={name} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            {name}
            <span className="ml-1.5 font-normal text-[var(--text-secondary)]">challenged you</span>
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span className="brand-chip px-2 py-0.5 text-[10px]">{game}</span>
            <span className="brand-chip-coral px-2 py-0.5 text-[10px]">{platform}</span>
            <span className="text-[11px] text-[var(--text-soft)]">{formatTime(challenge.created_at)}</span>
          </div>
          {challenge.message ? (
            <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)] italic">
              &ldquo;{challenge.message}&rdquo;
            </p>
          ) : null}
        </div>
      </div>
      <div className="flex shrink-0 gap-2 sm:justify-end">
        <button
          type="button"
          onClick={() => onAction(challenge.id, 'accept')}
          disabled={busy}
          className="btn-primary min-h-8 px-3 py-1.5 text-xs"
        >
          {pendingAccept ? 'Accepting…' : 'Accept'}
        </button>
        <button
          type="button"
          onClick={() => onAction(challenge.id, 'decline')}
          disabled={busy}
          className="btn-danger min-h-8 px-3 py-1.5 text-xs"
        >
          {pendingDecline ? 'Declining…' : 'Decline'}
        </button>
      </div>
    </div>
  );
}

function OutboundRow({
  challenge,
  actionId,
  onAction,
}: {
  challenge: MatchChallenge;
  actionId: string | null;
  onAction: (id: string, action: 'cancel') => void;
}) {
  const name = challenge.opponent?.username ?? 'your opponent';
  const game = GAMES[challenge.game]?.label ?? challenge.game;
  const platform = PLATFORMS[challenge.platform as PlatformKey]?.label ?? challenge.platform;
  const pendingCancel = actionId === `${challenge.id}:cancel`;

  return (
    <div className="flex flex-col gap-3 border-b border-[var(--border-color)] py-4 last:border-0 sm:flex-row sm:items-center sm:gap-4">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <Initial name={name} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            <span className="font-normal text-[var(--text-secondary)]">Waiting on </span>
            {name}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span className="brand-chip px-2 py-0.5 text-[10px]">{game}</span>
            <span className="brand-chip-coral px-2 py-0.5 text-[10px]">{platform}</span>
            <span className="inline-flex items-center gap-1 text-[11px] text-[var(--text-soft)]">
              <Clock3 size={10} />
              Expires {formatTime(challenge.expires_at)}
            </span>
          </div>
          {challenge.message ? (
            <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)] italic">
              &ldquo;{challenge.message}&rdquo;
            </p>
          ) : null}
        </div>
      </div>
      <button
        type="button"
        onClick={() => onAction(challenge.id, 'cancel')}
        disabled={pendingCancel}
        className="btn-outline min-h-8 shrink-0 px-3 py-1.5 text-xs sm:self-center"
      >
        <X size={12} />
        {pendingCancel ? 'Cancelling…' : 'Cancel'}
      </button>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-4 py-2">
      {[1, 2, 3].map((n) => (
        <div key={n} className="flex items-center gap-3 py-2">
          <div className="h-8 w-8 shrink-0 rounded-2xl shimmer" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-36 rounded shimmer" />
            <div className="h-3 w-24 rounded shimmer" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ChallengesPage() {
  const router = useRouter();
  const authFetch = useAuthFetch();
  const [inbound, setInbound] = useState<MatchChallenge[]>([]);
  const [outbound, setOutbound] = useState<MatchChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

  const loadChallenges = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      silent ? setRefreshing(true) : setLoading(true);
      setLoadError(null);
      try {
        const res = await authFetch('/api/challenges');
        const data = (await res.json()) as {
          error?: string;
          inbound?: MatchChallenge[];
          outbound?: MatchChallenge[];
        };
        if (!res.ok) { setLoadError(data.error ?? 'Could not load challenges.'); return; }
        setInbound(data.inbound ?? []);
        setOutbound(data.outbound ?? []);
      } catch {
        setLoadError('Could not load challenges.');
      } finally {
        silent ? setRefreshing(false) : setLoading(false);
      }
    },
    [authFetch]
  );

  useEffect(() => { void loadChallenges(); }, [loadChallenges]);

  const handleAction = async (challengeId: string, action: 'accept' | 'decline' | 'cancel') => {
    setActionId(`${challengeId}:${action}`);
    try {
      const res = await authFetch(`/api/challenges/${challengeId}/${action}`, { method: 'POST' });
      const data = (await res.json()) as { error?: string; match_id?: string };
      if (!res.ok) { toast.error(data.error ?? 'Could not update challenge'); return; }
      emitNotificationRefresh();
      await loadChallenges({ silent: true });
      if (action === 'accept' && data.match_id) {
        toast.success('Challenge accepted. Match is live.');
        router.push(`/match/${data.match_id}`);
        return;
      }
      if (action === 'decline') toast.success('Challenge declined');
      else if (action === 'cancel') toast.success('Challenge cancelled');
    } catch {
      toast.error('Network error');
    } finally {
      setActionId(null);
    }
  };

  const total = inbound.length + outbound.length;
  const isEmpty = !loading && total === 0;

  return (
    <div className="page-container max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 pb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-black text-[var(--text-primary)]">Challenges</h1>
          {!loading && total > 0 ? (
            <span className="brand-chip px-2.5 py-1">{total} live</span>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void loadChallenges({ silent: true })}
            disabled={loading || refreshing}
            className="icon-button h-9 w-9"
            aria-label="Refresh"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : undefined} />
          </button>
          <Link href="/leaderboard" className="btn-ghost text-sm">
            Find opponent
            <ArrowRight size={13} />
          </Link>
        </div>
      </div>

      {/* Error */}
      {loadError ? (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          <span>{loadError}</span>
          <button
            type="button"
            onClick={() => void loadChallenges()}
            className="shrink-0 text-xs font-semibold underline underline-offset-2"
          >
            Retry
          </button>
        </div>
      ) : null}

      {/* Body */}
      {loading ? (
        <Skeleton />
      ) : isEmpty ? (
        <div className="py-12 text-center">
          <p className="text-sm text-[var(--text-soft)]">No pending challenges.</p>
          <Link
            href="/leaderboard"
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--accent-secondary-text)] hover:text-[var(--text-primary)]"
          >
            Find someone to challenge
            <ArrowRight size={13} />
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {inbound.length > 0 ? (
            <div>
              <SectionLabel label="Incoming" count={inbound.length} />
              <div className="mt-1 border-t border-[var(--border-color)]">
                {inbound.map((c) => (
                  <InboundRow
                    key={c.id}
                    challenge={c}
                    actionId={actionId}
                    onAction={handleAction}
                  />
                ))}
              </div>
            </div>
          ) : null}

          {outbound.length > 0 ? (
            <div>
              <SectionLabel label="Sent" count={outbound.length} />
              <div className="mt-1 border-t border-[var(--border-color)]">
                {outbound.map((c) => (
                  <OutboundRow
                    key={c.id}
                    challenge={c}
                    actionId={actionId}
                    onAction={handleAction}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
