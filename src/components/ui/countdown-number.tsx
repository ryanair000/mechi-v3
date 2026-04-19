'use client';

import React, { useEffect, useState } from 'react';
import NumberFlow from '@number-flow/react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const MotionNumberFlow = motion.create(NumberFlow);

interface CountdownProps {
  endDate: Date;
  startDate?: Date;
  className?: string;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function getTimeLeft(endDate: Date, startDate?: Date): TimeLeft {
  const start = startDate ? new Date(startDate) : new Date();
  const end = new Date(endDate);
  const difference = end.getTime() - start.getTime();

  if (difference <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  }

  return {
    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((difference / 1000 / 60) % 60),
    seconds: Math.floor((difference / 1000) % 60),
  };
}

export default function AnimatedNumberCountdown({
  endDate,
  startDate,
  className,
}: CountdownProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(() => getTimeLeft(endDate, startDate));

  useEffect(() => {
    const calculateTimeLeft = () => setTimeLeft(getTimeLeft(endDate, startDate));

    calculateTimeLeft();
    const timer = window.setInterval(calculateTimeLeft, 1000);

    return () => window.clearInterval(timer);
  }, [endDate, startDate]);

  return (
    <div className={cn('flex items-center justify-center gap-4 text-[var(--text-primary)]', className)}>
      <div className="flex flex-col items-center">
        <MotionNumberFlow
          value={timeLeft.days}
          className="text-5xl font-semibold tracking-tighter tabular-nums"
          format={{ minimumIntegerDigits: 2 }}
        />
        <span className="text-sm text-[var(--text-soft)]">Days</span>
      </div>
      <div className="text-2xl font-bold text-[var(--text-soft)]">:</div>
      <div className="flex flex-col items-center">
        <MotionNumberFlow
          value={timeLeft.hours}
          className="text-5xl font-semibold tracking-tighter tabular-nums"
          format={{ minimumIntegerDigits: 2 }}
        />
        <span className="text-sm text-[var(--text-soft)]">Hours</span>
      </div>
      <div className="text-2xl font-bold text-[var(--text-soft)]">:</div>
      <div className="flex flex-col items-center">
        <MotionNumberFlow
          value={timeLeft.minutes}
          className="text-5xl font-semibold tracking-tighter tabular-nums"
          format={{ minimumIntegerDigits: 2 }}
        />
        <span className="text-sm text-[var(--text-soft)]">Minutes</span>
      </div>
      <div className="text-2xl font-bold text-[var(--text-soft)]">:</div>
      <div className="flex flex-col items-center">
        <MotionNumberFlow
          value={timeLeft.seconds}
          className="text-5xl font-semibold tracking-tighter tabular-nums"
          format={{ minimumIntegerDigits: 2 }}
        />
        <span className="text-sm text-[var(--text-soft)]">Seconds</span>
      </div>
    </div>
  );
}
