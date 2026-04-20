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

function getInitial(value?: string | null) {
  return value?.trim().charAt(0).toUpperCase() || '?';
}

function getGameLabel(challenge: MatchChallenge) {
  return GAMES[challenge.game]?.label ?? challenge.game;
}

function getPlatformLabel(challenge: MatchChallenge) {
  return PLATFORMS[challenge.platform as PlatformKey]?.label ?? challenge.platform;
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
          <h2 className="mt-2 text-xl font-black text-[var(--text-primary)]">Incoming challenges</h2>
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
              const challengerName = challenge.challenger?.username ?? 'A player';

              return (
                <div
                  key={challenge.id}
                  className="rounded-[1.1rem] border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="avatar-shell flex h-10 w-10 shrink-0 items-center justify-center text-sm font-black">
                        {getInitial(challengerName)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-black text-[var(--text-primary)]">
                          {challengerName} challenged you
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          <span className="brand-chip px-2 py-0.5">{getGameLabel(challenge)}</span>
                          <span className="brand-chip-coral px-2 py-0.5">
                            {getPlatformLabel(challenge)}
                          </span>
                          <span className="text-[11px] text-[var(--text-soft)]">
                            {formatTimestamp(challenge.created_at)}
                          </span>
                        </div>
                        {challenge.message ? (
                          <p className="mt-3 rounded-xl border border-[var(--border-color)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-secondary)]">
                            {challenge.message}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 lg:justify-end">
                      <button
                        type="button"
                        onClick={() => void onAction(challenge.id, 'accept')}
                        disabled={pendingAccept || pendingDecline}
                        className="btn-primary min-h-9 px-3 py-2 text-xs"
                      >
                        {pendingAccept ? 'Accepting...' : 'Accept'}
                      </button>
                      <button
                        type="button"
                        onClick={() => void onAction(challenge.id, 'decline')}
                        disabled={pendingAccept || pendingDecline}
                        className="btn-danger min-h-9 px-3 py-2 text-xs"
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
              const opponentName = challenge.opponent?.username ?? 'your opponent';

              return (
                <div
                  key={challenge.id}
                  className="rounded-[1.1rem] border border-[var(--border-color)] bg-[rgba(50,224,196,0.06)] p-4"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="avatar-shell flex h-10 w-10 shrink-0 items-center justify-center text-sm font-black">
                        {getInitial(opponentName)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-black text-[var(--text-primary)]">
                          Waiting on {opponentName}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          <span className="brand-chip px-2 py-0.5">{getGameLabel(challenge)}</span>
                          <span className="brand-chip-coral px-2 py-0.5">
                            {getPlatformLabel(challenge)}
                          </span>
                          <span className="inline-flex items-center gap-1.5 text-[11px] text-[var(--text-soft)]">
                            <Clock3 size={11} />
                            Expires {formatTimestamp(challenge.expires_at)}
                          </span>
                        </div>
                        {challenge.message ? (
                          <p className="mt-3 rounded-xl border border-[var(--border-color)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-secondary)]">
                            {challenge.message}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => void onAction(challenge.id, 'cancel')}
                      disabled={pendingCancel}
                      className="btn-outline min-h-9 px-3 py-2 text-xs"
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
