import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Compass, MessageCircle } from 'lucide-react';

export default async function SuggestionCompletePage({
  searchParams,
}: {
  searchParams: Promise<{ game?: string }>;
}) {
  const params = await searchParams;
  const game = params.game?.trim() || 'your suggestion';

  return (
    <div className="page-container max-w-2xl space-y-5">
      <section className="card p-6 sm:p-8">
        <div className="mx-auto grid size-12 place-items-center rounded-full bg-[rgba(50,224,196,0.14)] text-[var(--accent-secondary-text)]">
          <CheckCircle2 size={22} />
        </div>
        <p className="section-title mt-5 text-center">Suggestion received</p>
        <h1 className="mt-3 text-center text-3xl font-black text-[var(--text-primary)] sm:text-4xl">
          {game} is now on the Mechi suggestion board.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-center text-sm leading-7 text-[var(--text-secondary)] sm:text-base">
          Your suggestion was saved successfully. Community voting and moderator review decide what
          rises next, so you can now head back, share it, or keep exploring Mechi.
        </p>

        <div className="mt-6 grid gap-3 rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--surface-soft)] p-4 text-sm text-[var(--text-secondary)]">
          <p>1. The suggestion is saved and visible in the current queue.</p>
          <p>2. Community votes help push the strongest requests higher.</p>
          <p>3. If anything looked wrong during submit, open support with the route and screenshot.</p>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link href="/suggest" className="btn-outline justify-center">
            <ArrowLeft size={14} />
            Back to suggestions
          </Link>
          <Link href="/dashboard" className="btn-primary justify-center">
            <Compass size={14} />
            Go to dashboard
          </Link>
          <Link href="/support" className="btn-ghost justify-center">
            <MessageCircle size={14} />
            Need help
          </Link>
        </div>
      </section>
    </div>
  );
}
