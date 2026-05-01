'use client';

import { Clock3, X } from 'lucide-react';
import { GAMES, PLATFORMS } from '@/lib/config';
import type { MatchChallenge, PlatformKey } from '@/types';

type ChallengeAction = 'cancel';

interface ChallengesPanelProps {
  outboundChallenges: MatchChallenge[];
  loading: boolean;
  actionId: string | null;
  onAction: (challengeId: string, action: ChallengeAction) => Promise<void> | void;
}

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString('en-KE', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getGameLabel(challenge: MatchChallenge) {
  return GAMES[challenge.game]?.label ?? challenge.game;
}

function getPlatformLabel(challenge: MatchChallenge) {
  return PLATFORMS[challenge.platform as PlatformKey]?.label ?? challenge.platform;
}

function ChallengeTable({
  title,
  description,
  emptyCopy,
  rows,
  loading,
}: {
  title: string;
  description: string;
  emptyCopy: string;
  rows: React.ReactNode;
  loading: boolean;
}) {
  return (
    <section className="border-t border-[var(--border-color)] pt-5 first:border-t-0 first:pt-0">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-[var(--text-soft)]">
            {title}
          </h2>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">{description}</p>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[44rem] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--border-color)] text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--text-soft)]">
              <th className="pb-3 pr-4">Player</th>
              <th className="pb-3 pr-4">Game</th>
              <th className="pb-3 pr-4">Platform</th>
              <th className="pb-3 pr-4">Message</th>
              <th className="pb-3 pr-4">Time</th>
              <th className="pb-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <>
                <tr className="border-b border-[var(--border-color)]">
                  <td colSpan={6} className="py-4">
                    <div className="h-10 shimmer rounded-xl" />
                  </td>
                </tr>
                <tr className="border-b border-[var(--border-color)]">
                  <td colSpan={6} className="py-4">
                    <div className="h-10 shimmer rounded-xl" />
                  </td>
                </tr>
              </>
            ) : rows ? (
              rows
            ) : (
              <tr>
                <td colSpan={6} className="py-6 text-sm text-[var(--text-secondary)]">
                  {emptyCopy}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function ChallengesPanel({
  outboundChallenges,
  loading,
  actionId,
  onAction,
}: ChallengesPanelProps) {
  const hasOutbound = outboundChallenges.length > 0;

  return (
    <div className="space-y-6">
      <ChallengeTable
        title="Sent"
        description="Track the calls you already sent and cancel stale ones fast."
        emptyCopy={loading ? '' : 'No outgoing challenges waiting right now.'}
        loading={loading}
        rows={
          hasOutbound
            ? outboundChallenges.map((challenge) => {
                const pendingCancel = actionId === `${challenge.id}:cancel`;
                const opponentName = challenge.opponent?.username ?? 'your opponent';

                return (
                  <tr key={challenge.id} className="border-b border-[var(--border-color)] align-top last:border-b-0">
                    <td className="py-4 pr-4">
                      <p className="font-semibold text-[var(--text-primary)]">{opponentName}</p>
                    </td>
                    <td className="py-4 pr-4 text-[var(--text-primary)]">{getGameLabel(challenge)}</td>
                    <td className="py-4 pr-4 text-[var(--text-secondary)]">{getPlatformLabel(challenge)}</td>
                    <td className="py-4 pr-4 text-[var(--text-secondary)]">
                      {challenge.message?.trim() ? challenge.message : 'No message'}
                    </td>
                    <td className="py-4 pr-4 text-[var(--text-soft)]">
                      <span className="inline-flex items-center gap-1.5">
                        <Clock3 size={12} />
                        Expires {formatTimestamp(challenge.expires_at)}
                      </span>
                    </td>
                    <td className="py-4 text-right">
                      <button
                        type="button"
                        onClick={() => void onAction(challenge.id, 'cancel')}
                        disabled={pendingCancel}
                        className="btn-ghost min-h-9 px-3 py-2 text-xs"
                      >
                        <X size={14} />
                        {pendingCancel ? 'Cancelling...' : 'Cancel'}
                      </button>
                    </td>
                  </tr>
                );
              })
            : null
        }
      />
    </div>
  );
}
