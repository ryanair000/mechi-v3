import type { Metadata } from 'next';
import { WeekendCupClient } from '@/app/weekendcup/weekend-cup-client';
import {
  WEEKEND_CUP_CASH_PRIZE_POOL,
  WEEKEND_CUP_EVENT_DATES,
  WEEKEND_CUP_GAMES,
  WEEKEND_CUP_PUBLIC_PATH,
  WEEKEND_CUP_REGISTRATION_PATH,
  WEEKEND_CUP_TITLE,
} from '@/lib/weekend-cup';
import { APP_URL } from '@/lib/urls';

export const metadata: Metadata = {
  title: `${WEEKEND_CUP_TITLE} | Mechi.club`,
  description:
    `Vote for Season 2 Weekend Cup games and register for ${WEEKEND_CUP_TITLE}, running ${WEEKEND_CUP_EVENT_DATES}.`,
  alternates: {
    canonical: WEEKEND_CUP_PUBLIC_PATH,
  },
};

function toJsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

export default function WeekendCupPage() {
  const eventJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: WEEKEND_CUP_TITLE,
    description:
      'PlayMechi Weekend Cup Season 1 featuring PUBG Mobile, CODM, eFootball, and Free Fire.',
    startDate: '2026-05-29T20:00:00+03:00',
    endDate: '2026-05-31T22:30:00+03:00',
    eventAttendanceMode: 'https://schema.org/OnlineEventAttendanceMode',
    eventStatus: 'https://schema.org/EventScheduled',
    location: {
      '@type': 'VirtualLocation',
      url: `${APP_URL}${WEEKEND_CUP_PUBLIC_PATH}`,
    },
    image: [`${APP_URL}/images/weekendcup/season-1-promo.png`],
    organizer: {
      '@type': 'Organization',
      name: 'PlayMechi',
      url: APP_URL,
    },
    offers: WEEKEND_CUP_GAMES.map((game) => ({
      '@type': 'Offer',
      name: `${game.label} entry`,
      url: `${APP_URL}${WEEKEND_CUP_REGISTRATION_PATH}?game=${game.game}`,
      priceCurrency: 'KES',
      price: game.game === 'efootball' ? 100 : 50,
      availability: 'https://schema.org/InStock',
      validFrom: '2026-05-13T00:00:00+03:00',
    })),
    maximumAttendeeCapacity: WEEKEND_CUP_GAMES.reduce((total, game) => total + game.slots, 0),
    prizes: `Up to KSh ${WEEKEND_CUP_CASH_PRIZE_POOL.toLocaleString('en-KE')}`,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: toJsonLd(eventJsonLd) }}
      />
      <WeekendCupClient />
    </>
  );
}
