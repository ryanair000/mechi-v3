import type { Metadata } from 'next';
import { DemoOne } from '@/components/ui/demo';

export const metadata: Metadata = {
  title: 'PlayMechi Dock Test | PlayMechi',
  robots: {
    index: false,
    follow: false,
  },
};

export default function DockManualTestPage() {
  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-12 text-[var(--text-primary)]">
      <section className="mx-auto flex min-h-[70vh] max-w-3xl flex-col items-center justify-center gap-8">
        <div className="max-w-md text-center">
          <p className="section-title">PlayMechi navigation</p>
          <h1 className="mt-3 text-3xl font-black tracking-normal">Dock QA</h1>
          <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
            Manual preview for the Home, Arena, Feed, Community, and Profile dock.
          </p>
        </div>
        <DemoOne />
      </section>
    </main>
  );
}
