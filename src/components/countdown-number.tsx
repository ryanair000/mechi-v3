'use client';

import { useEffect, useState } from 'react';
import NumberFlow from '@number-flow/react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const MotionNumberFlow = motion.create(NumberFlow);

export type CountdownValues = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

type AnimatedNumberCountdownProps = {
  values?: CountdownValues;
  endDate?: Date;
  className?: string;
  itemClassName?: string;
  valueClassName?: string;
  labelClassName?: string;
};

const EMPTY_VALUES: CountdownValues = {
  days: 0,
  hours: 0,
  minutes: 0,
  seconds: 0,
};

function getTimeLeft(endDate: Date): CountdownValues {
  const difference = Math.max(0, endDate.getTime() - Date.now());

  return {
    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((difference / 1000 / 60) % 60),
    seconds: Math.floor((difference / 1000) % 60),
  };
}

export default function AnimatedNumberCountdown({
  values,
  endDate,
  className,
  itemClassName,
  valueClassName,
  labelClassName,
}: AnimatedNumberCountdownProps) {
  const [liveValues, setLiveValues] = useState<CountdownValues>(() =>
    endDate ? getTimeLeft(endDate) : EMPTY_VALUES
  );

  useEffect(() => {
    if (values || !endDate) {
      return undefined;
    }

    const updateCountdown = () => {
      setLiveValues(getTimeLeft(endDate));
    };

    updateCountdown();
    const timer = window.setInterval(updateCountdown, 1000);

    return () => window.clearInterval(timer);
  }, [values, endDate]);

  const displayValues = values ?? liveValues;
  const countdownItems = [
    { value: displayValues.days, label: 'Days', minimumIntegerDigits: 2 },
    { value: displayValues.hours, label: 'Hours', minimumIntegerDigits: 2 },
    { value: displayValues.minutes, label: 'Minutes', minimumIntegerDigits: 2 },
    { value: displayValues.seconds, label: 'Seconds', minimumIntegerDigits: 2 },
  ];

  return (
    <div className={cn('grid grid-cols-2 gap-3 sm:grid-cols-4', className)}>
      {countdownItems.map((item) => (
        <div
          key={item.label}
          className={cn(
            'rounded-2xl border border-[var(--border-color)] bg-[var(--surface-strong)] px-4 py-4 text-center',
            itemClassName
          )}
        >
          <MotionNumberFlow
            value={item.value}
            className={cn(
              'text-3xl font-black tracking-tight text-[var(--text-primary)] tabular-nums',
              valueClassName
            )}
            format={{ minimumIntegerDigits: item.minimumIntegerDigits }}
          />
          <p
            className={cn(
              'mt-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]',
              labelClassName
            )}
          >
            {item.label}
          </p>
        </div>
      ))}
    </div>
  );
}
