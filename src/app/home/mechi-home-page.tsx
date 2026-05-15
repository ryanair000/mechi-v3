import FooterSection from '@/components/footer';
import { AnimatedSlideshowSection } from '@/components/ui/animated-slideshow';
import { type FaqItem, Faq5 } from '@/components/ui/faq-5';
import HeroSection from '@/components/ui/hero-section';
import { LogoCloud3Section } from '@/components/ui/logo-cloud-3';
import { PlayMechiHomeHeader } from '@/app/home/playmechi-home-header';
import {
  WEEKEND_CUP_ENTRY_PRICING,
  WEEKEND_CUP_EVENT_DATES,
  WEEKEND_CUP_PRIZE_POOL_LABEL,
  WEEKEND_CUP_TITLE,
} from '@/lib/weekend-cup';

const HOME_FAQS: FaqItem[] = [
  {
    question: 'How do I register for Weekend Cup?',
    answer:
      'Open the Weekend Cup registration flow, sign in, choose your game, enter the exact player details you will use on match day, then complete payment to confirm the slot.',
  },
  {
    question: 'Which games are locked for Season 1?',
    answer:
      'Season 1 runs across PUBG Mobile on Friday, CODM on Saturday, and eFootball on Sunday. The fourth mystery slot is decided by the player vote before the final lineup closes.',
  },
  {
    question: 'How much is Weekend Cup entry right now?',
    answer: `${WEEKEND_CUP_ENTRY_PRICING.entryFromLabel} is live now, and payment is what confirms the slot. ${WEEKEND_CUP_ENTRY_PRICING.earlyBirdLimitLabel} while the current tier is still open.`,
  },
  {
    question: 'How does the mystery game vote work?',
    answer:
      'You can vote for one mystery game only. PUBG Mobile, CODM, and eFootball are already fixed, and if your title is missing you can suggest it directly from the Weekend Cup vote section.',
  },
  {
    question: 'Where do results and match-day updates happen?',
    answer:
      `${WEEKEND_CUP_EVENT_DATES} updates, stream notices, and bracket or room instructions land on the Mechi hub and official PlayMechi channels. ${WEEKEND_CUP_PRIZE_POOL_LABEL} and game-specific timing are posted there before each match window.`,
  },
];

export function MechiHomePageShell() {
  return (
    <div className="page-base marketing-prototype-shell flex min-h-screen flex-col">
      <PlayMechiHomeHeader />
      <div className="flex-1">
        <HeroSection />
        <LogoCloud3Section />
        <AnimatedSlideshowSection />
        <Faq5
          badge="Weekend Cup FAQ"
          heading={`Quick answers before ${WEEKEND_CUP_TITLE}.`}
          description="Registration, entry payment, mystery-slot voting, and where to follow the action on Mechi.club."
          faqs={HOME_FAQS}
        />
      </div>
      <FooterSection className="!pt-8 md:!pt-16" />
    </div>
  );
}
