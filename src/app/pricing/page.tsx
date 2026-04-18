'use client';

import Link from 'next/link';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { ArrowRight, Check, Crown, Sparkles } from 'lucide-react';
import { BrandLogo } from '@/components/BrandLogo';
import { PlanBadge } from '@/components/PlanBadge';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useAuth, useAuthFetch } from '@/components/AuthProvider';
import { type BillingCycle, type Plan, PLANS } from '@/lib/plans';

const VISIBLE_PLAN_ORDER: Array<'free' | 'pro' | 'elite'> = ['free', 'pro', 'elite'];

const COMPARISON_ROWS = [
  { label: 'Matches per day', free: '5', pro: 'Unlimited', elite: 'Unlimited' },
  { label: 'Games selectable', free: '1', pro: '3', elite: '3' },
  { label: 'Direct 1-on-1 challenges', free: 'Yes', pro: 'Yes', elite: 'Yes' },
  { label: 'Free-entry tournament hosting', free: 'No', pro: 'Yes', elite: 'Yes' },
  { label: 'Tournament platform fee', free: '5%', pro: '5%', elite: '0%' },
  { label: 'Match history', free: '10', pro: '100', elite: 'Unlimited' },
  { label: 'Early access', free: 'No', pro: 'No', elite: 'Yes' },
  { label: 'Streaming features', free: 'No', pro: 'No', elite: 'Yes' },
];

function getPlanActionLabel(currentPlan: Plan, targetPlan: Plan) {
  if (targetPlan === 'free') {
    return currentPlan === 'free' ? 'Current plan' : 'Included by default';
  }

  if (currentPlan === targetPlan) {
    return 'Current plan';
  }

  if (currentPlan === 'elite' && targetPlan === 'pro') {
    return 'Included in Elite';
  }

  return targetPlan === 'elite' ? 'Go Elite' : 'Go Pro';
}

