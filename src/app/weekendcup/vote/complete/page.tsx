import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, MessageCircle, Vote } from 'lucide-react';
import FooterSection from '@/components/footer';
import { WeekendCupHeader } from '@/components/WeekendCupHeader';
import { withQuery } from '@/lib/navigation';
import {
  WEEKEND_CUP_PUBLIC_PATH,
  WEEKEND_CUP_REGISTRATION_PATH,
  WEEKEND_CUP_SUPPORT_URL,
  WEEKEND_CUP_TITLE,
} from '@/lib/weekend-cup';

export const metadata: Metadata = {
  title: `Vote Submitted | ${WEEKEND_CUP_TITLE}`,
  description: 'Your Weekend Cup vote was saved.',
};

export default async function WeekendCupVoteCompletePage({
  searchParams,
}: {
  searchParams: Promise<{ game?: string; ballot?: string }>;
}) {
  const params = await searchParams;
  const game = params.game?.trim() || 'Your pick';

  return (
    <div className="weekend-cup-shell app-prototype-shell page-base min-h-screen bg-[linear-gradient(180deg,#07111e_0%,#050b13_100%)]">
      <WeekendCupHeader />
      <main className="page-container flex min-h-[62vh] max-w-2xl items-center justify-center py-10">
        <section className="w-full rounded-[var(--radius-panel)] border border-white/10 bg-[rgba(10,18,32,0.72)] p-6 sm:p-8">
          <div className="mx-auto grid size-12 place-items-center rounded-full bg-[rgba(50,224,196,0.14)] text-[var(--accent-secondary-text)]">
            <Vote size={22} />
          </div>
          <p className="mt-5 text-center text-xs font-black uppercase tracking-[0.16em] text-[var(--text-soft)]">
            Vote locked in
          </p>
          <h1 className="mt-2 text-center text-3xl font-black text-[var(--text-primary)]">
            {game} is saved on this account.
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-center text-sm leading-6 text-[var(--text-secondary)]">
            Clean choice. Your Season 2 Weekend Cup game vote is counted, and if voting is still
            open you can add or remove picks later. Tournament registration is separate, so lock
            your player slot when you are ready.
          </p>

          <div className="mt-6 grid gap-3 rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--surface-soft)] p-4 text-sm text-[var(--text-secondary)]">
            <p>1. This vote is tied to your signed-in Mechi account.</p>
            <p>2. You can back more than one Season 2 Weekend Cup game before voting closes.</p>
            <p>3. Voting helps shape the lineup. Registration is still how you enter the cup.</p>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link href={`${WEEKEND_CUP_PUBLIC_PATH}#vote`} className="btn-outline !rounded-[var(--radius-control)]">
              Back to vote
            </Link>
            <Link
              href={withQuery(WEEKEND_CUP_REGISTRATION_PATH, { game: null })}
              className="btn-primary !rounded-[var(--radius-control)]"
            >
              <ArrowRight size={14} />
              Register now
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
