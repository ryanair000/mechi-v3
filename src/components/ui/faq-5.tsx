'use client';

import { Badge } from '@/components/ui/badge';
import { useRegionalSettings } from '@/components/RegionalSettingsProvider';
import { cn } from '@/lib/utils';

export interface FaqItem {
  question: string;
  answer: string;
}

export interface Faq5Props {
  badge?: string;
  heading?: string;
  description?: string;
  faqs?: FaqItem[];
  className?: string;
}

const defaultFaqs: FaqItem[] = [
  {
    question: 'Is registration free?',
    answer:
      'Yes. Registration is free on Mechi.club. Pick your game, submit your correct gamer tag, and make sure you are available at 8:00 PM on match day.',
  },
  {
    question: 'Which games are in the tournament?',
    answer:
      'The tournament has PUBG Mobile, Call of Duty Mobile, and eFootball. PUBG plays Friday 8 May, CODM plays Saturday 9 May, and eFootball plays Sunday 10 May.',
  },
  {
    question: 'How do I qualify for rewards?',
    answer:
      'Register with accurate details, use the same in-game account, follow the rules, and complete the PlayMechi follow and YouTube subscription requirement before your match day.',
  },
  {
    question: 'How are PUBG Mobile and CODM winners decided?',
    answer:
      'PUBG Mobile uses kill-race scoring across three Battle Royale matches. CODM also runs three Battle Royale matches, but uses kill and placement points based on the published tournament desk rules.',
  },
  {
    question: 'How does eFootball work?',
    answer:
      'eFootball is a 16-player 1v1 knockout bracket. Win and you move forward. If there is a dispute, send a clear screenshot immediately so admins can review it.',
  },
  {
    question: 'Where can I watch the matches?',
    answer:
      'The tournament streams live on YouTube through PlayMechi. PUBG Mobile and CODM use a short stream delay to keep the games fair.',
  },
];

export const Faq5 = ({
  badge,
  heading,
  description,
  faqs,
  className,
}: Faq5Props) => {
  const { locale } = useRegionalSettings();
  const isSwahili = locale === 'sw-TZ';
  const resolvedBadge = badge ?? (isSwahili ? 'Maswali' : 'FAQ');
  const resolvedHeading =
    heading ?? (isSwahili ? 'Majibu ya haraka kabla ya siku ya mechi.' : 'Quick answers before match day.');
  const resolvedDescription =
    description ??
    (isSwahili
      ? 'Haya ndiyo mambo ambayo players wengi huuliza kabla ya kujiunga na PlayMechi Launch.'
      : 'Everything players usually ask before joining PlayMechi Launch.');
  const resolvedFaqs =
    faqs ??
    (isSwahili
      ? [
          {
            question: 'Je, usajili ni bure?',
            answer:
              'Ndiyo. Usajili ni bure kwenye Mechi.club. Chagua mchezo wako, tuma gamer tag sahihi, na hakikisha unapatikana saa 2:00 usiku siku ya mechi.',
          },
          {
            question: 'Ni michezo gani ipo kwenye tournament?',
            answer:
              'Tournament ina PUBG Mobile, Call of Duty Mobile, na eFootball. PUBG inachezwa Ijumaa 8 May, CODM Jumamosi 9 May, na eFootball Jumapili 10 May.',
          },
          {
            question: 'Ninajuaje kustahili rewards?',
            answer:
              'Jisajili kwa taarifa sahihi, tumia akaunti ile ile ya mchezo, fuata sheria, na kamilisha sharti la kufollow PlayMechi na ku-subscribe YouTube kabla ya siku yako ya mechi.',
          },
          {
            question: 'Washindi wa PUBG Mobile na CODM wanaamuliwaje?',
            answer:
              'PUBG Mobile hutumia kill-race scoring kwenye mechi tatu za Battle Royale. CODM pia ina mechi tatu za Battle Royale, lakini hutumia pointi za kills na placement kulingana na sheria zilizochapishwa na desk ya tournament.',
          },
          {
            question: 'eFootball inafanyaje kazi?',
            answer:
              'eFootball ni bracket ya mtoano ya players 16 ya 1v1. Ukishinda unasonga mbele. Ikiwa kuna dispute, tuma screenshot safi mara moja ili admins wafanye review.',
          },
          {
            question: 'Naweza kutazama mechi wapi?',
            answer:
              'Tournament inastream live YouTube kupitia PlayMechi. PUBG Mobile na CODM hutumia stream delay fupi ili michezo ibaki fair.',
          },
        ]
      : defaultFaqs);

  return (
    <section
      id="faq"
      className={cn(
        'landing-section scroll-mt-24 border-t border-[var(--border-color)] py-16 md:py-24',
        className
      )}
    >
      <div className="landing-shell">
        <div className="text-center">
          <Badge className="border-[rgba(50,224,196,0.28)] bg-[rgba(50,224,196,0.12)] text-xs font-black uppercase tracking-[0.14em] text-[var(--accent-secondary-text)] hover:bg-[rgba(50,224,196,0.16)]">
            {resolvedBadge}
          </Badge>
          <h2 className="mt-4 text-3xl font-black leading-tight text-[var(--text-primary)] sm:text-4xl lg:text-5xl">
            {resolvedHeading}
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-sm font-medium leading-7 text-[var(--text-secondary)] sm:text-base">
            {resolvedDescription}
          </p>
        </div>

        <div className="mx-auto mt-12 max-w-screen-sm">
          {resolvedFaqs.map((faq, index) => (
            <div key={faq.question} className="mb-8 flex gap-4">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-[rgba(50,224,196,0.12)] font-mono text-xs font-black text-[var(--accent-secondary-text)]">
                {index + 1}
              </span>
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="font-black text-[var(--text-primary)]">{faq.question}</h3>
                </div>
                <p className="text-sm leading-6 text-[var(--text-secondary)]">{faq.answer}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
