import type { Metadata } from 'next';
import Link from 'next/link';
import { MessageCircle, RotateCcw } from 'lucide-react';
import FooterSection from '@/components/footer';
import { WeekendCupHeader } from '@/components/WeekendCupHeader';
import { withQuery } from '@/lib/navigation';
import {
  WEEKEND_CUP_REGISTRATION_PATH,
  WEEKEND_CUP_SUPPORT_URL,
  WEEKEND_CUP_TITLE,
} from '@/lib/weekend-cup';

export const metadata: Metadata = {
  title: `Payment Failed | ${WEEKEND_CUP_TITLE}`,
  description: 'Retry your Weekend Cup payment or contact PlayMechi support.',
};

export default async function WeekendCupPaymentFailedPage({
  searchParams,
}: {
  searchParams: Promise<{ reference?: string; reason?: string; game?: string }>;
}) {
  const params = await searchParams;
  const retryHref = withQuery(WEEKEND_CUP_REGISTRATION_PATH, {
    game: params.game ?? null,
  });
  const reason = params.reason?.trim() || 'Payment was not confirmed.';

  return (
    <div className="weekend-cup-shell app-prototype-shell page-base min-h-screen bg-[linear-gradient(180deg,#07111e_0%,#050b13_100%)]">
      <WeekendCupHeader />
      <main className="page-container flex min-h-[62vh] max-w-xl items-center justify-center py-10">
        <section className="w-full rounded-[var(--radius-panel)] border border-white/10 bg-[rgba(10,18,32,0.72)] p-6 text-center sm:p-8">
          <div className="mx-auto grid size-11 place-items-center rounded-full bg-red-500/12 text-red-300">
            <RotateCcw size={22} />
          </div>
          <p className="mt-5 text-xs font-black uppercase tracking-[0.16em] text-[var(--text-soft)]">
            Payment failed
          </p>
          <h1 className="mt-2 text-3xl font-black text-[var(--text-primary)]">
            Try again
          </h1>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-[var(--text-secondary)]">
            {reason} Your slot is not booked until payment clears.
          </p>
          {params.reference ? (
            <p className="mt-3 break-all text-xs text-[var(--text-soft)]">
              Ref: {params.reference}
            </p>
          ) : null}
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link href={retryHref} className="btn-primary !rounded-[var(--radius-control)]">
              Try again
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