function PricingPageContent() {
  const { user, refresh } = useAuth();
  const authFetch = useAuthFetch();
  const searchParams = useSearchParams();
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [loadingPlan, setLoadingPlan] = useState<Exclude<Plan, 'free'> | null>(null);
  const [currentPlan, setCurrentPlan] = useState<Plan>((user?.plan as Plan | undefined) ?? 'free');
  const [planExpiry, setPlanExpiry] = useState<string | null>(user?.plan_expires_at ?? null);

  useEffect(() => {
    setCurrentPlan((user?.plan as Plan | undefined) ?? 'free');
    setPlanExpiry(user?.plan_expires_at ?? null);
  }, [user?.plan, user?.plan_expires_at]);

  useEffect(() => {
    const checkout = searchParams.get('checkout');
    if (checkout === 'success') {
      void refresh();
      toast.success('Your plan is active now.');
    } else if (checkout === 'failed') {
      toast.error('Payment was not confirmed. Try again.');
    }
  }, [refresh, searchParams]);

  const annualSavings = useMemo(
    () => ({
      pro: PLANS.pro.monthlyKes * 12 - PLANS.pro.annualKes,
      elite: PLANS.elite.monthlyKes * 12 - PLANS.elite.annualKes,
    }),
    []
  );

  const handleUpgrade = async (plan: Exclude<Plan, 'free'>) => {
    if (!user) {
      window.location.href = '/register';
      return;
    }

    if (currentPlan === plan || (currentPlan === 'elite' && plan === 'pro')) {
      return;
    }

    setLoadingPlan(plan);
    try {
      const res = await authFetch('/api/subscriptions', {
        method: 'POST',
        body: JSON.stringify({ plan, cycle: billingCycle }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? 'Could not start checkout');
        return;
      }

      if (data.activated) {
        await refresh();
        toast.success(`${PLANS[plan].name} is active now.`);
        return;
      }

      if (data.authorization_url) {
        window.location.href = data.authorization_url as string;
        return;
      }

      toast.error('Checkout did not start correctly.');
    } catch {
      toast.error('Network error.');
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="page-base">
      <header className="sticky top-2 z-50 sm:top-4">
        <div className="landing-shell">
          <div className="nav-panel rounded-[1.2rem] border p-2">
            <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
              <Link href="/" className="rounded-lg px-1 py-1" aria-label="Back to home">
                <BrandLogo size="sm" variant="symbol" />
              </Link>

              <div className="hidden items-center justify-center gap-2 md:flex">
                <Link href="/" className="rounded-lg px-3 py-2 text-sm font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                  Home
                </Link>
                <Link href="/pricing" className="rounded-lg bg-[var(--surface-elevated)] px-3 py-2 text-sm font-semibold uppercase tracking-[0.14em] text-[var(--text-primary)]">
                  Pricing
                </Link>
              </div>

              <div className="flex items-center justify-end gap-2">
                <ThemeToggle />
                {user ? (
                  <Link href="/dashboard" className="btn-primary text-sm uppercase tracking-[0.14em]">
                    Dashboard
                  </Link>
                ) : (
                  <>
                    <Link href="/login" className="btn-outline hidden text-sm uppercase tracking-[0.14em] sm:inline-flex">
                      Sign in
                    </Link>
                    <Link href="/register" className="btn-primary text-sm uppercase tracking-[0.14em]">
                      Join free
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="landing-shell pb-16 pt-5 sm:pb-20 sm:pt-12">
        <section className="relative overflow-hidden rounded-[1.25rem] border border-[var(--border-color)] bg-[var(--surface)] px-4 py-6 shadow-[var(--shadow-soft)] sm:rounded-[1.8rem] sm:px-8 sm:py-10 sm:shadow-[var(--shadow-strong)]">
          <div className="pointer-events-none absolute inset-0 hidden bg-[radial-gradient(circle_at_16%_12%,rgba(50,224,196,0.12),transparent_30%),radial-gradient(circle_at_88%_24%,rgba(255,107,107,0.12),transparent_28%)] sm:block" />
          <div className="relative">
            <div className="brand-kicker">
              <Sparkles size={12} />
              Pricing that grows with your grind
            </div>

            <div className="mt-5 grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
              <div>
                <h1 className="max-w-3xl text-[2rem] font-black leading-[1.05] tracking-normal text-[var(--text-primary)] sm:text-[3.3rem] sm:leading-[1]">
                  Start free. Upgrade only when your Mechi climb needs more.
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--text-secondary)] sm:text-base">
                  New players start with a 1-month Pro trial. After that, keep it free, move to Pro at KES 299 for unlimited ranked runs and direct challenges, or go Elite at KES 999 for zero tournament fees, early access, and streaming perks.
                </p>
              </div>

              <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-1.5">
                <div className="flex items-center gap-1">
                  {(['monthly', 'annual'] as BillingCycle[]).map((cycle) => (
                    <button
                      key={cycle}
                      type="button"
                      onClick={() => setBillingCycle(cycle)}
                      className={`min-h-11 rounded-xl px-4 py-2 text-base font-semibold transition-all sm:text-sm ${
                        billingCycle === cycle
                          ? 'bg-[var(--brand-coral)] text-[var(--brand-night)]'
                          : 'text-[var(--text-secondary)]'
                      }`}
                    >
                      {cycle === 'monthly' ? 'Monthly' : 'Annual'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {user ? (
              <div className="mt-5 inline-flex flex-wrap items-center gap-2 rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] px-4 py-3 text-sm text-[var(--text-secondary)]">
                <span>Current plan:</span>
                <span className="font-black text-[var(--text-primary)]">{PLANS[currentPlan].name}</span>
                <PlanBadge plan={currentPlan} size="md" />
                {planExpiry && currentPlan !== 'free' ? (
                  <span className="text-[var(--text-soft)]">
                    active until {new Date(planExpiry).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>
        </section>

        <section className="landing-section border-none px-0 pb-0 pt-8 sm:pt-10">
          <div className="grid gap-4 lg:grid-cols-3">
            {VISIBLE_PLAN_ORDER.map((planKey) => {
              const plan = PLANS[planKey];
              const isCurrent = currentPlan === planKey;
              const isDowngradeFromElite = currentPlan === 'elite' && planKey === 'pro';
              const actionDisabled =
                planKey === 'free' || isCurrent || isDowngradeFromElite || loadingPlan !== null;
              const price = billingCycle === 'annual' ? plan.annualKes : plan.monthlyKes;
              const savings =
                planKey === 'pro' || planKey === 'elite' ? annualSavings[planKey] : 0;

              return (
                <div
                  key={planKey}
                  className={`card flex h-full flex-col p-5 sm:p-6 ${
                    planKey === 'pro'
                      ? 'circuit-panel border-[rgba(255,107,107,0.24)]'
                      : planKey === 'elite'
                        ? 'circuit-panel border-[rgba(246,196,83,0.32)]'
                      : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-black text-[var(--text-primary)]">{plan.name}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <PlanBadge plan={planKey} size="md" />
                        {planKey === 'pro' ? (
                          <span className="brand-chip-coral px-2.5 py-1">Most popular</span>
                        ) : planKey === 'elite' ? (
                          <span className="rounded-full border border-[rgba(246,196,83,0.32)] bg-[rgba(246,196,83,0.14)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#b88919]">
                            All access
                          </span>
                        ) : null}
                      </div>
                    </div>
                    {isCurrent ? (
                      <span className="rounded-full bg-[var(--surface-elevated)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">
                        Current
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-6">
                    <p className="text-4xl font-black tracking-normal text-[var(--text-primary)]">
                      {planKey === 'free' ? 'Free' : `KSH ${price}`}
                    </p>
                    <p className="mt-2 text-sm text-[var(--text-soft)]">
                      {planKey === 'free'
                        ? 'No payment needed'
                        : billingCycle === 'annual'
                          ? `Billed yearly, save KSH ${savings}`
                          : 'Billed monthly via Paystack'}
                    </p>
                    {planKey === 'pro' ? (
                      <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--brand-coral)]">
                        1-month trial on new signups
                      </p>
                    ) : null}
                  </div>

                  <div className="mt-6 space-y-3">
                    {plan.features.map((feature) => (
                      <div key={feature} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                        <Check size={14} className="mt-0.5 text-[var(--brand-teal)]" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-7">
                    {planKey === 'free' ? (
                      <Link href={user ? '/dashboard' : '/register'} className="btn-outline w-full justify-center">
                        {getPlanActionLabel(currentPlan, planKey)}
                      </Link>
                    ) : user ? (
                      <button
                        type="button"
                        onClick={() => void handleUpgrade(planKey)}
                        disabled={actionDisabled}
                        className="btn-primary w-full justify-center disabled:opacity-45"
                      >
                        {loadingPlan === planKey ? 'Starting checkout...' : getPlanActionLabel(currentPlan, planKey)}
                        {loadingPlan !== planKey ? <ArrowRight size={14} /> : null}
                      </button>
                    ) : (
                      <Link href="/register" className="btn-primary w-full justify-center">
                        {getPlanActionLabel(currentPlan, planKey)}
                        <ArrowRight size={14} />
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="landing-section">
          <div className="card overflow-hidden p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <Crown size={16} className="text-[var(--brand-coral)]" />
              <h2 className="text-xl font-black text-[var(--text-primary)]">Plan breakdown</h2>
            </div>

            <div className="mt-5 grid gap-3 sm:hidden">
              {COMPARISON_ROWS.map((row) => (
                <div
                  key={row.label}
                  className="rounded-xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-3"
                >
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{row.label}</p>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <div className="rounded-lg bg-[var(--surface)] px-3 py-2">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--text-soft)]">
                        Free
                      </p>
                      <p className="mt-1 font-semibold text-[var(--text-primary)]">{row.free}</p>
                    </div>
                    <div className="rounded-lg bg-[var(--accent-primary-soft)] px-3 py-2">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#ff8a8a]">
                        Pro
                      </p>
                      <p className="mt-1 font-semibold text-[var(--text-primary)]">{row.pro}</p>
                    </div>
                    <div className="rounded-lg border border-[rgba(246,196,83,0.2)] bg-[rgba(246,196,83,0.12)] px-3 py-2">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#b88919]">
                        Elite
                      </p>
                      <p className="mt-1 font-semibold text-[var(--text-primary)]">{row.elite}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 hidden overflow-x-auto sm:block">
              <table className="w-full min-w-[38rem] text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--border-color)] text-[var(--text-soft)]">
                    <th className="pb-3 pr-4 font-semibold">Feature</th>
                    <th className="pb-3 px-4 font-semibold">Free</th>
                    <th className="pb-3 px-4 font-semibold text-[var(--brand-coral)]">Pro</th>
                    <th className="pb-3 px-4 font-semibold text-[#b88919]">Elite</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON_ROWS.map((row) => (
                    <tr key={row.label} className="border-b border-[var(--border-color)] last:border-b-0">
                      <td className="py-3 pr-4 text-[var(--text-secondary)]">{row.label}</td>
                      <td className="py-3 px-4 text-[var(--text-primary)]">{row.free}</td>
                      <td className="py-3 px-4 text-[var(--text-primary)]">{row.pro}</td>
                      <td className="py-3 px-4 text-[var(--text-primary)]">{row.elite}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="landing-section">
          <div className="grid gap-4 lg:grid-cols-3">
            {[
              {
                q: 'How does payment work?',
                a: 'Mechi starts checkout with Paystack, then activates your plan right after payment is verified.',
              },
              {
                q: 'Can I cancel any time?',
                a: 'Yes. Cancelling stops renewal, but your plan stays active until the current billing period ends.',
              },
              {
                q: 'What does Elite unlock?',
                a: 'Elite keeps everything in Pro, then adds zero tournament fee, early access to updates, a gold badge, and streaming-feature access.',
              },
            ].map((item) => (
              <div key={item.q} className="card p-5">
                <p className="text-base font-black text-[var(--text-primary)]">{item.q}</p>
                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{item.a}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

export default function PricingPage() {
  return (
    <Suspense fallback={<div className="page-base min-h-screen" />}>
      <PricingPageContent />
    </Suspense>
  );
}
