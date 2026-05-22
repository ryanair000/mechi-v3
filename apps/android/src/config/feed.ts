import { TOURNAMENT_REGISTER_URL } from './tournament';

export type FeedMetric = {
  icon: 'calendar-outline' | 'trophy-outline' | 'people-outline' | 'radio-outline' | 'phone-portrait-outline';
  label: string;
  value: string;
};

export type FeedAction = {
  label: string;
  kind: 'internal' | 'external';
  href: string;
};

export type FeedPost = {
  id: string;
  author: string;
  channel: string;
  publishedAt: string;
  title: string;
  body: string;
  imageUrl: string;
  tags: string[];
  pinned?: boolean;
  metrics: FeedMetric[];
  primaryAction?: FeedAction;
  secondaryAction?: FeedAction;
};

export const PLAYMECHI_FEED_POSTS: FeedPost[] = [
  {
    id: 'weekend-cup-season-1',
    author: 'PlayMechi Desk',
    channel: 'Launch week',
    publishedAt: 'Pinned for this week',
    title: 'Weekend Cup Season 1 is open.',
    body:
      'Register early, vote the mystery slot, and keep your squad ready for the next PlayMechi weekend. This feed is built for official drops first, without story rings, timers, or extra noise.',
    imageUrl: 'https://mechi.club/images/weekendcup/season-1-promo.png',
    tags: ['Official', 'Weekend Cup', 'Season 1'],
    pinned: true,
    metrics: [
      { icon: 'calendar-outline', label: 'Dates', value: '29-31 May 2026' },
      { icon: 'trophy-outline', label: 'Prize pool', value: 'KSh 6,000' },
      { icon: 'people-outline', label: 'Format', value: 'PUBGM, CODM, eFootball' },
    ],
    primaryAction: {
      label: 'Open registration',
      kind: 'external',
      href: TOURNAMENT_REGISTER_URL,
    },
    secondaryAction: {
      label: 'Tournament desk',
      kind: 'internal',
      href: '/(tabs)/arena',
    },
  },
  {
    id: 'stream-lane',
    author: 'PlayMechi Live',
    channel: 'Broadcast',
    publishedAt: 'Tonight at 8PM EAT',
    title: 'Stream drops should be one tap away.',
    body:
      'Instagram, TikTok, and YouTube carry the show. Mechi keeps the bracket, lobby flow, and tournament desk clear so the stream never outruns the actual match state.',
    imageUrl: 'https://mechi.club/dashboard-promos/playmechi-upcoming-stream.jpg',
    tags: ['Live', 'Broadcast', 'PlayMechi'],
    metrics: [
      { icon: 'radio-outline', label: 'Channels', value: 'IG, TikTok, YouTube' },
      { icon: 'calendar-outline', label: 'Window', value: '8:00 PM EAT' },
      { icon: 'people-outline', label: 'Use case', value: 'Desk + stream sync' },
    ],
    primaryAction: {
      label: 'Open tournament desk',
      kind: 'internal',
      href: '/(tabs)/arena',
    },
    secondaryAction: {
      label: 'Open Instagram',
      kind: 'external',
      href: 'https://www.instagram.com/playmechi/',
    },
  },
  {
    id: 'android-lane',
    author: 'PlayMechi Mobile',
    channel: 'Android lane',
    publishedAt: 'Build log',
    title: 'Android feedback is shaping the next release.',
    body:
      'This phone feed is tuned for bold media, short copy, and clean next actions. When PlayMechi posts an update, the player should know what to do in one glance.',
    imageUrl: 'https://mechi.club/dashboard-promos/playmechi-launch-mobile-gaming.jpg',
    tags: ['Android', 'Beta', 'UX'],
    metrics: [
      { icon: 'phone-portrait-outline', label: 'Focus', value: 'Real Android devices' },
      { icon: 'people-outline', label: 'Goal', value: 'Faster player flows' },
      { icon: 'calendar-outline', label: 'Review loop', value: 'Continuous' },
    ],
    primaryAction: {
      label: 'Open community',
      kind: 'internal',
      href: '/(tabs)/index',
    },
    secondaryAction: {
      label: 'Android testers',
      kind: 'external',
      href: 'https://mechi.club/android-testers',
    },
  },
  {
    id: 'community-lane',
    author: 'PlayMechi Community',
    channel: 'Social lane',
    publishedAt: 'Always on',
    title: 'Keep the squad loud between match nights.',
    body:
      'The official feed carries the spark. Community carries the momentum. Jump from updates into the chat lane when you want reactions, reminders, and squad energy.',
    imageUrl: 'https://mechi.club/dashboard-promos/playmechi-socials-community.jpg',
    tags: ['Community', 'Growth', 'Share'],
    metrics: [
      { icon: 'people-outline', label: 'Audience', value: 'Squads and new players' },
      { icon: 'trophy-outline', label: 'Use case', value: 'Tournament promo' },
      { icon: 'radio-outline', label: 'Flow', value: 'Feed to community' },
    ],
    primaryAction: {
      label: 'Open community chat',
      kind: 'internal',
      href: '/(tabs)/index',
    },
    secondaryAction: {
      label: 'Open YouTube',
      kind: 'external',
      href: 'https://www.youtube.com/@playmechi',
    },
  },
];
