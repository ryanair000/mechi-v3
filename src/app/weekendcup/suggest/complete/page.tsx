import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, MessageCircle, Sparkles } from 'lucide-react';
import FooterSection from '@/components/footer';
import { WeekendCupHeader } from '@/components/WeekendCupHeader';
import {
  WEEKEND_CUP_PUBLIC_PATH,
  WEEKEND_CUP_REGISTRATION_PATH,
  WEEKEND_CUP_SUPPORT_URL,
  WEEKEND_CUP_TITLE,
} from '@/lib/weekend-cup';

export const metadata: Metadata = {
  title: `Suggestion Received | ${WEEKEND_CUP_TITLE}`,
  description: 'Your Weekend Cup mystery-game suggestion was received.',
};

export default async function WeekendCupSuggestCompletePage({
  searchParams,
}: {
  searchParams: Promise<{ game?: string }>;
}) {
  const params = await searchParams;
  const game = params.game?.trim() || 'your game suggestion';

  return (
    <div className="weekend-cup-shell app-prototype-shell page-base min-h-screen bg-[linear-gradient(180deg,#07111e_0%,#050b13_100%)]">
      <WeekendCupHeader />
      <main className="page-container flex min-h-[62vh] max-w-2xl items-center justify-center py-10">
        <section className="w-full rounded-[var(--radius-panel)] border border-white/10 bg-[rgba(10,18,32,0.72)] p-6 sm:p-8">
          <div className="mx-auto grid size-12 place-items-center rounded-full bg-[rgba(50,224,196,0.14)] text-[var(--accent-secondary-text)]">
            <Sparkles size={22} />
          </div>
          <p className="mt-5 text-center text-xs font-black uppercase tracking-[0.16em] text-[var(--text-soft)]">
            Suggestion received
          </p>
          <h1 className="mt-2 text-center text-3xl font-black text-[var(--text-primary)]">
            {game} is now in the review lane.
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-center text-sm leading-6 text-[var(--text-secondary)]">
            We saved your mystery-game idea. If it fits the active vote and passes the current
            filters, it can appear as a live option for players to back.
          </p>

          <div className="mt-6 grid gap-3 rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--surface-soft)] p-4 text-sm text-[var(--text-secondary)]">
            <p>1. Your suggestion has been captured on this account.</p>
            <p>2. The active mystery-slot vote still allows only one final pick per player.</p>
            <p>3. Weekend Cup registration remains separate from the community vote.</p>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link href={`${WEEKEND_CUP_PUBLIC_PATH}#vote`} className="btn-outline !rounded-[var(--radius-control)]">
              Back to vote
            </Link>
            <Link href={WEEKEND_CUP_REGISTRATION_PATH} className="btn-primary !rounded-[var(--radius-control)]">
              <ArrowRight size={14} />
              Open registration
            </Link>
            <a href={WEEKEND_CUP_SUPPORT_URL} className="btn-ghost !rounded-[var(--radius-control)]">
              <MessageCircle size={14} />
              Need help
            </a>
          </div>
        </section>
      </main>
      <FooterSection className="!pt-4 md:!pt-8" />
    </div>
  );
}
