'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, Loader2, MessageCircle } from 'lucide-react';
import { useAuthFetch } from '@/components/AuthProvider';
import FooterSection from '@/components/footer';
import { WeekendCupHeader } from '@/components/WeekendCupHeader';
import { withQuery } from '@/lib/navigation';
import {
  WEEKEND_CUP_DASHBOARD_PATH,
  WEEKEND_CUP_SUPPORT_URL,
  type WeekendCupRegistrationSummary,
} from '@/lib/weekend-cup';

const API_PATH = '/api/events/playmechi-weekend-cup/register';

const PAGE_STYLE: CSSProperties & Record<string, string> = {
  '--font-display': 'var(--font-montserrat), "Montserrat", "Segoe UI Semibold", sans-serif',
  '--font-body': 'var(--font-open-sans), "Open Sans", "Segoe UI", sans-serif',
  '--font-sans': 'var(--font-open-sans), "Open Sans", "Segoe UI", sans-serif',
};

type VerifyState = 'checking' | 'paid' | 'failed';

export function WeekendCupPaymentCompleteClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const authFetch = useAuthFetch();
  const reference = searchParams.get('reference') ?? '';
  const [state, setState] = useState<VerifyState>(reference ? 'checking' : 'failed');
  const [game, setGame] = useState<string | null>(null);
  const [message, setMessage] = useState(
    reference ? 'Confirming your payment with Paystack.' : 'Missing payment reference.'
  );

  useEffect(() => {
    if (!reference) {
      return;
    }

    const verify = async () => {
      try {
        const res = await authFetch(API_PATH, {
          method: 'POST',
          body: JSON.stringify({
            action: 'verify_payment',
            reference,
          }),
        });
        const data = (await res.json()) as WeekendCupRegistrationSummary & { error?: string };

        if (!res.ok) {
          const failedHref = withQuery('/weekendcup/payment/failed', {
            reference,
            reason: data.error ?? 'Payment could not be confirmed.',
          });
          router.replace(failedHref);
          return;
        }

        const paidRegistration = data.registrations.find(
          (registration) => registration.payment_reference === reference
        );
        setGame(paidRegistration?.game ?? null);
        setState('paid');
        setMessage('Payment confirmed. Your Weekend Cup slot is booked.');
      } catch {
        const failedHref = withQuery('/weekendcup/payment/failed', {
          reference,
          reason: 'Could not confirm payment. Try again.',
        });
        router.replace(failedHref);
      }
    };

    void verify();
  }, [authFetch, reference, router]);

  const dashboardHref = useMemo(
    () => withQuery(WEEKEND_CUP_DASHBOARD_PATH, { game }),
    [game]
  );

  return (
    <div
      className="weekend-cup-shell app-prototype-shell page-base min-h-screen bg-[linear-gradient(180deg,#07111e_0%,#050b13_100%)]"
      style={PAGE_STYLE}
    >
      <WeekendCupHeader />
      <main className="page-container flex min-h-[62vh] max-w-xl items-center justify-center py-10">
        <section className="w-full rounded-[var(--radius-panel)] border border-white/10 bg-[rgba(10,18,32,0.72)] p-6 text-center sm:p-8">
          {state === 'checking' ? (
            <Loader2 className="mx-auto size-9 animate-spin text-[var(--accent-secondary-text)]" />
          ) : (
            <CheckCircle2 className="mx-auto size-10 text-[var(--accent-secondary-text)]" />
          )}
          <p className="mt-5 text-xs font-black uppercase tracking-[0.16em] text-[var(--text-soft)]">
            Payment complete
          </p>
          <h1 className="mt-2 text-3xl font-black text-[var(--text-primary)]">
            {state === 'checking' ? 'Checking payment' : 'Slot booked'}
          </h1>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-[var(--text-secondary)]">
            {message}
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link href={dashboardHref} className="btn-primary !rounded-[var(--radius-control)]">
              View status
            </Link>
            <a href={WEEKEND_CUP_SUPPORT_URL} className="btn-outline !rounded-[var(--radius-control)]">
              <MessageCircle size={14} />
              Need help?
            </a>
          </div>
        </section>
      </main>
      <FooterSection className="!pt-4 md:!pt-8" />
    </div>
  );
}
