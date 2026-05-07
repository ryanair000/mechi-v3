'use client';

import { type KeyboardEvent, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, CirclePlay } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Testimonial {
  name: string;
  title: string;
  description: string;
  initials: string;
  imageUrl?: string;
  youtubeUrl?: string;
}

const testimonials: Testimonial[] = [
  {
    name: 'Kabaka Mwangi',
    title: 'Streamer',
    description:
      'Kabaka is on the PlayMechi stream all three nights, calling the big plays, the clutch moments, and every winner live on YouTube.',
    initials: 'KM',
    youtubeUrl: 'https://www.youtube.com/@playmechi',
  },
  {
    name: 'Ephrem Gichuhi',
    title: 'Manager',
    description:
      'Ephrem keeps the lobbies ready, the players locked in, and the night moving fast from check-in to match time.',
    initials: 'EG',
  },
  {
    name: 'Ryan Alfred',
    title: 'Organizer',
    description:
      'Ryan leads the tournament run, setting up the brackets, rules, and prize path so players can focus on showing levels.',
    initials: 'RA',
  },
];

export interface TestimonialCarouselProps {
  className?: string;
}

function TeamPortrait({ member, className }: { member: Testimonial; className?: string }) {
  return (
    <div
      className={cn(
        'relative flex h-full w-full items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_35%_20%,rgba(50,224,196,0.34),transparent_32%),linear-gradient(145deg,rgba(10,18,31,0.98),rgba(24,34,54,0.94))]',
        className
      )}
    >
      {member.imageUrl ? (
        <Image
          src={member.imageUrl}
          alt={member.name}
          width={470}
          height={470}
          className="h-full w-full object-cover"
          draggable={false}
          priority
        />
      ) : (
        <>
          <div className="absolute inset-6 rounded-[2rem] border border-white/10" />
          <span className="relative text-7xl font-black tracking-normal text-white sm:text-8xl">
            {member.initials}
          </span>
        </>
      )}
    </div>
  );
}

