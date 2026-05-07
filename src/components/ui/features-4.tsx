import type { ComponentType } from 'react';
import { Cpu, Fingerprint, Pencil, Settings2, Sparkles, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

type RuleFeature = {
  title: string;
  body: string;
  icon: ComponentType<{ className?: string }>;
};

const COMMON_RULES: RuleFeature[] = [
  {
    title: 'Be on time',
    body: 'All games start at 8:00 PM EAT. Join your room, lobby, or fixture early so admins can lock the match cleanly.',
    icon: Zap,
  },
  {
    title: 'Use your registered tag',
    body: 'Play with the same in-game username or gamer tag submitted during registration. Random account switches can get removed.',
    icon: Fingerprint,
  },
  {
    title: 'Fair play only',
    body: 'No cheating, hacking, teaming, scripts, emulator abuse, result manipulation, or unfair tools in any game.',
    icon: Cpu,
  },
  {
    title: 'Submit clean proof',
    body: 'Screenshots and admin records verify results. Send clear proof when admins ask, especially after eFootball matches.',
    icon: Pencil,
  },
  {
    title: 'Respect the lobby',
    body: 'No insults, threats, harassment, or toxic chat. Follow admin instructions so the tournament keeps moving.',
    icon: Sparkles,
  },
  {
    title: 'Admin call is final',
    body: 'Report disputes immediately with proof. After review, the organizer/admin decision closes the issue.',
    icon: Settings2,
  },
];

export function Features({ className }: { className?: string }) {
  return (
    <section
      id="rules"
      className={cn('landing-section scroll-mt-24 border-t border-[var(--border-color)] py-12 md:py-20', className)}
    >
      <div className="mx-auto max-w-5xl space-y-8 md:space-y-14">
        <div className="relative z-10 mx-auto max-w-2xl space-y-4 text-center">
          <p className="section-title">Rules</p>
          <h2 className="text-balance text-3xl font-black leading-tight text-[var(--text-primary)] sm:text-4xl lg:text-5xl">
            Common rules for every game.
          </h2>
          <p className="text-sm leading-7 text-[var(--text-secondary)] sm:text-base">
            These apply to PUBG Mobile, Call of Duty Mobile, and eFootball. Keep it fair, keep it
            clean, and make admin verification easy.
          </p>
        </div>

        <div className="relative mx-auto grid max-w-2xl overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[rgba(10,18,31,0.72)] shadow-2xl shadow-black/20 ring-1 ring-white/10 backdrop-blur-md sm:grid-cols-2 lg:max-w-4xl lg:grid-cols-3">
          {COMMON_RULES.map((rule) => {
            const Icon = rule.icon;

            return (
              <div
                key={rule.title}
                className="min-h-48 space-y-3 border-b border-r border-[var(--border-color)] p-6 last:border-b-0 sm:p-8 lg:p-10"
              >
                <div className="flex items-center gap-2">
                  <span className="flex size-8 items-center justify-center rounded-full bg-[rgba(50,224,196,0.12)] text-[var(--accent-secondary-text)]">
                    <Icon className="size-4" />
                  </span>
                  <h3 className="text-sm font-black text-[var(--text-primary)]">{rule.title}</h3>
                </div>
                <p className="text-sm leading-6 text-[var(--text-secondary)]">{rule.body}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
