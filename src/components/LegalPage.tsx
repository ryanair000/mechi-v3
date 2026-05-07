import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft, Mail } from 'lucide-react';
import FooterSection from '@/components/footer';

type LegalSection = {
  title: string;
  paragraphs: string[];
  bullets?: string[];
};

type LegalPageProps = {
  title: string;
  description: string;
  effectiveDate: string;
  contactEmail: string;
  sections: LegalSection[];
  secondaryLink: {
    href: string;
    label: string;
  };
  children?: ReactNode;
};

export function LegalPage({
  title,
  description,
  effectiveDate,
  contactEmail,
  sections,
  secondaryLink,
  children,
}: LegalPageProps) {
  return (
    <div className="page-base">
      <main className="landing-shell pb-16 pt-6 sm:pb-20 sm:pt-10">
        <Link
          href="/"
          className="brand-link inline-flex min-h-11 items-center gap-2 text-sm font-semibold"
        >
          <ArrowLeft size={16} />
          Back to Mechi
        </Link>

        <section className="card mt-5 overflow-hidden p-5 sm:p-8">
          <div className="brand-kicker w-fit">Mechi legal</div>
          <h1 className="mt-5 max-w-3xl text-[2rem] font-black leading-[1.04] text-[var(--text-primary)] sm:text-[3rem]">
            {title}
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--text-secondary)] sm:text-base">
            {description}
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <span className="brand-chip">Effective {effectiveDate}</span>
            <a
              href={`mailto:${contactEmail}`}
              className="btn-ghost min-h-11 gap-2 px-4 py-2 text-sm"
            >
              <Mail size={14} />
              {contactEmail}
            </a>
          </div>
        </section>

        {children ? <div className="mt-6">{children}</div> : null}

        <div className="mt-6 grid gap-4">
          {sections.map((section) => (
            <section key={section.title} className="card p-5 sm:p-6">
              <h2 className="text-xl font-black text-[var(--text-primary)]">{section.title}</h2>
              <div className="mt-3 space-y-3">
                {section.paragraphs.map((paragraph) => (
                  <p
                    key={paragraph}
                    className="text-sm leading-7 text-[var(--text-secondary)] sm:text-base"
                  >
                    {paragraph}
                  </p>
                ))}
              </div>

              {section.bullets?.length ? (
                <ul className="mt-4 space-y-2 text-sm leading-7 text-[var(--text-secondary)] sm:text-base">
                  {section.bullets.map((bullet) => (
                    <li key={bullet} className="flex gap-3">
                      <span className="mt-2 h-2 w-2 rounded-full bg-[var(--brand-teal)]" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}
        </div>

        <section className="card mt-6 p-5 sm:p-6">
          <p className="section-title">Need the other policy?</p>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-2xl text-sm leading-7 text-[var(--text-secondary)] sm:text-base">
              We keep our public legal pages straightforward, readable, and easy to navigate so
              players can find them quickly.
            </p>
            <Link href={secondaryLink.href} className="btn-outline justify-center">
              {secondaryLink.label}
            </Link>
          </div>
        </section>
      </main>
      <FooterSection />
    </div>
  );
}
