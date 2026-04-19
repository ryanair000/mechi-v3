'use client';

import { useEffect, useState } from 'react';
import AnimatedNumberCountdown from '@/components/countdown-number';

type CountdownSnapshot = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  expired: boolean;
};

type LandingCountdownSectionProps = {
  closesAt: string;
  closesLabel: string;
  playerCap: number;
  registeredPlayers: number;
  initialSnapshot: CountdownSnapshot;
};

function getCountdownSnapshot(closesAt: string, nowMs = Date.now()): CountdownSnapshot {
  const remainingMs = Math.max(0, new Date(closesAt).getTime() - nowMs);
  const totalSeconds = Math.floor(remainingMs / 1000);

  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    expired: remainingMs <= 0,
  };
}

export function LandingCountdownSection({
  closesAt,
  closesLabel,
  playerCap,
  registeredPlayers,
  initialSnapshot,
}: LandingCountdownSectionProps) {
  const [snapshot, setSnapshot] = useState<CountdownSnapshot>(initialSnapshot);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSnapshot(getCountdownSnapshot(closesAt));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [closesAt]);

  const spotsLeft = Math.max(0, playerCap - registeredPlayers);

  return (
    <section className="landing-section">
      <div className="landing-shell">
        <div className="card circuit-panel p-6 sm:p-7 lg:flex lg:items-center lg:justify-between lg:gap-8">
          <div className="max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <p className="section-title">Countdown</p>
              <span className="inline-flex items-center gap-2 rounded-full bg-[rgba(50,224,196,0.12)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--accent-secondary-text)]">
                <span className="h-2 w-2 rounded-full bg-[var(--brand-teal)]" />
                Live
              </span>
            </div>

            <h2 className="mt-3 text-3xl font-black text-[var(--text-primary)] sm:text-[2.2rem]">
              Beta V3 registration closes {closesLabel}.
            </h2>
            <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
              {snapshot.expired
                ? `The ${playerCap}-player beta window is closed.`
                : `Open to the first ${playerCap} players. ${spotsLeft} ${spotsLeft === 1 ? 'spot' : 'spots'} left before the gate shuts on this beta run.`}
            </p>

            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">
              {registeredPlayers} players already joined
            </p>
          </div>

          <div className="mt-5 flex-1 lg:mt-0 lg:max-w-2xl">
            <AnimatedNumberCountdown values={snapshot} />

            <div className="mt-3 rounded-2xl border border-[var(--border-color)] bg-[var(--surface-strong)] px-4 py-3 text-sm text-[var(--text-secondary)]">
              {snapshot.expired
                ? `${registeredPlayers} players made it into this beta lane.`
                : `${spotsLeft} ${spotsLeft === 1 ? 'spot is' : 'spots are'} still open before the ${playerCap}-player cap is reached.`}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
