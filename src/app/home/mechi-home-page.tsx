'use client';

import FooterSection from '@/components/footer';
import { useRegionalSettings } from '@/components/RegionalSettingsProvider';
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

export function MechiHomePageShell() {
  const { locale } = useRegionalSettings();
  const isSwahili = locale === 'sw-TZ';
  const homeFaqs: FaqItem[] = isSwahili
    ? [
        {
          question: 'Ninajisajilije kwa Weekend Cup?',
          answer:
            'Fungua sehemu ya usajili ya Weekend Cup, ingia, chagua mchezo wako, weka taarifa sahihi utakazotumia siku ya mechi, halafu kamilisha malipo kuthibitisha nafasi yako.',
        },
        {
          question: 'Ni michezo gani imefungwa kwa Season 1?',
          answer:
            'Season 1 ina PUBG Mobile Ijumaa, CODM Jumamosi, na eFootball Jumapili. Nafasi ya nne ya mystery game inaamuliwa kwa kura za players kabla ya lineup ya mwisho kufungwa.',
        },
        {
          question: 'Kiingilio cha Weekend Cup kwa sasa ni kiasi gani?',
          answer: `${WEEKEND_CUP_ENTRY_PRICING.entryFromLabel} ndiyo rate ya sasa, na malipo ndiyo yanayothibitisha nafasi. ${WEEKEND_CUP_ENTRY_PRICING.earlyBirdLimitLabel} wakati tier ya sasa bado iko wazi.`,
        },
        {
          question: 'Kura ya mystery game inafanyaje kazi?',
          answer:
            'Unaweza kupigia kura mystery game moja tu. PUBG Mobile, CODM, na eFootball tayari zimefungwa, na kama mchezo wako haupo unaweza kuupendekeza moja kwa moja kwenye sehemu ya kura ya Weekend Cup.',
        },
        {
          question: 'Matokeo na taarifa za siku ya mechi hutokea wapi?',
          answer: `${WEEKEND_CUP_EVENT_DATES} updates, matangazo ya stream, na maelekezo ya bracket au room hutumwa kwenye hub ya Mechi na channel rasmi za PlayMechi. ${WEEKEND_CUP_PRIZE_POOL_LABEL} na muda wa kila mchezo hutangazwa huko kabla ya kila mechi kuanza.`,
        },
      ]
    : [
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

  return (
    <div className="page-base marketing-prototype-shell mechi-home-shell flex min-h-screen flex-col">
      <PlayMechiHomeHeader />
      <div className="flex-1">
        <HeroSection />
        <LogoCloud3Section />
        <AnimatedSlideshowSection />
        <Faq5
          badge={isSwahili ? 'Maswali ya Weekend Cup' : 'Weekend Cup FAQ'}
          heading={
            isSwahili
              ? `Majibu ya haraka kabla ya ${WEEKEND_CUP_TITLE}.`
              : `Quick answers before ${WEEKEND_CUP_TITLE}.`
          }
          description={
            isSwahili
              ? 'Usajili, malipo ya kiingilio, kura ya mystery slot, na sehemu ya kufuatilia kila kinachoendelea kwenye Mechi.club.'
              : 'Registration, entry payment, mystery-slot voting, and where to follow the action on Mechi.club.'
          }
          faqs={homeFaqs}
        />
      </div>
      <FooterSection className="!pt-8 md:!pt-16" />
    </div>
  );
}
