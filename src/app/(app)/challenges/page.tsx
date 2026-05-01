'use client';

import { useRouter } from 'next/navigation';
import type { FormEvent } from 'react';
import { useCallback, useEffect, useState, useTransition } from 'react';
import toast from 'react-hot-toast';
import { RefreshCw, Search } from 'lucide-react';
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
  const [outboundChallenges, setOutboundChallenges] = useState<MatchChallenge[]>([]);
  const [loadingChallenges, setLoadingChallenges] = useState(true);
  const [challengeError, setChallengeError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const normalizedUsername = normalizeUsername(searchValue);
  const sentChallengeCount = outboundChallenges.length;

  const loadChallenges = useCallback(async () => {
    setLoadingChallenges(true);
    setChallengeError(null);

    try {
      const res = await authFetch('/api/challenges');
      const data = (await res.json()) as {
        outbound?: MatchChallenge[];
        error?: string;
      };

      if (!res.ok) {
        throw new Error(data.error ?? 'Could not load live challenges');
      }

      setOutboundChallenges(data.outbound ?? []);
    } catch (error) {
      setChallengeError(error instanceof Error ? error.message : 'Could not load live challenges');
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
    async (challengeId: string, action: 'cancel') => {
      setActionId(`${challengeId}:${action}`);

      try {
        const res = await authFetch(`/api/challenges/${challengeId}/${action}`, {
          method: 'POST',
        });
        const data = (await res.json()) as { error?: string };

        if (!res.ok) {
          toast.error(data.error ?? 'Could not update challenge');
          return;
        }

        emitNotificationRefresh();
        await loadChallenges();
        toast.success('Challenge cancelled');
      } catch {
        toast.error('Network error');
      } finally {
        setActionId(null);
      }
    },
    [authFetch, loadChallenges]
  );

  return (
    <div className="page-container max-w-[70rem] space-y-6">
      <section className="border-b border-[var(--border-color)] pb-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-[var(--text-soft)]">
              Direct challenges
            </p>
            <h1 className="mt-2 text-2xl font-black text-[var(--text-primary)]">Challenge list</h1>
            <p className="mt-2 max-w-2xl text-sm text-[var(--text-secondary)]">
              A simple queue for sent challenges and quick player lookup.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-[var(--text-secondary)]">
              {sentChallengeCount} sent
            </span>
            <button
              type="button"
              onClick={() => void loadChallenges()}
              disabled={loadingChallenges}
              className="btn-ghost min-h-9 px-3 py-2 text-xs"
            >
              <RefreshCw size={14} className={loadingChallenges ? 'animate-spin' : undefined} />
              Refresh
            </button>
          </div>
        </div>
      </section>

      {challengeError ? (
        <div className="border-l-2 border-red-500/60 pl-4 text-sm font-semibold text-red-300">
          {challengeError}
        </div>
      ) : null}

      <ChallengesPanel
        outboundChallenges={outboundChallenges}
        loading={loadingChallenges}
        actionId={actionId}
        onAction={handleChallengeAction}
      />

      <section className="border-t border-[var(--border-color)] pt-5">
        <form
          onSubmit={handleLookupSubmit}
          className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end"
        >
          <label className="block min-w-0">
            <span className="text-sm font-semibold text-[var(--text-primary)]">Find a player</span>
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

          <button type="submit" className="btn-primary min-h-11" disabled={isRouting || !normalizedUsername}>
            <Search size={14} />
            {isRouting ? 'Searching...' : 'Search'}
          </button>
        </form>
      </section>
    </div>
  );
}
