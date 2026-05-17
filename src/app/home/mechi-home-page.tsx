'use client';

import FooterSection from '@/components/footer';
import { useRegionalSettings } from '@/components/RegionalSettingsProvider';
import { AnimatedSlideshowSection } from '@/components/ui/animated-slideshow';
import { type FaqItem, Faq5 } from '@/components/ui/faq-5';
import HeroSection from '@/components/ui/hero-section';
import { LogoCloud3Section } from '@/components/ui/logo-cloud-3';
import { PlayMechiHomeHeader } from '@/app/home/playmechi-home-header';

export function MechiHomePageShell() {
  const { country, locale } = useRegionalSettings();
  const isSwahili = locale === 'sw-TZ';
  const isUnitedStates = country === 'united_states';
  const homeFaqs: FaqItem[] = isUnitedStates
    ? [
        {
          question: 'What is Mechi USA?',
          answer:
            'Mechi USA is the American landing lane for PlayMechi: competitive gaming profiles, community lobbies, skill-first brackets, and prize-backed events as the US player base opens up.',
        },
        {
          question: 'Which games fit the USA version?',
          answer:
            'The first USA page keeps the current Mechi core: PUBG Mobile, CODM, eFootball, FC, fighting games, and community-voted mystery slots. It is built so US-focused games can be promoted without changing the app foundation.',
        },
        {
          question: 'Can US players join Weekend Cup?',
          answer:
            'US players can create a Mechi account and follow the Weekend Cup flow, but event timing, payment availability, and prize eligibility should be checked on the event page before entering.',
        },
        {
          question: 'How should players get updates?',
          answer:
            'Follow PlayMechi on Instagram, YouTube, X, Discord, and Twitch for the cleanest public updates while the USA community lane is being built out.',
        },
      ]
    : isSwahili
    ? [
        {
          question: 'Mechi.club ni nini?',
          answer:
            'Mechi.club ni hub ya gaming inayounganisha profiles, tournaments, rewards, na community updates sehemu moja. Unatengeneza account, unaingia kwenye events, na unaendelea kufuatilia kinachoendelea bila kupotea.',
        },
        {
          question: 'Naanzaje kucheza au kushiriki?',
          answer:
            'Sign in kwenye Mechi.club, kamilisha profile yako, kisha chagua tournament, challenge, au activity iliyo live. Fuata details za event na tumia taarifa zilezile utakazotumia siku ya match.',
        },
        {
          question: 'Mechi.club ina games gani?',
          answer:
            'Mechi.club ina support ya competitive titles kama PUBG Mobile, CODM, eFootball, FC, fighting games, na community picks. Lineup hubadilika kulingana na events, votes, na demand ya players.',
        },
        {
          question: 'Payments na rewards zinafanya kazi vipi?',
          answer:
            'Kama activity ina entry payment, malipo ndiyo yanayoconfirm slot yako. Rewards, prize pools, na eligibility huwekwa kwenye page ya event kabla ujiunge, so unaingia ukiwa na details zote.',
        },
        {
          question: 'Ninapata wapi updates?',
          answer:
            'Updates za tournaments, match rooms, results, content, na community drops hutokea kwenye Mechi.club hub na channels rasmi za PlayMechi. Event pages ndizo source bora kwa timing, rules, na next steps.',
        },
      ]
    : [
        {
          question: 'What is Mechi.club?',
          answer:
            'Mechi.club is the gaming hub for player profiles, tournaments, rewards, and community updates. Create your account, jump into active events, and keep your gaming life in one clean place.',
        },
        {
          question: 'How do I start playing or entering events?',
          answer:
            'Sign in on Mechi.club, complete your profile, then choose any live tournament, challenge, or community activity. Use the exact player details you will use on match day so your slot stays valid.',
        },
        {
          question: 'Which games does Mechi.club support?',
          answer:
            'Mechi.club is built around competitive titles like PUBG Mobile, CODM, eFootball, FC, fighting games, and community-picked mystery slots. The lineup can shift as new events, votes, and player demand come in.',
        },
        {
          question: 'How do payments and rewards work?',
          answer:
            'When an activity has an entry fee, payment confirms your slot. Rewards, prize pools, and eligibility rules are shown on the event page before you join, so you know what is on the table.',
        },
        {
          question: 'Where do I follow updates?',
          answer:
            'Tournament updates, room details, results, content drops, and community announcements live on the Mechi.club hub and official PlayMechi channels. Event pages stay the main source for timing, rules, and next steps.',
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
          badge={isSwahili ? 'Maswali ya Mechi.club' : isUnitedStates ? 'USA FAQ' : 'Mechi.club FAQ'}
          heading={
            isUnitedStates
              ? 'What changes for players in the United States.'
              : isSwahili
              ? 'Majibu ya haraka kuhusu Mechi.club.'
              : 'Quick answers for getting started on Mechi.club.'
          }
          description={
            isUnitedStates
              ? 'A dedicated USA entry point for Mechi, keeping the current tournament engine while making the promise clear for American players.'
              : isSwahili
              ? 'Profiles, tournaments, payments, rewards, na sehemu ya kufuatilia kila kinachoendelea kwenye Mechi.club.'
              : 'Profiles, tournaments, payments, rewards, and where to follow the action across Mechi.club.'
          }
          faqs={homeFaqs}
        />
      </div>
      <FooterSection className="!pt-8 md:!pt-16" />
    </div>
  );
}
