import { BrandLogo } from '@/components/BrandLogo';

export default function Loading() {
  return (
    <div className="page-base flex min-h-screen items-center justify-center px-4">
      <div className="card flex min-w-[240px] max-w-md flex-col items-center gap-3 px-6 py-6 text-center">
        <BrandLogo size="md" />
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
