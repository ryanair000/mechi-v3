'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { Calendar, Clock, Users } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EventCountdownCardProps {
  attendees?: number;
  ctaLabel?: string;
  date: Date;
  href: string;
  image?: string;
  subtitle?: string;
  title: string;
}

function getTimeUnits(seconds: number) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return { days, hours, minutes, seconds: secs };
}

export function EventCountdownCard({
  attendees = 0,
  ctaLabel = 'Reserve your spot',
  date,
  href,
  image = '/game-artwork/pubgm-header.webp',
  subtitle = 'Tournament starts in',
  title,
}: EventCountdownCardProps) {
  const shouldReduceMotion = useReducedMotion();
  const [timeLeft, setTimeLeft] = useState(() =>
    Math.max(0, Math.floor((date.getTime() - Date.now()) / 1000))
  );

  useEffect(() => {
    const update = () => {
      setTimeLeft(Math.max(0, Math.floor((date.getTime() - Date.now()) / 1000)));
    };

    update();
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, [date]);

  const units = useMemo(() => getTimeUnits(timeLeft), [timeLeft]);
  const startsSoon = timeLeft > 0 && timeLeft < 86400;

  return (
    <motion.div
      data-slot="event-countdown-card"
      initial={shouldReduceMotion ? false : { opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={shouldReduceMotion ? undefined : { y: -3 }}
      transition={{ duration: 0.24, ease: 'easeOut' }}
      className="overflow-hidden rounded-[var(--radius-panel)] border border-[var(--border-color)] bg-[var(--surface)] shadow-[var(--shadow-soft)]"
    >
      <div className="grid min-h-[280px] lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div
          className="relative min-h-48 bg-cover bg-center"
          style={{ backgroundImage: `url(${image})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent" />
          {startsSoon ? (
            <div className="absolute right-4 top-4 rounded-full bg-[var(--brand-coral)] px-3 py-1 text-xs font-black text-[var(--brand-night)]">
              Starts soon
            </div>
          ) : null}
          <div className="absolute bottom-4 left-4 right-4">
            <p className="section-title text-white/80">Featured tournament</p>
            <h2 className="mt-2 text-2xl font-black leading-tight text-white sm:text-3xl">
              {title}
            </h2>
          </div>
        </div>

        <div className="flex flex-col justify-between gap-5 p-5 sm:p-6">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-4 text-sm text-[var(--text-secondary)]">
              <span className="inline-flex items-center gap-1.5">
                <Calendar size={15} className="text-[var(--brand-teal)]" />
                {date.toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Users size={15} className="text-[var(--brand-teal)]" />
                {attendees} registered
              </span>
            </div>

            <div>
              <p className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-[var(--text-secondary)]">
                <Clock size={15} className="text-[var(--brand-teal)]" />
                {timeLeft > 0 ? subtitle : 'Tournament is live'}
              </p>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { value: units.days, label: 'Days' },
                  { value: units.hours, label: 'Hours' },
                  { value: units.minutes, label: 'Min' },
                  { value: units.seconds, label: 'Sec' },
                ].map((unit) => (
                  <div
                    key={unit.label}
                    className="rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--surface-elevated)] p-3 text-center"
                  >
                    <p className="font-mono text-xl font-black text-[var(--text-primary)]">
                      {unit.value.toString().padStart(2, '0')}
                    </p>
                    <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-soft)]">
                      {unit.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <Link
            href={href}
            className={cn(buttonVariants({ variant: 'default' }), 'w-full')}
          >
            {timeLeft > 0 ? ctaLabel : 'Open tournament'}
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
