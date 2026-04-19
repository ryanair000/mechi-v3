'use client';

import type { LucideIcon } from 'lucide-react';
import { ArrowRight, Gamepad2, ShieldCheck, Swords, Trophy } from 'lucide-react';
import { Warp } from '@paper-design/shaders-react';

type FeatureCard = {
  step: string;
  title: string;
  description: string;
  signal: string;
  icon: LucideIcon;
  shader: {
    proportion: number;
    softness: number;
    distortion: number;
    swirl: number;
    swirlIterations: number;
    shape: 'checks' | 'stripes' | 'edge';
    shapeScale: number;
    colors: [string, string, string, string];
  };
};

const FEATURE_CARDS: FeatureCard[] = [
  {
    step: '01',
    title: 'Build one clean setup',
    description:
      'Pick your games, lock in your platform IDs, and keep one profile ready for queues, direct calls, and brackets.',
    signal: 'Profile ready',
    icon: Gamepad2,
    shader: {
      proportion: 0.35,
      softness: 0.85,
      distortion: 0.14,
      swirl: 0.72,
      swirlIterations: 10,
      shape: 'checks',
      shapeScale: 0.09,
      colors: [
        'hsl(176 94% 17%)',
        'hsl(164 96% 42%)',
        'hsl(200 88% 24%)',
        'hsl(182 86% 67%)',
      ],
    },
  },
  {
    step: '02',
    title: 'Queue or call someone out',
    description:
      'Jump into ranked matchmaking for a fast lobby or challenge a player directly when you want the matchup on your terms.',
    signal: 'Queue live',
    icon: Swords,
    shader: {
      proportion: 0.42,
      softness: 1.08,
      distortion: 0.19,
      swirl: 0.88,
      swirlIterations: 12,
      shape: 'stripes',
      shapeScale: 0.12,
      colors: [
        'hsl(8 87% 28%)',
        'hsl(2 93% 60%)',
        'hsl(22 95% 42%)',
        'hsl(350 89% 72%)',
      ],
    },
  },
  {
    step: '03',
    title: 'Create smarter tournaments',
    description:
      'Host paid or free-entry brackets, keep players updated, and let the tournament flow stay visible instead of buried in chat.',
    signal: 'Bracket ready',
    icon: Trophy,
    shader: {
      proportion: 0.38,
      softness: 1.02,
      distortion: 0.17,
      swirl: 0.8,
      swirlIterations: 11,
      shape: 'checks',
      shapeScale: 0.1,
      colors: [
        'hsl(42 86% 24%)',
        'hsl(37 96% 54%)',
        'hsl(28 88% 34%)',
        'hsl(52 94% 72%)',
      ],
    },
  },
  {
    step: '04',
    title: 'Lock scores and keep moving',
    description:
      'Report scorelines, surface disputes clearly, and feed every completed match back into the same ladder and notification loop.',
    signal: 'Results locked',
    icon: ShieldCheck,
    shader: {
      proportion: 0.4,
      softness: 0.94,
      distortion: 0.16,
      swirl: 0.78,
      swirlIterations: 9,
      shape: 'edge',
      shapeScale: 0.11,
      colors: [
        'hsl(215 92% 22%)',
        'hsl(205 92% 52%)',
        'hsl(235 80% 30%)',
        'hsl(190 92% 70%)',
      ],
    },
  },
];

export default function FeatureShaderCards() {
  return (
    <section id="how-it-works" className="landing-section">
      <div className="landing-shell">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="section-title">How it works</p>
            <h2 className="mt-3 max-w-2xl text-3xl font-black text-[var(--text-primary)] sm:text-[2.2rem]">
              V3 keeps every competitive move in one cleaner loop.
            </h2>
          </div>
          <p className="max-w-xl text-sm leading-6 text-[var(--text-secondary)]">
            Set up once, play how you want, and stay informed at every step instead of chasing
            updates across chats.
          </p>
        </div>

        <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {FEATURE_CARDS.map((feature) => {
            const Icon = feature.icon;

            return (
              <article
                key={feature.step}
                className="group relative min-h-[23rem] overflow-hidden rounded-[1.6rem] border border-[var(--border-color)]"
              >
                <div className="absolute inset-0">
                  <Warp
                    style={{ height: '100%', width: '100%' }}
                    proportion={feature.shader.proportion}
                    softness={feature.shader.softness}
                    distortion={feature.shader.distortion}
                    swirl={feature.shader.swirl}
                    swirlIterations={feature.shader.swirlIterations}
                    shape={feature.shader.shape}
                    shapeScale={feature.shader.shapeScale}
                    scale={1}
                    rotation={0}
                    speed={0.78}
                    colors={feature.shader.colors}
                  />
                </div>

                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(4,10,20,0.15)_0%,rgba(4,10,20,0.58)_34%,rgba(4,10,20,0.9)_100%)]" />

                <div className="relative flex h-full flex-col p-5 sm:p-6">
                  <div className="flex items-start justify-between gap-3">
                    <span className="inline-flex rounded-full border border-white/18 bg-black/20 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/88 backdrop-blur-sm">
                      Step {feature.step}
                    </span>

                    <div className="rounded-2xl border border-white/14 bg-black/22 p-3 text-white shadow-[0_12px_30px_rgba(0,0,0,0.24)] backdrop-blur-sm transition-transform duration-300 group-hover:-translate-y-1">
                      <Icon size={24} strokeWidth={2.1} />
                    </div>
                  </div>

                  <div className="mt-auto">
                    <div className="inline-flex rounded-full border border-white/14 bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/82 backdrop-blur-sm">
                      {feature.signal}
                    </div>

                    <h3 className="mt-4 text-xl font-black leading-tight text-white">
                      {feature.title}
                    </h3>

                    <p className="mt-3 text-sm leading-6 text-white/82">
                      {feature.description}
                    </p>

                    <div className="mt-6 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-white/88">
                      <span>Clean flow</span>
                      <ArrowRight size={14} />
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
