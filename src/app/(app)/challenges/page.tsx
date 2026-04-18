'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  ArrowRight,
  BellRing,
  RefreshCw,
  ShieldCheck,
  Swords,
  TimerReset,
} from 'lucide-react';
import { useAuthFetch } from '@/components/AuthProvider';
import { ChallengesPanel } from '@/components/ChallengesPanel';
import { emitNotificationRefresh } from '@/components/NotificationNavButton';
import type { MatchChallenge } from '@/types';

export default function ChallengesPage() {
  const router = useRouter();
  const authFetch = useAuthFetch();
  const [inboundChallenges, setInboundChallenges] = useState<MatchChallenge[]>([]);
  const [outboundChallenges, setOutboundChallenges] = useState<MatchChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

  const loadChallenges = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setLoadError(null);

      try {
        const res = await authFetch('/api/challenges');
        const data = (await res.json()) as {
          error?: string;
          inbound?: MatchChallenge[];
          outbound?: MatchChallenge[];
        };

        if (!res.ok) {
          setLoadError(data.error ?? 'Could not load challenges right now.');
          return;
        }

        setInboundChallenges(data.inbound ?? []);
        setOutboundChallenges(data.outbound ?? []);
      } catch {
        setLoadError('Could not load challenges right now.');
      } finally {
        if (silent) {
          setRefreshing(false);
        } else {
          setLoading(false);
        }
      }
    },
    [authFetch]
  );

  useEffect(() => {
    void loadChallenges();
  }, [loadChallenges]);

  const handleChallengeAction = async (
    challengeId: string,
    action: 'accept' | 'decline' | 'cancel'
  ) => {
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
      await loadChallenges({ silent: true });

      if (action === 'accept' && data.match_id) {
        toast.success('Challenge accepted. Match is live.');
        router.push(`/match/${data.match_id}`);
        return;
      }

      if (action === 'decline') {
        toast.success('Challenge declined');
      } else if (action === 'cancel') {
        toast.success('Challenge cancelled');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setActionId(null);
    }
  };

  const totalChallenges = inboundChallenges.length + outboundChallenges.length;

  return (
    <div className="page-container">
      <section className="card circuit-panel overflow-hidden p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <p className="section-title">Challenges</p>
            <h1 className="mt-3 text-[1.5rem] font-black leading-[1.05] text-[var(--text-primary)] sm:text-[2rem]">
              Every direct callout, one page.
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--text-secondary)]">
              Accept, decline, or cancel direct matches without digging through your wider inbox.
              This page keeps the head-to-head side of Mechi tight and easy to track.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void loadChallenges({ silent: true })}
              disabled={loading || refreshing}
              className="btn-ghost"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : undefined} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
            <Link href="/leaderboard" className="btn-ghost">
              Find opponents
              <ArrowRight size={14} />
            </Link>
            <Link href="/notifications" className="btn-primary">
              Open inbox
              <BellRing size={14} />
            </Link>
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          {[
            {
              icon: Swords,
              title: 'Incoming',
              value: loading ? '...' : String(inboundChallenges.length),
              copy: inboundChallenges.length
                ? 'Players waiting on your answer right now.'
                : 'No unanswered callouts are sitting on you.',
            },
            {
              icon: TimerReset,
              title: 'Sent',
              value: loading ? '...' : String(outboundChallenges.length),
              copy: outboundChallenges.length
                ? 'Live requests you can still cancel before they expire.'
                : 'You do not have any outbound challenges pending.',
            },
            {
              icon: ShieldCheck,
              title: 'Live',
              value: loading ? '...' : String(totalChallenges),
              copy: totalChallenges
                ? 'Everything active is visible here.'
                : 'Use the leaderboard or a public profile to start one.',
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-[1.05rem] border border-[var(--border-color)] bg-[var(--surface-strong)] p-4"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[rgba(50,224,196,0.14)] text-[var(--accent-secondary-text)]">
                  <item.icon size={16} />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">
                    {item.title}
                  </p>
                  <p className="mt-2 text-2xl font-black text-[var(--text-primary)]">
                    {item.value}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                    {item.copy}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)]">
        <div className="space-y-5">
          {loadError ? (
            <div className="rounded-[1.2rem] border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-100">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p>{loadError}</p>
                <button
                  type="button"
                  onClick={() => void loadChallenges()}
                  className="btn-outline border-red-400/30 text-red-50 hover:bg-red-500/10"
                >
                  Try again
                </button>
              </div>
            </div>
          ) : null}

          <ChallengesPanel
            inboundChallenges={inboundChallenges}
            outboundChallenges={outboundChallenges}
            loading={loading}
            actionId={actionId}
            onAction={handleChallengeAction}
          />
        </div>

        <div className="space-y-5">
          <div className="card p-5">
            <p className="section-title">How It Works</p>
            <h2 className="mt-2 text-xl font-black text-[var(--text-primary)]">
              Fast decisions, less inbox noise.
            </h2>
            <div className="mt-4 space-y-3 text-sm leading-6 text-[var(--text-secondary)]">
              <p>
                Accepting a challenge creates the match immediately and moves you straight into score
                reporting.
              </p>
              <p>
                Declining clears the request cleanly, and cancelling your own request stops the other
                player from waiting on a dead invite.
              </p>
              <p>
                Expiring requests disappear automatically, so this list only holds decisions that still
                matter.
              </p>
            </div>
          </div>

          <div className="card p-5">
            <p className="section-title">Next Move</p>
            <h2 className="mt-2 text-xl font-black text-[var(--text-primary)]">
              Need a fresh opponent?
            </h2>
            <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
              Jump back to the leaderboard to call someone out, or use a public share link if you want
              to bring the challenge outside the app.
            </p>

            <div className="mt-4 flex flex-wrap gap-3">
              <Link href="/leaderboard" className="btn-primary">
                Leaderboard
                <ArrowRight size={14} />
              </Link>
              <Link href="/share" className="btn-ghost">
                Open share page
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
