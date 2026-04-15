'use client';

import Link from 'next/link';
import { Lock, X, Zap } from 'lucide-react';
import { PLANS } from '@/lib/plans';

interface PaywallModalProps {
  reason: 'match_limit' | 'game_limit' | 'feature';
  featureName?: string;
  onClose: () => void;
}

const COPY = {
  match_limit: {
    title: "You've hit today's match cap",
    body: 'Free players get 5 ranked matches per day. Upgrade to Pro or Elite for unlimited runs.',
  },
  game_limit: {
    title: 'Unlock more focus games',
    body: 'Free players can save 1 main game. Upgrade to unlock up to 3.',
  },
  feature: {
    title: 'This feature is premium',
    body: 'Upgrade your plan to unlock this extra Mechi polish.',
  },
} as const;

export function PaywallModal({ reason, featureName, onClose }: PaywallModalProps) {
  const title = reason === 'feature' ? `${featureName ?? 'This feature'} is premium` : COPY[reason].title;
  const body = reason === 'feature' ? COPY.feature.body : COPY[reason].body;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center px-4 pb-4 sm:items-center sm:pb-0">
      <button
        type="button"
        aria-label="Close upgrade modal"
        className="absolute inset-0 bg-[rgba(11,17,33,0.72)] backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="card relative z-[1] w-full max-w-md p-5 sm:p-6">
        <button
          type="button"
          onClick={onClose}
          className="icon-button absolute right-4 top-4 h-9 w-9"
          aria-label="Close"
        >
          <X size={15} />
        </button>

        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[rgba(255,107,107,0.14)] text-[var(--brand-coral)]">
          <Lock size={18} />
        </div>

        <h3 className="mt-4 text-xl font-black text-[var(--text-primary)]">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{body}</p>

        <div className="mt-5 space-y-2.5">
          {(['pro', 'elite'] as const).map((planKey) => {
            const plan = PLANS[planKey];
            return (
              <div
                key={planKey}
                className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] px-4 py-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-[var(--text-primary)]">{plan.name}</p>
                    <p className="mt-1 text-xs text-[var(--text-soft)]">
                      {planKey === 'pro' ? 'Unlimited matches / 3 games' : 'Priority perks / full access'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-[var(--text-primary)]">KSH {plan.monthlyKes}</p>
                    <p className="text-[11px] text-[var(--text-soft)]">per month</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <Link href="/pricing" onClick={onClose} className="btn-primary justify-center">
            <Zap size={14} />
            View plans
          </Link>
          <button type="button" onClick={onClose} className="btn-outline justify-center">
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}
