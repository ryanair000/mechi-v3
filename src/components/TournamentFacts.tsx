import type { ReactNode } from 'react';

export type TournamentFact = {
  label: string;
  value: ReactNode;
};

export function TournamentFacts({
  title = 'Tournament facts',
  facts,
  className = '',
}: {
  title?: string;
  facts: TournamentFact[];
  className?: string;
}) {
  return (
    <section className={className}>
      <p className="section-title">{title}</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {facts.map((fact) => (
          <div
            key={fact.label}
            className="rounded-lg border border-[var(--border-color)] bg-[var(--surface-soft)] p-4"
          >
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--text-soft)]">
              {fact.label}
            </p>
            <div className="mt-2 text-sm font-semibold leading-6 text-[var(--text-primary)]">
              {fact.value}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
