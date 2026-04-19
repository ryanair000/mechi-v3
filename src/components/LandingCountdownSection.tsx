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
  const progressPercent = playerCap > 0 ? Math.min(100, Math.round((registeredPlayers / playerCap) * 100)) : 0;
  const statusLabel = snapshot.expired
    ? 'Closed'
    : spotsLeft === 0
      ? 'At capacity'
      : snapshot.days === 0
        ? 'Closing soon'
        : 'Open now';
  const statusClassName = snapshot.expired
    ? 'border-[rgba(255,107,107,0.18)] bg-[rgba(255,107,107,0.12)] text-[#c95252]'
    : spotsLeft === 0
      ? 'border-[rgba(255,107,107,0.18)] bg-[rgba(255,107,107,0.12)] text-[#c95252]'
      : snapshot.days === 0
        ? 'border-[rgba(251,191,36,0.22)] bg-[rgba(251,191,36,0.16)] text-[#b88919]'
        : 'border-[rgba(50,224,196,0.18)] bg-[rgba(50,224,196,0.12)] text-[var(--accent-secondary-text)]';
  const sectionCopy = snapshot.expired
    ? `${registeredPlayers} players claimed a spot before the ${playerCap}-player beta window shut.`
    : spotsLeft === 0
      ? `All ${playerCap} beta spots are currently claimed. The registration window still stays open until the end of ${closesLabel}.`
      : `The first ${playerCap} players get into this beta wave. ${registeredPlayers} are already in, leaving ${spotsLeft} ${spotsLeft === 1 ? 'spot' : 'spots'} before the cap is hit.`;
  const timerCopy = snapshot.expired
    ? `${registeredPlayers} players made it into this beta lane before the timer hit zero.`
    : spotsLeft === 0
      ? `The player cap is full right now, and the countdown shows when this registration window officially ends.`
      : `${spotsLeft} ${spotsLeft === 1 ? 'spot is' : 'spots are'} still open. Once the timer reaches zero, this beta wave closes.`;

  return (
    <section className="landing-section">
      <div className="landing-shell">
        <div className="card circuit-panel p-4 sm:p-5 lg:p-6">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <div className="order-2 rounded-[1.55rem] border border-[var(--border-color)] bg-[var(--surface-soft)] p-5 sm:p-6 lg:order-1">
              <p className="section-title">Registration pulse</p>
              <h2 className="mt-3 max-w-xl text-3xl font-black text-[var(--text-primary)] sm:text-[2.2rem]">
                {snapshot.expired ? 'Beta V3 registration has closed.' : 'Claim your spot before Beta V3 closes.'}
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--text-secondary)]">
                {sectionCopy}
              </p>

              <div className="mt-5 rounded-[1.4rem] border border-[var(--border-color)] bg-[var(--surface-strong)] p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">
                      Beta seats claimed
                    </p>
                    <p className="mt-2 text-3xl font-black text-[var(--text-primary)]">
                      {registeredPlayers}
                      <span className="ml-1 text-base font-semibold text-[var(--text-soft)]">/ {playerCap}</span>
                    </p>
                  </div>

                  <span className="inline-flex rounded-full border border-[rgba(50,224,196,0.18)] bg-[rgba(50,224,196,0.12)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--accent-secondary-text)]">
                    {progressPercent}% full
                  </span>
                </div>

                <div
                  className="mt-4 h-3 overflow-hidden rounded-full bg-[var(--surface)]"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={playerCap}
                  aria-valuenow={Math.min(registeredPlayers, playerCap)}
                  aria-label="Beta registration progress"
                >
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${progressPercent}%`,
                      background: 'linear-gradient(90deg, var(--brand-teal), rgba(255, 107, 107, 0.82))',
                    }}
                  />
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[1.1rem] border border-[var(--border-color)] bg-[var(--surface)] px-4 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">
                      Spots left
                    </p>
                    <p className="mt-2 text-2xl font-black text-[var(--text-primary)]">{spotsLeft}</p>
                    <p className="mt-1 text-xs text-[var(--text-secondary)]">
                      {spotsLeft === 0 ? 'Player cap reached' : 'First come, first served'}
                    </p>
                  </div>

                  <div className="rounded-[1.1rem] border border-[var(--border-color)] bg-[var(--surface)] px-4 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">
                      Deadline
                    </p>
                    <p className="mt-2 text-lg font-black text-[var(--text-primary)]">
                      {snapshot.expired ? 'Closed' : 'End of day'}
                    </p>
                    <p className="mt-1 text-xs text-[var(--text-secondary)]">{closesLabel}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="order-1 rounded-[1.55rem] border border-[var(--border-color)] bg-[linear-gradient(180deg,var(--surface-strong),var(--surface))] p-5 sm:p-6 lg:order-2">
              <div className="flex flex-wrap items-center gap-2">
                <p className="section-title">Countdown</p>
                <span
                  className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${statusClassName}`}
                >
                  {statusLabel}
                </span>
              </div>

              <h3 className="mt-3 text-2xl font-black text-[var(--text-primary)] sm:text-[2rem]">
                {snapshot.expired ? 'Registration window closed' : 'Time left to join Beta V3'}
              </h3>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
                {snapshot.expired
                  ? `The countdown has reached zero. This beta wave closed at the end of ${closesLabel}.`
                  : `Deadline: end of day ${closesLabel}. Once the timer reaches zero, this registration window closes.`}
              </p>

              <div className="mt-5">
                <AnimatedNumberCountdown
                  values={snapshot}
                  itemClassName="border-[var(--border-strong)] bg-[var(--surface-strong)] px-4 py-5"
                  valueClassName="text-[2rem] sm:text-[2.4rem]"
                  labelClassName="mt-2 text-[10px] tracking-[0.2em]"
                />
              </div>

              <div className="mt-4 rounded-[1.2rem] border border-[var(--border-color)] bg-[var(--surface)] px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">
                  What this means
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{timerCopy}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
