'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BellRing, Gamepad2, Swords, Trophy, X } from 'lucide-react';

const ONBOARDING_STORAGE_KEY = 'mechi_onboarding_seen_v1';
const ONBOARDING_OPEN_EVENT = 'mechi:open-onboarding';

const STEPS = [
  {
    title: 'Set your setup',
    body: 'Pick the games you play most, choose the right platform, and save the IDs people need.',
    icon: Gamepad2,
  },
  {
    title: 'Start the action',
    body: 'Queue for ranked matches, send a direct challenge, or jump into lobbies and tournaments.',
    icon: Swords,
  },
  {
    title: 'Track the flow',
    body: 'Use your dashboard, queue, and match history to see what is live and what needs your next action.',
    icon: BellRing,
  },
  {
    title: 'Lock the result',
    body: 'Finish the report flow cleanly so rankings, streaks, and progress keep moving.',
    icon: Trophy,
  },
] as const;

export function openAppOnboarding() {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new Event(ONBOARDING_OPEN_EVENT));
}

export function AppOnboarding() {
  const router = useRouter();
  const [open, setOpen] = useState(() => {
    if (typeof window === 'undefined') {
      return false;
    }

    return window.localStorage.getItem(ONBOARDING_STORAGE_KEY) !== 'true';
  });

  useEffect(() => {
    const handleOpen = () => setOpen(true);
    window.addEventListener(ONBOARDING_OPEN_EVENT, handleOpen);

    return () => {
      window.removeEventListener(ONBOARDING_OPEN_EVENT, handleOpen);
    };
  }, []);

  const closeOnboarding = () => {
    window.localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
    setOpen(false);
  };

  const openGames = () => {
    closeOnboarding();
    router.push('/games');
  };

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[85] flex items-end justify-center px-4 pb-4 sm:items-center sm:pb-0">
      <button
        type="button"
        aria-label="Close onboarding"
        className="absolute inset-0 bg-[rgba(11,17,33,0.72)] backdrop-blur-sm"
        onClick={closeOnboarding}
      />

      <div className="card relative z-[1] w-full max-w-[38.4rem] overflow-hidden p-4 sm:p-5">
        <button
          type="button"
          onClick={closeOnboarding}
          className="icon-button absolute right-3.5 top-3.5 h-8 w-8"
          aria-label="Close"
        >
          <X size={13} />
        </button>

        <div className="max-w-[33.6rem]">
          <p className="section-title">Welcome to Mechi</p>
          <h2 className="mt-2.5 text-xl font-black text-[var(--text-primary)] sm:text-[1.75rem]">
            Your quickest path from setup to match day.
          </h2>
          <p className="mt-2.5 text-[13px] leading-5 text-[var(--text-secondary)]">
            Keep your grind simple: set your games once, follow the right lane, and let Mechi keep
            your next action obvious.
          </p>
        </div>

        <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
          {STEPS.map((step, index) => {
            const Icon = step.icon;

            return (
              <div
                key={step.title}
                className="rounded-lg border border-[var(--border-color)] bg-[var(--surface-elevated)] p-3.5"
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[rgba(50,224,196,0.14)] text-[var(--accent-secondary-text)]">
                    <Icon size={14} />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-soft)]">
                      Step {index + 1}
                    </p>
                    <p className="text-[13px] font-black text-[var(--text-primary)]">{step.title}</p>
                  </div>
                </div>
                <p className="mt-2.5 text-[13px] leading-5 text-[var(--text-secondary)]">{step.body}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-5 flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[11px] text-[var(--text-soft)]">Reopen this from Dashboard any time.</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={closeOnboarding}
              className="btn-outline min-h-8 justify-center px-3 py-1.5 text-[0.7rem]"
            >
              Got it
            </button>
            <button
              type="button"
              onClick={openGames}
              className="btn-primary min-h-8 justify-center px-3 py-1.5 text-[0.7rem]"
            >
              <Gamepad2 size={12} />
              Open Games
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
