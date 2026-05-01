import { Badge } from '@/components/ui/badge';
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
      'Both games use a kill-race format across three Battle Royale matches. Every kill is one point, placement does not add points, and admins verify the final totals.',
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
  badge = 'FAQ',
  heading = 'Quick answers before match day.',
  description = 'Everything players usually ask before joining the Mechi.club Online Gaming Tournament.',
  faqs = defaultFaqs,
  className,
}: Faq5Props) => {
  return (
    <section
      id="faq"
      className={cn(
        'landing-section scroll-mt-24 border-t border-[var(--border-color)] pb-8 pt-16 md:pb-12 md:pt-24',
        className
      )}
    >
      <div className="mx-auto max-w-5xl">
        <div className="text-center">
          <Badge className="border-[rgba(50,224,196,0.28)] bg-[rgba(50,224,196,0.12)] text-xs font-black uppercase tracking-[0.14em] text-[var(--accent-secondary-text)] hover:bg-[rgba(50,224,196,0.16)]">
            {badge}
          </Badge>
          <h2 className="mt-4 text-3xl font-black leading-tight text-[var(--text-primary)] sm:text-4xl lg:text-5xl">
            {heading}
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-sm font-medium leading-7 text-[var(--text-secondary)] sm:text-base">
            {description}
          </p>
        </div>

        <div className="mx-auto mt-12 max-w-screen-sm">
          {faqs.map((faq, index) => (
            <div key={faq.question} className="mb-8 flex gap-4 border-t border-[var(--border-color)] pt-6">
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