export function TestimonialCarousel({ className }: TestimonialCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const lastActivationRef = useRef(0);

  const activate = (action: () => void) => {
    const now = Date.now();

    if (now - lastActivationRef.current < 120) {
      return;
    }

    lastActivationRef.current = now;
    action();
  };
  const handleNext = () => {
    setCurrentIndex((index) => (index + 1) % testimonials.length);
  };
  const handlePrevious = () => {
    setCurrentIndex((index) => (index - 1 + testimonials.length) % testimonials.length);
  };
  const handleKeyActivate = (event: KeyboardEvent<HTMLButtonElement>, action: () => void) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      action();
    }
  };

  const currentTestimonial = testimonials[currentIndex] ?? testimonials[0];

  return (
    <div className={cn('mx-auto w-full max-w-5xl px-0', className)}>
      <div className="relative hidden items-center md:flex">
        <div className="h-[470px] w-[470px] flex-shrink-0 overflow-hidden rounded-[var(--radius-card)] border border-white/10 bg-[var(--surface-strong)]">
          <TeamPortrait member={currentTestimonial} />
        </div>

        <div className="z-10 ml-[-80px] max-w-xl flex-1 rounded-[var(--radius-card)] border border-white/10 bg-[rgba(10,18,31,0.86)] p-8 shadow-2xl shadow-black/25 ring-1 ring-white/10 backdrop-blur-md">
          <div>
            <div className="mb-6">
              <h2 className="mb-2 text-2xl font-black text-[var(--text-primary)]">
                {currentTestimonial.name}
              </h2>

              <p className="text-sm font-semibold text-[var(--accent-secondary-text)]">
                {currentTestimonial.title}
              </p>
            </div>

            <p className="mb-8 text-base leading-7 text-[var(--text-secondary)]">
              {currentTestimonial.description}
            </p>

            {currentTestimonial.youtubeUrl ? (
              <Link
                href={currentTestimonial.youtubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[var(--brand-teal)] text-black transition-transform hover:scale-105"
                aria-label={`${currentTestimonial.name} YouTube`}
              >
                <CirclePlay className="pointer-events-none h-5 w-5" />
              </Link>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-sm bg-transparent text-center md:hidden">
        <div className="mb-6 aspect-square w-full overflow-hidden rounded-[var(--radius-card)] border border-white/10 bg-[var(--surface-strong)]">
          <TeamPortrait member={currentTestimonial} />
        </div>

        <div className="px-4">
          <div>
            <h2 className="mb-2 text-xl font-black text-[var(--text-primary)]">
              {currentTestimonial.name}
            </h2>

            <p className="mb-4 text-sm font-semibold text-[var(--accent-secondary-text)]">
              {currentTestimonial.title}
            </p>

            <p className="mb-6 text-sm leading-7 text-[var(--text-secondary)]">
              {currentTestimonial.description}
            </p>

            {currentTestimonial.youtubeUrl ? (
              <Link
                href={currentTestimonial.youtubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-[var(--brand-teal)] text-black"
                aria-label={`${currentTestimonial.name} YouTube`}
              >
                <CirclePlay className="pointer-events-none h-5 w-5" />
              </Link>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-8 flex items-center justify-center gap-6">
        <button
          type="button"
          onPointerDown={(event) => {
            event.preventDefault();
            activate(handlePrevious);
          }}
          onMouseDown={(event) => {
            event.preventDefault();
            activate(handlePrevious);
          }}
          onTouchStart={(event) => {
            event.preventDefault();
            activate(handlePrevious);
          }}
          onClick={(event) => {
            event.preventDefault();
            activate(handlePrevious);
          }}
          onKeyDown={(event) => handleKeyActivate(event, () => activate(handlePrevious))}
          aria-label="Previous team member"
          className="flex h-12 w-12 cursor-pointer items-center justify-center rounded-full border border-[var(--border-color)] bg-[var(--surface-strong)] shadow-md transition-colors hover:bg-[var(--surface-elevated)]"
        >
          <ChevronLeft className="pointer-events-none h-6 w-6 text-[var(--text-primary)]" />
          <span className="sr-only">Previous</span>
        </button>

        <div className="flex gap-2">
          {testimonials.map((testimonial, testimonialIndex) => (
            <button
              key={testimonial.name}
              type="button"
              onPointerDown={(event) => {
                event.preventDefault();
                activate(() => setCurrentIndex(testimonialIndex));
              }}
              onMouseDown={(event) => {
                event.preventDefault();
                activate(() => setCurrentIndex(testimonialIndex));
              }}
              onTouchStart={(event) => {
                event.preventDefault();
                activate(() => setCurrentIndex(testimonialIndex));
              }}
              onClick={(event) => {
                event.preventDefault();
                activate(() => setCurrentIndex(testimonialIndex));
              }}
              onKeyDown={(event) => handleKeyActivate(event, () => activate(() => setCurrentIndex(testimonialIndex)))}
              className={cn(
                'h-3 w-3 cursor-pointer rounded-full transition-colors',
                testimonialIndex === currentIndex
                  ? 'bg-[var(--brand-teal)]'
                  : 'bg-[rgba(255,255,255,0.26)]'
              )}
              aria-label={`Go to ${testimonial.name}`}
            />
          ))}
        </div>

        <button
          type="button"
          onPointerDown={(event) => {
            event.preventDefault();
            activate(handleNext);
          }}
          onMouseDown={(event) => {
            event.preventDefault();
            activate(handleNext);
          }}
          onTouchStart={(event) => {
            event.preventDefault();
            activate(handleNext);
          }}
          onClick={(event) => {
            event.preventDefault();
            activate(handleNext);
          }}
          onKeyDown={(event) => handleKeyActivate(event, () => activate(handleNext))}
          aria-label="Next team member"
          className="flex h-12 w-12 cursor-pointer items-center justify-center rounded-full border border-[var(--border-color)] bg-[var(--surface-strong)] shadow-md transition-colors hover:bg-[var(--surface-elevated)]"
        >
          <ChevronRight className="pointer-events-none h-6 w-6 text-[var(--text-primary)]" />
          <span className="sr-only">Next</span>
        </button>
      </div>
    </div>
  );
}
