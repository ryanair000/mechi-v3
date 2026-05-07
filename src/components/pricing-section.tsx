import type { ReactNode } from 'react';
import Link from 'next/link';
import { CircleCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type PricingTone = 'free' | 'pro' | 'elite';

export interface PricingSectionPlan {
  id: string;
  title: string;
  price: string;
  description?: string;
  features: string[];
  cta: string;
  href?: string;
  onSelect?: () => void;
  featured?: boolean;
  tone?: PricingTone;
  badge?: ReactNode;
  helperText?: string;
  footnote?: string;
  current?: boolean;
  disabled?: boolean;
}

interface PricingSectionProps {
  title?: string;
  description?: string;
  plans: PricingSectionPlan[];
}

function getCardToneClasses(tone: PricingTone) {
  switch (tone) {
    case 'pro':
      return 'circuit-panel border-[rgba(255,107,107,0.24)]';
    case 'elite':
      return 'circuit-panel border-[rgba(246,196,83,0.32)]';
    default:
      return '';
  }
}

function getActionClasses(tone: PricingTone) {
  const base =
    'inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold uppercase tracking-[0.14em] transition-[background-color,border-color,color,box-shadow] disabled:cursor-not-allowed disabled:opacity-45';

  switch (tone) {
    case 'pro':
      return `${base} bg-[var(--accent-primary)] text-[var(--brand-night)] shadow-[0_12px_28px_rgba(255,107,107,0.24)] hover:bg-[var(--accent-primary-hover)]`;
    case 'elite':
      return `${base} bg-[#f6c453] text-[var(--brand-night)] shadow-[0_12px_28px_rgba(246,196,83,0.22)] hover:bg-[#f3cf68]`;
    default:
      return `${base} border border-[var(--border-color)] bg-[var(--surface-strong)] text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)] hover:text-[var(--text-primary)]`;
  }
}

function getSpotlightBadge(plan: PricingSectionPlan) {
  if (plan.featured) {
    return (
      <Badge
        variant="secondary"
        className="border-[rgba(255,107,107,0.22)] bg-[var(--accent-primary-soft)] text-[#c95252]"
      >
        Most popular
      </Badge>
    );
  }

  if (plan.tone === 'elite') {
    return (
      <Badge
        variant="secondary"
        className="border-[rgba(246,196,83,0.24)] bg-[rgba(246,196,83,0.14)] text-[#b88919]"
      >
        All access
      </Badge>
    );
  }

  return null;
}

function PricingAction({ plan }: { plan: PricingSectionPlan }) {
  const tone = plan.tone ?? 'free';
  const className = getActionClasses(tone);

  if (plan.href && !plan.disabled) {
    return (
      <Link href={plan.href} className={className}>
        {plan.cta}
      </Link>
    );
  }

  return (
    <button type="button" className={className} onClick={plan.onSelect} disabled={plan.disabled}>
      {plan.cta}
    </button>
  );
}

export default function PricingSection({
  title = 'Choose the plan that matches your climb',
  description = 'Start free, upgrade when you need more ranked volume, tournament control, and premium perks.',
  plans,
}: PricingSectionProps) {
  return (
    <section className="landing-section border-none px-0 pb-0 pt-8 sm:pt-10">
      <div className="mx-auto max-w-2xl text-center">
        <Badge
          variant="secondary"
          className="border-[rgba(50,224,196,0.22)] bg-[var(--accent-secondary-soft)] text-[var(--accent-secondary-text)]"
        >
          Pricing
        </Badge>
        <h2 className="mt-4 text-2xl font-black leading-tight text-[var(--text-primary)] sm:text-3xl">
          {title}
        </h2>
        <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)] sm:text-base">
          {description}
        </p>
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        {plans.map((plan) => (
          <article
            key={plan.id}
            className={cn(
              'card flex h-full flex-col p-5 sm:p-6',
              getCardToneClasses(plan.tone ?? 'free')
            )}
            aria-label={`${plan.title} plan`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-lg font-black text-[var(--text-primary)]">{plan.title}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {plan.badge}
                  {getSpotlightBadge(plan)}
                </div>
              </div>

              {plan.current ? (
                <Badge
                  variant="outline"
                  className="border-[var(--border-color)] bg-[var(--surface-elevated)] text-[var(--text-soft)]"
                >
                  Current
                </Badge>
              ) : null}
            </div>

            <div className="mt-6">
              <p className="text-4xl font-black tracking-normal text-[var(--text-primary)]">
                {plan.price}
              </p>
              {plan.description ? (
                <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
                  {plan.description}
                </p>
              ) : null}
              {plan.helperText ? (
                <p className="mt-3 text-sm text-[var(--text-soft)]">{plan.helperText}</p>
              ) : null}
              {plan.footnote ? (
                <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--brand-coral)]">
                  {plan.footnote}
                </p>
              ) : null}
            </div>

            <ul className="mt-6 space-y-3">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                  <CircleCheck
                    size={14}
                    className="mt-0.5 shrink-0 text-[var(--brand-teal)]"
                    aria-hidden
                  />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <div className="mt-7">
              <PricingAction plan={plan} />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
