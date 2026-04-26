'use client';

import { useRouter } from 'next/navigation';
import type { FormEvent } from 'react';
import { useCallback, useEffect, useState, useTransition } from 'react';
import toast from 'react-hot-toast';
import { RefreshCw, Search, Swords } from 'lucide-react';
import { useAuthFetch } from '@/components/AuthProvider';
import { ChallengesPanel } from '@/components/ChallengesPanel';
import { emitNotificationRefresh } from '@/components/NotificationNavButton';
import type { MatchChallenge } from '@/types';

function normalizeUsername(value: string | null | undefined) {
  return String(value ?? '')
    .trim()
    .replace(/^@+/, '');
}

export default function ChallengesPage() {
  const router = useRouter();
  const authFetch = useAuthFetch();
  const [isRouting, startTransition] = useTransition();
  const [searchValue, setSearchValue] = useState('');
  const [inboundChallenges, setInboundChallenges] = useState<MatchChallenge[]>([]);
  const [outboundChallenges, setOutboundChallenges] = useState<MatchChallenge[]>([]);
  const [loadingChallenges, setLoadingChallenges] = useState(true);
  const [challengeError, setChallengeError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const normalizedUsername = normalizeUsername(searchValue);
  const liveChallengeCount = inboundChallenges.length + outboundChallenges.length;

  const loadChallenges = useCallback(async () => {
    setLoadingChallenges(true);
    setChallengeError(null);

    try {
      const res = await authFetch('/api/challenges');
      const data = (await res.json()) as {
        inbound?: MatchChallenge[];
        outbound?: MatchChallenge[];
        error?: string;
      };

      if (!res.ok) {
        throw new Error(data.error ?? 'Could not load live challenges');
      }

      setInboundChallenges(data.inbound ?? []);
      setOutboundChallenges(data.outbound ?? []);
    } catch (error) {
      setChallengeError(error instanceof Error ? error.message : 'Could not load live challenges');
      setInboundChallenges([]);
      setOutboundChallenges([]);
    } finally {
      setLoadingChallenges(false);
    }
  }, [authFetch]);

  useEffect(() => {
    void loadChallenges();
  }, [loadChallenges]);

  const handleLookupSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!normalizedUsername) {
      return;
    }

    startTransition(() => {
      router.push(`/s/${encodeURIComponent(normalizedUsername)}`);
    });
  };

  const handleChallengeAction = useCallback(
    async (challengeId: string, action: 'accept' | 'decline' | 'cancel') => {
      setActionId(`${challengeId}:${action}`);

      try {
        const res = await authFetch(`/api/challenges/${challengeId}/${action}`, {
          method: 'POST',
        });
        const data = (await res.json()) as { error?: string; match_id?: string };

        if (!res.ok) {
          toast.error(data.error ?? 'Could not update challenge');
          return;
        }

        emitNotificationRefresh();
        await loadChallenges();

        if (action === 'accept' && data.match_id) {
          toast.success('Challenge accepted. Match is live.');
          router.push(`/match/${data.match_id}`);
          return;
        }

        if (action === 'decline') {
          toast.success('Challenge declined');
          return;
        }

        if (action === 'cancel') {
          toast.success('Challenge cancelled');
        }
      } catch {
        toast.error('Network error');
      } finally {
        setActionId(null);
      }
    },
    [authFetch, loadChallenges, router]
  );

  return (
    <div className="page-container max-w-[64rem] space-y-5">
      <section className="card circuit-panel p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="avatar-shell flex h-11 w-11 shrink-0 items-center justify-center">
              <Swords size={20} />
            </div>
            <div>
              <p className="section-title">Challenge page</p>
              <h1 className="mt-2 text-2xl font-black text-[var(--text-primary)]">
                Live challenges
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-[var(--text-secondary)]">
                Open this page any time to accept incoming challenges, cancel sent challenges, or
                look up a player directly.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="brand-chip px-3 py-1">{liveChallengeCount} live</span>
            <button
              type="button"
              onClick={() => void loadChallenges()}
              disabled={loadingChallenges}
              className="btn-outline min-h-10 px-3 py-2 text-xs"
            >
              <RefreshCw size={14} className={loadingChallenges ? 'animate-spin' : undefined} />
              Refresh
            </button>
          </div>
        </div>
      </section>

      {challengeError ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-semibold text-red-200">
          {challengeError}
        </div>
      ) : null}

      <ChallengesPanel
        inboundChallenges={inboundChallenges}
        outboundChallenges={outboundChallenges}
        loading={loadingChallenges}
        actionId={actionId}
        onAction={handleChallengeAction}
        emptyCopy="No live direct challenges right now. Search a player below to send one."
      />

      <section className="card p-5">
        <form
          onSubmit={handleLookupSubmit}
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
        >
          <label className="block flex-1">
            <span className="label">Username</span>
            <div className="relative">
              <Search
                size={16}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-soft)]"
              />
              <input
                type="text"
                name="username"
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                placeholder="@playername"
                autoCapitalize="none"
                autoCorrect="off"
                autoComplete="off"
                spellCheck={false}
                enterKeyHint="search"
                className="input pl-11"
                aria-label="Search players by username"
              />
            </div>
          </label>

          <button type="submit" className="btn-primary" disabled={isRouting || !normalizedUsername}>
            <Search size={14} />
            {isRouting ? 'Searching...' : 'Search'}
          </button>
        </form>
      </section>
    </div>
  );
}
