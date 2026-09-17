import Image from 'next/image';

export default function Loading() {
  return (
    <div className="page-base flex min-h-screen items-center justify-center px-4">
      <div className="card flex min-w-[240px] max-w-md flex-col items-center gap-3 px-6 py-6 text-center">
        <span className="inline-flex items-center gap-3" aria-label="Mechi">
          <span className="relative block h-10 w-10 shrink-0 overflow-hidden rounded-2xl">
            <Image src="/mechi-logo.png" alt="" fill sizes="40px" className="object-contain" />
          </span>
          <span className="text-base font-extrabold leading-none text-[var(--text-primary)]">Mechi</span>
        </span>
        <p className="text-sm font-black uppercase tracking-[0.16em] text-[var(--text-primary)]">
          Opening Mechi
        </p>
        <p className="text-sm leading-6 text-[var(--text-secondary)]">
          Loading the next screen so you are not left waiting on a blank page.
        </p>
      </div>
    </div>
  );
}
