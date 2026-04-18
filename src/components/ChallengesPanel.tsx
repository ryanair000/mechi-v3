'use client';

import { Clock3, X } from 'lucide-react';
import { GAMES, PLATFORMS } from '@/lib/config';
import type { MatchChallenge, PlatformKey } from '@/types';

type ChallengeAction = 'accept' | 'decline' | 'cancel';

interface ChallengesPanelProps {
  inboundChallenges: MatchChallenge[];
  outboundChallenges: MatchChallenge[];
  loading: boolean;
  actionId: string | null;
  onAction: (challengeId: string, action: ChallengeAction) => Promise<void> | void;
  emptyCopy?: string;
}

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString('en-KE', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function challengeLabel(challenge: MatchChallenge) {
  const gameLabel = GAMES[challenge.game]?.label ?? challenge.game;
  const platformLabel = PLATFORMS[challenge.platform as PlatformKey]?.label ?? challenge.platform;
  return `${gameLabel} on ${platformLabel}`;
}

export function ChallengesPanel({
  inboundChallenges,
  outboundChallenges,
  loading,
  actionId,
  onAction,
  emptyCopy = 'No pending direct challenges yet. Use the leaderboard or a public profile to call someone out.',
}: ChallengesPanelProps) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="section-title">Direct Challenges</p>
          <h2 className="mt-2 text-xl font-black text-[var(--text-primary)]">Pending replies</h2>
        </div>
        <span className="brand-chip px-3 py-1">
          {inboundChallenges.length + outboundChallenges.length} live
        </span>
      </div>

      <div className="mt-4 space-y-3">
        {loading ? (
          <>
            <div className="h-24 shimmer" />
            <div className="h-24 shimmer" />
          </>
        ) : inboundChallenges.length === 0 && outboundChallenges.length === 0 ? (
          <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4 text-sm text-[var(--text-secondary)]">
            {emptyCopy}
          </div>
        ) : (
          <>
            {inboundChallenges.map((challenge) => {
              const pendingAccept = actionId === `${challenge.id}:accept`;
              const pendingDecline = actionId === `${challenge.id}:decline`;

              return (
                <div
                  key={challenge.id}
                  className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm font-black text-[var(--text-primary)]">
                        {challenge.challenger?.username ?? 'A player'} challenged you
                      </p>
                      <p className="mt-1 text-sm text-[var(--text-secondary)]">
                        {challengeLabel(challenge)}
                      </p>
                      <p className="mt-2 text-xs text-[var(--text-soft)]">
                        Sent {formatTimestamp(challenge.created_at)}
                      </p>
                      {challenge.message ? (
                        <p className="mt-3 rounded-xl border border-[var(--border-color)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-secondary)]">
                          {challenge.message}
                        </p>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap gap-2 sm:justify-end">
                      <button
                        type="button"
                        onClick={() => void onAction(challenge.id, 'accept')}
                        disabled={pendingAccept || pendingDecline}
                        className="btn-primary"
                      >
                        {pendingAccept ? 'Accepting...' : 'Accept'}
                      </button>
                      <button
                        type="button"
                        onClick={() => void onAction(challenge.id, 'decline')}
                        disabled={pendingAccept || pendingDecline}
                        className="btn-outline"
                      >
                        {pendingDecline ? 'Declining...' : 'Decline'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {outboundChallenges.map((challenge) => {
              const pendingCancel = actionId === `${challenge.id}:cancel`;

              return (
                <div
                  key={challenge.id}
                  className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm font-black text-[var(--text-primary)]">
                        Waiting on {challenge.opponent?.username ?? 'your opponent'}
                      </p>
                      <p className="mt-1 text-sm text-[var(--text-secondary)]">
                        {challengeLabel(challenge)}
                      </p>
                      <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-[var(--text-soft)]">
                        <Clock3 size={12} />
                        Expires {formatTimestamp(challenge.expires_at)}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => void onAction(challenge.id, 'cancel')}
                      disabled={pendingCancel}
                      className="btn-outline"
                    >
                      <X size={14} />
                      {pendingCancel ? 'Cancelling...' : 'Cancel'}
                    </button>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
