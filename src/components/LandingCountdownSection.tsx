'use client';

import { useEffect, useState } from 'react';
import { Puzzle } from 'lucide-react';
import AnimatedNumberCountdown from '@/components/ui/countdown-number';

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
  const statusLabel = snapshot.expired
    ? 'Closed'
    : spotsLeft === 0
      ? 'At capacity'
      : snapshot.days === 0
        ? 'Closing soon'
        : 'Open now';
  const sectionCopy = snapshot.expired
    ? `Beta V3 closed at the end of ${closesLabel}. ${registeredPlayers} players made it into this ${playerCap}-player wave before the timer ran out.`
    : spotsLeft === 0
      ? `All ${playerCap} beta spots are currently claimed. The countdown still marks the official close at the end of ${closesLabel}.`
      : `The first ${playerCap} players get into this beta wave. ${registeredPlayers} are already in, so ${spotsLeft} ${spotsLeft === 1 ? 'spot is' : 'spots are'} still open before the timer hits zero.`;
  const metaItems = snapshot.expired
    ? [
        `${registeredPlayers}/${playerCap} players joined`,
        `Registration closed ${closesLabel}`,
      ]
    : [
        statusLabel,
        `${spotsLeft} ${spotsLeft === 1 ? 'spot' : 'spots'} left`,
        `${registeredPlayers}/${playerCap} joined`,
        `Closes ${closesLabel}`,
      ];

  return (
    <section className="landing-section pt-0">
      <div className="landing-shell">
        <div className="overflow-hidden rounded-[var(--radius-card)] border border-[rgba(50,224,196,0.14)] bg-[rgba(50,224,196,0.04)] px-6 py-10 sm:px-8 sm:py-14 lg:px-12">
          <div className="mx-auto flex max-w-4xl flex-col items-center justify-center text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-[rgba(50,224,196,0.22)] bg-[var(--accent-secondary-soft)] px-4 py-2 text-sm font-semibold uppercase tracking-[0.14em] text-[var(--accent-secondary-text)]">
              <Puzzle size={14} />
              Beta V3 countdown
            </span>

            <p className="mt-6 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--accent-secondary-text)]">
              Registration pulse
            </p>
            <h2 className="mt-3 max-w-3xl text-3xl font-black leading-[1.08] text-[var(--text-primary)] sm:text-[3.4rem]">
              {snapshot.expired ? 'Beta V3 registration is closed.' : 'Time left to join Beta V3'}
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-8 text-[var(--text-secondary)]">
              {sectionCopy}
            </p>

            <AnimatedNumberCountdown
              endDate={new Date(closesAt)}
              className="my-8 flex-wrap gap-3 sm:my-10 sm:gap-4 md:flex-nowrap"
            />

            <div className="flex flex-wrap items-center justify-center gap-3">
              {metaItems.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-[var(--border-color)] bg-[var(--surface-strong)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)]"
                >
                  {item}
                </span>
              ))}
            </div>

            <p className="mt-6 max-w-2xl text-sm leading-7 text-[var(--text-soft)]">
              {snapshot.expired
                ? 'This countdown reached zero at the official close of the registration window.'
                : 'Once this timer reaches zero, this beta registration window closes.'}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
