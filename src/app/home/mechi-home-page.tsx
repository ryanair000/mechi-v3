'use client';

import FooterSection from '@/components/footer';
import { useRegionalSettings } from '@/components/RegionalSettingsProvider';
import { AnimatedSlideshowSection } from '@/components/ui/animated-slideshow';
import { type FaqItem, Faq5 } from '@/components/ui/faq-5';
import HeroSection from '@/components/ui/hero-section';
import { LogoCloud3Section } from '@/components/ui/logo-cloud-3';
import { PlayMechiHomeHeader } from '@/app/home/playmechi-home-header';

export function MechiHomePageShell() {
  const { locale } = useRegionalSettings();
  const isSwahili = locale === 'sw-TZ';
  const homeFaqs: FaqItem[] = isSwahili
    ? [
        {
          question: 'Mechi.club ni nini?',
          answer:
            'Mechi.club ni home ya PlayMechi tournaments na updates. Kwa sasa, hatua kuu ni kuchagua event iliyo live, kusajili slot yako, na kufuatilia match details.',
        },
        {
          question: 'Naanzaje kucheza au kushiriki?',
          answer:
            'Fungua Weekend Cup au tournament nyingine iliyo live, chagua game, weka details sahihi, kisha kamilisha payment kama event inahitaji entry fee.',
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
            'Event page na Android app ndizo sehemu kuu za timing, rules, check-in, na match updates. Channels rasmi za PlayMechi zinabeba matangazo na reminders.',
        },
      ]
    : [
        {
          question: 'What is Mechi.club?',
          answer:
            'Mechi.club is the public home for PlayMechi tournaments and event updates. Right now, the main move is simple: pick the live event, register your slot, and follow match details.',
        },
        {
          question: 'How do I start playing or entering events?',
          answer:
            'Open Weekend Cup or another live tournament, choose your game, enter accurate player details, then complete payment if the event has an entry fee.',
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
            'Use the event page and Android app for timing, rules, check-in, and match updates. Official PlayMechi channels carry announcements and reminders.',
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
          badge={isSwahili ? 'Maswali ya Mechi.club' : 'Mechi.club FAQ'}
          heading={
            isSwahili
              ? 'Majibu ya haraka kabla ya kuingia tournament.'
              : 'Quick answers before you enter a tournament.'
          }
          description={
            isSwahili
              ? 'Tournaments, payments, rewards, Android app, na updates rasmi za PlayMechi.'
              : 'Tournaments, payments, rewards, the Android app, and official PlayMechi updates.'
          }
          faqs={homeFaqs}
        />
      </div>
      <FooterSection className="!pt-8 md:!pt-16" />
    </div>
  );
}
