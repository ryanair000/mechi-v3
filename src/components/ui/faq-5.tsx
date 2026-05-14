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
    question: 'What is a FAQ and why is it important?',
    answer:
      'FAQ stands for Frequently Asked Questions. It is a list that provides answers to common questions people may have about a specific product, service, or topic.',
  },
  {
    question: 'Why should I use a FAQ on my website or app?',
    answer:
      'Utilizing a FAQ section on your website or app is a practical way to offer instant assistance to your users or customers. Instead of waiting for customer support responses, they can find quick answers to commonly asked questions.',
  },
  {
    question: 'How do I effectively create a FAQ section?',
    answer:
      'Creating a FAQ section starts with gathering the most frequent questions you receive from your users or customers. Once you have a list, you need to write clear, detailed, and helpful answers to each question.',
  },
  {
    question: 'What are the benefits of having a well-maintained FAQ section?',
    answer:
      'There are numerous advantages to maintaining a robust FAQ section. Firstly, it provides immediate answers to common queries, which improves the user experience.',
  },
];

export const Faq5 = ({
  badge = 'FAQ',
  heading = 'Common Questions & Answers',
  description = 'Find out all the essential details about our platform and how it can serve your needs.',
  faqs = defaultFaqs,
  className,
}: Faq5Props) => {
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
